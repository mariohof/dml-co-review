import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_FILES, DEMO_IDS } from "./demo-data"
import { DEMO_XML_FILES } from "./demo-xml.generated"
import { currentVersionIndex } from "./queries"
import { checkCommon } from "@/lib/rules/check/entry-rules"
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

  it("enthält 4 Systeme mit den Issues 2.3, 4.2, 5.0 und 6.0 und den festgelegten Namen", () => {
    expect(demo.systems.map((s) => [s.name, s.modelic, s.s1000dIssue])).toEqual([
      ["PHUNGUN", "PHUNGUN", "2.3"],
      ["Geschütztes Transportfahrzeug", "GTFDEMO", "4.2"],
      ["Transporthubschrauber", "THSDEMO", "5.0"],
      // PROJ-22
      ["Fahrrad BIKE60", "S1000DBIKE", "6.0"],
    ])
  })

  it("enthält die Organisationen D0815, C1234 und B6865 (PROJ-22)", () => {
    expect(demo.organisations.map((o) => [o.code, o.name])).toEqual([
      ["D0815", "Musterbehörde Technische Dokumentation"],
      ["C1234", "Partner Systemtechnik GmbH"],
      ["B6865", "Aerospace, Security and Defence Industries Association of Europe"],
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

  it("vergibt die Berechtigungen laut Spec (Anna: PHUNGUN + Fahrzeug + BIKE60, Ben: Fahrzeug + Fluggerät)", () => {
    const editorsOf = (id: string) => demo.dmrls.find((d) => d.id === id)?.editorUserIds
    expect(editorsOf(DEMO_IDS.dmrlPhungun)).toEqual([DEMO_IDS.editorAnna])
    expect(editorsOf(DEMO_IDS.dmrlVehicle)).toEqual([DEMO_IDS.editorAnna, DEMO_IDS.editorBen])
    expect(editorsOf(DEMO_IDS.dmrlAircraft)).toEqual([DEMO_IDS.editorBen])
    expect(editorsOf(DEMO_IDS.dmrlBike)).toEqual([DEMO_IDS.editorAnna])
  })

  it("legt die DMRL BIKE60 mit Originator B6865, Typ c, Sicherheitseinstufung 01 und Status in Bearbeitung an (PROJ-22)", () => {
    const dmrl = demo.dmrls.find((d) => d.id === DEMO_IDS.dmrlBike)
    expect(dmrl).toMatchObject({
      systemId: DEMO_IDS.sysBike,
      originatorOrganisationId: DEMO_IDS.orgAsd,
      dmlType: "c",
      security: "01",
      status: "in_bearbeitung",
      firstSendVersionIndex: `00001-${new Date().getFullYear()}`,
    })
    expect(demo.systems.find((s) => s.id === DEMO_IDS.sysBike)?.description).toBe("Fiktives Demo-Fahrrad (S1000D Issue 6.0)")
  })

  describe("DMRL PHUNGUN", () => {
    const entries = entriesOf(DEMO_IDS.dmrlPhungun)

    it("hat Status gesendet und Versionsindex 00002-2026", () => {
      expect(demo.dmrls.find((d) => d.id === DEMO_IDS.dmrlPhungun)?.status).toBe("gesendet")
      expect(currentVersionIndex(demo, DEMO_IDS.dmrlPhungun)).toBe("00002-2026")
    })

    it("hat 32 Einträge (11 d, 21 n), alle gesendet, ergänzt um issno 001, Ausgabetyp passend zum Eintragstyp und Datum von SEND 00002", () => {
      expect(entries).toHaveLength(32)
      expect(entries.filter((e) => e.fields.dmentryType === "d")).toHaveLength(11)
      expect(entries.filter((e) => e.fields.dmentryType === "n")).toHaveLength(21)
      for (const entry of entries) {
        expect(entry.status).toBe("gesendet")
        // Refinement 2026-11-16: d → deleted, n → new (Typ-Regel beim Check-in, PROJ-10)
        const type = entry.fields.dmentryType === "d" ? "deleted" : "new"
        expect(entry.fields).toMatchObject({ issno: "001", type, day: "29", month: "09", year: "2026" })
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
    ["Fahrzeug", DEMO_IDS.dmrlVehicle, "GTFDEMO", 10, "de", "DE"],
    ["Fluggerät", DEMO_IDS.dmrlAircraft, "THSDEMO", 10, "de", "DE"],
    ["Fahrrad BIKE60", DEMO_IDS.dmrlBike, "S1000DBIKE", 12, "en", "US"],
  ])("DMRL %s", (_label, dmrlId, modelic, count, language, country) => {
    const entries = entriesOf(dmrlId)

    it(`hat ${count} Einträge mit Eintragstyp n im Status in Bearbeitung, kein Archiv, keinen Verlauf`, () => {
      expect(entries).toHaveLength(count)
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
        expect(entry.fields.language).toBe(language)
        expect(entry.fields.country).toBe(country)
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

    it("ergibt im Regelwerk (Check-in) keine Fehler", () => {
      const candidates = entries.map((e, index) => ({ line: index + 1, fields: e.fields }))
      expect(checkCommon(candidates, "checkin", modelic).filter((f) => f.severity === "fehler")).toEqual([])
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
