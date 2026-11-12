import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_FILES, DEMO_IDS } from "./demo-data"
import { DEMO_XML_FILES } from "./demo-xml.generated"
import { currentVersionIndex } from "./queries"
import { datasetSchema, SECURITY_PATTERN, type DmrlEntry } from "./schema"

const demo = buildDemoDataset()
const entriesOf = (dmrlId: string) => demo.entries.filter((entry) => entry.dmrlId === dmrlId)

const dmc = (entry: DmrlEntry) => {
  const f = entry.fields
  return `${f.modelic}-${f.sdc}-${f.chapnum}-${f.section}${f.subsect}-${f.subject}-${f.discode}${f.discodev}-${f.incode}${f.incodev}-${f.itemloc}`
}

describe("Demo-Datenbestand", () => {
  it("ist gültig laut Datenschema (inkl. Verknüpfungen und Grundregeln)", () => {
    const result = datasetSchema.safeParse(demo)
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true)
  })

  it("enthält 3 Systeme mit den Issues 2.3, 4.2 und 5.0 und den festgelegten Namen", () => {
    expect(demo.systems.map((s) => [s.name, s.modelic, s.s1000dIssue])).toEqual([
      ["PHUNGUN", "PHUNGUN", "2.3"],
      ["Geschütztes Transportfahrzeug", "GTFDEMO", "4.2"],
      ["Transporthubschrauber", "THSDEMO", "5.0"],
    ])
  })

  it("enthält die Organisationen D0815 und C1234 mit neutralen Namen", () => {
    expect(demo.organisations.map((o) => [o.code, o.name])).toEqual([
      ["D0815", "Musterbehörde Technische Dokumentation"],
      ["C1234", "Partner Systemtechnik GmbH"],
    ])
  })

  it("enthält das Systemkonto „Administrator\" und die Bearbeiter Anna Bearbeitung und Ben Bearbeiter", () => {
    const admin = demo.users.find((u) => u.isSystemAccount)
    expect(admin).toMatchObject({ name: "Administrator", role: "administrator", active: true })
    expect(demo.users.filter((u) => u.role === "bearbeiter").map((u) => u.name)).toEqual([
      "Anna Bearbeitung",
      "Ben Bearbeiter",
    ])
  })

  it("vergibt die Berechtigungen laut Spec (Anna: PHUNGUN + Fahrzeug, Ben: Fahrzeug + Fluggerät)", () => {
    const editorsOf = (id: string) => demo.dmrls.find((d) => d.id === id)?.editorUserIds
    expect(editorsOf(DEMO_IDS.dmrlPhungun)).toEqual([DEMO_IDS.editorAnna])
    expect(editorsOf(DEMO_IDS.dmrlVehicle)).toEqual([DEMO_IDS.editorAnna, DEMO_IDS.editorBen])
    expect(editorsOf(DEMO_IDS.dmrlAircraft)).toEqual([DEMO_IDS.editorBen])
  })

  describe("DMRL PHUNGUN", () => {
    const entries = entriesOf(DEMO_IDS.dmrlPhungun)

    it("hat Status gesendet und Versionsindex 00002-2026", () => {
      expect(demo.dmrls.find((d) => d.id === DEMO_IDS.dmrlPhungun)?.status).toBe("gesendet")
      expect(currentVersionIndex(demo, DEMO_IDS.dmrlPhungun)).toBe("00002-2026")
    })

    it("hat 32 Einträge (11 d, 21 n), alle gesendet, ergänzt um issno 001, type new und Datum von SEND 00002", () => {
      expect(entries).toHaveLength(32)
      expect(entries.filter((e) => e.fields.dmentryType === "d")).toHaveLength(11)
      expect(entries.filter((e) => e.fields.dmentryType === "n")).toHaveLength(21)
      for (const entry of entries) {
        expect(entry.status).toBe("gesendet")
        expect(entry.fields).toMatchObject({ issno: "001", type: "new", day: "29", month: "09", year: "2026" })
      }
    })

    it("hat 3 Archivstände in der Reihenfolge SEND 00001 → REPLY C1234 00001 → SEND 00002, byte-genau", () => {
      const archive = demo.archive.filter((a) => a.dmrlId === DEMO_IDS.dmrlPhungun)
      expect(archive.map((a) => [a.direction, a.dmlc.sendid, a.versionIndex])).toEqual([
        ["send", "D0815", "00001-2026"],
        ["reply", "C1234", "00001-2026"],
        ["send", "D0815", "00002-2026"],
      ])
      expect(archive.map((a) => a.content)).toEqual([
        DEMO_XML_FILES[DEMO_FILES.send1],
        DEMO_XML_FILES[DEMO_FILES.reply1],
        DEMO_XML_FILES[DEMO_FILES.send2],
      ])
      // CRLF-Zeilenenden der Originaldateien bleiben erhalten
      expect(archive[0].content).toContain("\r\n")
    })

    it("verknüpft REPLY mit SEND 00001 und zählt die Antworten", () => {
      const reply = demo.archive.find((a) => a.id === DEMO_IDS.archiveReply1)
      expect(reply?.sendArchiveId).toBe(DEMO_IDS.archiveSend1)
      expect(reply?.replyCounts).toEqual({ approved: 11, rework: 0 })
    })

    it("lässt jeden dmlref auf die unmittelbar vorherige DML verweisen (initialer SEND auf sich selbst)", () => {
      const [send1, reply1, send2] = demo.archive
      expect(send1.dmlref?.dmlc).toEqual(send1.dmlc)
      expect(reply1.dmlref?.dmlc).toEqual(send1.dmlc)
      expect(send2.dmlref?.dmlc).toEqual(reply1.dmlc)
    })

    it("hat einen Verlauf mit SEND, REPLY übernommen und SEND", () => {
      const history = demo.history.filter((h) => h.dmrlId === DEMO_IDS.dmrlPhungun)
      expect(history.map((h) => h.action)).toEqual(["send", "reply_uebernommen", "send"])
      expect(history.every((h) => h.userId === DEMO_IDS.editorAnna)).toBe(true)
    })
  })

  describe.each([
    ["Fahrzeug", DEMO_IDS.dmrlVehicle, "GTFDEMO"],
    ["Fluggerät", DEMO_IDS.dmrlAircraft, "THSDEMO"],
  ])("DMRL %s", (_label, dmrlId, modelic) => {
    const entries = entriesOf(dmrlId)

    it("hat 10 Einträge mit Eintragstyp n im Status in Bearbeitung, kein Archiv, keinen Verlauf", () => {
      expect(entries).toHaveLength(10)
      expect(entries.every((e) => e.fields.dmentryType === "n" && e.status === "in_bearbeitung")).toBe(true)
      expect(demo.archive.some((a) => a.dmrlId === dmrlId)).toBe(false)
      expect(demo.history.some((h) => h.dmrlId === dmrlId)).toBe(false)
    })

    it("erfüllt die Grundregeln des Regelwerks (MI, Pflichtfelder, eindeutige DMC, SNS→Tech Name, Infocode→Info Name)", () => {
      const required = [
        "modelic", "sdc", "chapnum", "section", "subsect", "subject", "discode", "discodev", "incode",
        "incodev", "itemloc", "techname", "infoname", "language", "country", "security", "rpc", "issno",
        "type", "day", "month", "year",
      ] as const
      for (const entry of entries) {
        expect(entry.fields.modelic).toBe(modelic)
        for (const field of required) expect(entry.fields[field], field).not.toBe("")
        expect(entry.fields.security).toMatch(SECURITY_PATTERN)
        expect(entry.fields.language).toBe("de")
        expect(entry.fields.country).toBe("DE")
      }
      expect(new Set(entries.map(dmc)).size).toBe(entries.length)

      const sns = new Map<string, string>()
      const infocodes = new Map<string, string>()
      for (const { fields: f } of entries) {
        const snsKey = [f.modelic, f.sdc, f.chapnum, f.section, f.subsect, f.subject, f.discode, f.discodev].join("|")
        expect(sns.get(snsKey) ?? f.techname, `SNS ${snsKey}`).toBe(f.techname)
        sns.set(snsKey, f.techname)
        const infoKey = f.incode + f.incodev
        expect(infocodes.get(infoKey) ?? f.infoname, `Infocode ${infoKey}`).toBe(f.infoname)
        infocodes.set(infoKey, f.infoname)
      }
    })
  })

  it("enthält keine Freigabestände und keine Sperren", () => {
    expect(demo.releases).toEqual([])
    expect(demo.dmrls.every((d) => d.lock === null && d.release === null)).toBe(true)
  })

  it("erzeugt bei jedem Aufruf denselben Bestand", () => {
    expect(buildDemoDataset()).toEqual(demo)
  })
})
