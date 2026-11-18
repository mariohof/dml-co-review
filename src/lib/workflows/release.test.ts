import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { readDml } from "@/lib/data/dml-reader"
import { writeDml } from "@/lib/data/dml-writer"
import { latestSend } from "@/lib/data/queries"
import { datasetSchema, type Dataset, type Dmrl, type EntrySnapshot, type User } from "@/lib/data/schema"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { validateWithXmllint } from "@/lib/xsd/server/xmllint"
import { executeCheckIn, checkCheckinFile } from "./check-in"
import { executeCheckOut } from "./check-out"
import { latestRelease, releaseCsv, releaseInfo, releaseLabel, releaseSnapshots, releaseXml } from "./release"
import { checkReplyFile, executeReplyImport } from "./reply"
import { executeSend, executeWithdrawSend, prepareSend } from "./send"

const ROOT = join(__dirname, "..", "..", "..")
const demoReply = readFileSync(join(ROOT, "public/demo-dateien/DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"), "utf8")
const allApproved = demoReply.replace(/answer="n"/g, 'answer="y"')
const hasXmllint = spawnSync("xmllint", ["--version"]).status === 0

const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string = DEMO_IDS.dmrlPhungun) => data.dmrls.find((d) => d.id === id) as Dmrl
const entriesOf = (data: Dataset, id: string = DEMO_IDS.dmrlPhungun) => data.entries.filter((e) => e.dmrlId === id)
const ok = <T,>(result: { ok: true; data: T } | { ok: false; message: string }): T => {
  if (!result.ok) throw new Error(result.message)
  return result.data
}

function importReply(data: Dataset, text: string, at: string, dmrlId: string = DEMO_IDS.dmrlPhungun, userId: string = DEMO_IDS.editorAnna) {
  const result = checkReplyFile(data, dmrl(data, dmrlId), text)
  if (result.report.findings.length) throw new Error(result.report.findings.map((f) => f.message).join("; "))
  return ok(executeReplyImport(data, dmrlId, user(data, userId), { fileName: "reply.XML", text, result, sendArchiveId: latestSend(data, dmrlId)!.id }, at))
}

/** Check-out + Check-in mit optionaler Änderung (über die echten Workflows) */
function checkOutIn(data: Dataset, at: string, change?: (rows: EntrySnapshot[]) => EntrySnapshot[], userId: string = DEMO_IDS.editorAnna) {
  const out = ok(executeCheckOut(data, DEMO_IDS.dmrlPhungun, user(data, userId), at))
  const rows = structuredClone(dmrl(out).lock!.entries)
  const result = checkCheckinFile(out, dmrl(out), writeEntriesCsv(change ? change(rows) : rows))
  if (result.report.findings.some((f) => f.severity === "fehler")) throw new Error(JSON.stringify(result.report.findings))
  return ok(executeCheckIn(out, DEMO_IDS.dmrlPhungun, user(out, userId), result, at))
}

/** Demo: PHUNGUN durch REPLY mit nur „y" freigegeben */
const released = () => importReply(buildDemoDataset(), allApproved, "2026-11-12T10:00:00.000Z")

describe("Freigabe-Nachweis und Freigabestand", () => {
  it("Freigabe speichert Nachweis und Freigabestand mit allen Einträgen, Datum, REPLY und Bearbeiter", () => {
    const data = released()
    const snapshot = latestRelease(data, DEMO_IDS.dmrlPhungun)!
    const info = releaseInfo(data, snapshot)
    expect(snapshot.entries).toHaveLength(32)
    expect(info).toMatchObject({ versionIndex: "00002-2026", partner: { code: "C1234" }, user: { name: "Anna Bearbeitung" } })
    expect(info.send?.id).toBe(DEMO_IDS.archiveSend2)
    expect(releaseLabel(info)).toBe("12.11.2026, REPLY C1234 00002-2026")
    expect(dmrl(data).release?.replyArchiveId).toBe(info.reply?.id)
  })

  it("Demo: freigegeben → Check-out, Änderung, Check-in → in Bearbeitung; Freigabestand bleibt unverändert", () => {
    const data = released()
    const snapshotBefore = latestRelease(data, DEMO_IDS.dmrlPhungun)!
    const changed = checkOutIn(data, "2026-11-13T09:00:00.000Z", (rows) => {
      rows[0].fields.remarks = "Neue Bemerkung"
      Object.assign(rows[0].fields, { dmentryType: "c", type: "changed" })
      return rows
    })
    expect(dmrl(changed).status).toBe("in_bearbeitung")
    expect(dmrl(changed).release).toEqual(dmrl(data).release) // „letzte Freigabe" bleibt
    expect(latestRelease(changed, DEMO_IDS.dmrlPhungun)).toEqual(snapshotBefore)
    expect(latestRelease(changed, DEMO_IDS.dmrlPhungun)!.entries.some((e) => e.fields.remarks === "Neue Bemerkung")).toBe(false)
    expect(datasetSchema.safeParse(changed).success).toBe(true)
  })

  it("Check-in ohne Änderung bei freigegebener DMRL: Nachweis unverändert, kein neuer Freigabestand", () => {
    const data = released()
    const same = checkOutIn(data, "2026-11-13T09:00:00.000Z")
    expect(dmrl(same).status).toBe("freigegeben")
    expect(dmrl(same).release).toEqual(dmrl(data).release)
    expect(releaseSnapshots(same, DEMO_IDS.dmrlPhungun)).toHaveLength(1)
  })

  it("zwei Freigaben: beide bleiben erhalten, „Letzte Freigabe\" ist die neuere", () => {
    let data = released()
    data = checkOutIn(data, "2026-11-13T09:00:00.000Z", (rows) => {
      rows[0].fields.remarks = "Zweiter Zyklus"
      Object.assign(rows[0].fields, { dmentryType: "c", type: "changed" })
      return rows
    })
    const prepared = prepareSend(data, dmrl(data), "org-c1234", "", "2026-11-14T09:00:00.000Z")
    data = ok(executeSend(data, DEMO_IDS.dmrlPhungun, user(data, DEMO_IDS.editorAnna), prepared))
    const sent = readDml(prepared.xml, "2.3")
    // REPLY aus dem gesendeten Stand: dmlc C1234-00003, dmlref = SEND 00003, nur Einträge mit Typ erhalten eine Antwort
    const reply = writeDml(
      {
        header: {
          ...sent.header,
          direction: "reply",
          dmlc: { ...sent.header.dmlc, sendid: "C1234", seqnum: "00003" },
          dmlref: { dmlc: prepared.dmlc, issno: null },
        },
        entries: sent.entries.map((f) => (f.dmentryType ? { ...f, answer: "y" } : f)),
      },
      "2.3",
      { answers: true }
    )
    data = importReply(data, reply, "2026-11-15T09:00:00.000Z")
    const all = releaseSnapshots(data, DEMO_IDS.dmrlPhungun)
    expect(all).toHaveLength(2)
    expect(latestRelease(data, DEMO_IDS.dmrlPhungun)?.createdAt).toBe("2026-11-15T09:00:00.000Z")
    expect(releaseInfo(data, all[0]).versionIndex).toBe("00003-2026")
  })

  it("SEND zurückgezogen nach früherer Freigabe: letzter Freigabestand bleibt verfügbar", () => {
    let data = released()
    data = checkOutIn(data, "2026-11-13T09:00:00.000Z", (rows) => {
      Object.assign(rows[1].fields, { dmentryType: "c", type: "changed" })
      return rows
    })
    data = ok(executeSend(data, DEMO_IDS.dmrlPhungun, user(data, DEMO_IDS.editorAnna), prepareSend(data, dmrl(data), "org-c1234", "", "2026-11-14T09:00:00.000Z")))
    data = ok(executeWithdrawSend(data, DEMO_IDS.dmrlPhungun, user(data, DEMO_IDS.admin), "Test"))
    expect(latestRelease(data, DEMO_IDS.dmrlPhungun)).not.toBeNull()
  })
})

describe("Export des Freigabestands", () => {
  it("CSV: Aufbau PROJ-9, Dateiname mit Datum der Freigabe; keine Sperre", () => {
    const data = released()
    const snapshot = latestRelease(data, DEMO_IDS.dmrlPhungun)!
    const csv = releaseCsv(data, dmrl(data), snapshot)
    expect(csv.fileName).toBe("DML-PHUNGUN-D0815-C-Freigabe-2026-11-12.csv")
    expect(csv.content).toBe(writeEntriesCsv(snapshot.entries))
    expect(dmrl(data).lock).toBeNull()
  })

  it("XML: Export-Kopf (issno 000 / inwork 01, dmlc = SEND, dmlref = Freigabe-REPLY, remarks), ohne answer", () => {
    const data = released()
    const snapshot = latestRelease(data, DEMO_IDS.dmrlPhungun)!
    const xml = releaseXml(data, dmrl(data), snapshot, "2026-11-20T10:00:00.000Z")
    expect(xml.fileName).toBe("DML-PHUNGUN-D0815-C-Freigabe-2026-11-12.XML")
    const parsed = readDml(xml.content, "2.3")
    expect(parsed.header).toMatchObject({
      direction: "send",
      dmlc: { sendid: "D0815", seqnum: "00002", diyear: "2026" },
      issno: { issno: "000", inwork: "01" },
      remarks: "Freigabestand vom 12.11.2026 — Export vom 20.11.2026",
    })
    expect(parsed.header.dmlref?.dmlc).toMatchObject({ sendid: "C1234", seqnum: "00002" })
    expect(parsed.entries).toHaveLength(32)
    expect(xml.content).not.toContain("<answer")
    expect(parsed.entries.every((f) => f.dmentryType === "")).toBe(true)
  })

  it.skipIf(!hasXmllint)("XML besteht die XSD-Prüfung (2.3 PHUNGUN, 4.2 Fahrzeug, 5.0 Hubschrauber)", async () => {
    const data = released()
    const phungun = releaseXml(data, dmrl(data), latestRelease(data, DEMO_IDS.dmrlPhungun)!)
    expect(await validateWithXmllint(new TextEncoder().encode(phungun.content), "2.3")).toEqual({ state: "gueltig", issue: "2.3" })

    for (const [dmrlId, issue] of [
      [DEMO_IDS.dmrlVehicle, "4.2"],
      [DEMO_IDS.dmrlAircraft, "5.0"],
    ] as const) {
      let d = buildDemoDataset()
      const prepared = prepareSend(d, dmrl(d, dmrlId), "org-c1234", "", "2026-11-12T08:00:00.000Z")
      d = ok(executeSend(d, dmrlId, user(d, DEMO_IDS.editorBen), prepared))
      const sent = readDml(prepared.xml, issue)
      const reply = writeDml(
        {
          header: { ...sent.header, direction: "reply", dmlc: { ...sent.header.dmlc, sendid: "C1234" }, dmlref: { dmlc: prepared.dmlc, issno: null } },
          entries: sent.entries.map((f) => ({ ...f, answer: "y" })),
        },
        issue,
        { answers: true }
      )
      d = importReply(d, reply, "2026-11-12T10:00:00.000Z", dmrlId, DEMO_IDS.editorBen)
      expect(dmrl(d, dmrlId).status).toBe("freigegeben")
      const file = releaseXml(d, dmrl(d, dmrlId), latestRelease(d, dmrlId)!)
      expect(await validateWithXmllint(new TextEncoder().encode(file.content), issue)).toEqual({ state: "gueltig", issue })
    }
  })
})

describe("Statusmodell — jede Zeile der Übergangstabellen (PROJ-14)", () => {
  const status = (data: Dataset) => entriesOf(data).map((e) => e.status)

  it("Check-in: neu → in Bearbeitung; geändert (auch nur Eintragstyp) → in Bearbeitung; unverändert bleibt; DMRL freigegeben → in Bearbeitung", () => {
    const data = released()
    const after = checkOutIn(data, "2026-11-13T09:00:00.000Z", (rows) => {
      Object.assign(rows[0].fields, { dmentryType: "c", type: "changed" }) // nur Eintragstyp
      return [...rows, { id: "neu", status: "in_bearbeitung", fields: { ...rows[0].fields, itemloc: "Z", dmentryType: "n", type: "new", answer: "", answer_comment: "" } }]
    })
    const list = entriesOf(after)
    expect(list).toHaveLength(33)
    expect(list.filter((e) => e.status === "in_bearbeitung")).toHaveLength(2)
    expect(list.filter((e) => e.status === "freigegeben")).toHaveLength(31)
    expect(dmrl(after).status).toBe("in_bearbeitung")
  })

  it("SEND: n/c/d in Bearbeitung → gesendet; ohne Eintragstyp freigegeben bleibt; DMRL → gesendet", () => {
    let data = released()
    data = checkOutIn(data, "2026-11-13T09:00:00.000Z", (rows) => {
      rows[0].fields.dmentryType = "d"
      return rows
    })
    data = ok(executeSend(data, DEMO_IDS.dmrlPhungun, user(data, DEMO_IDS.editorAnna), prepareSend(data, dmrl(data), "org-c1234", "", "2026-11-14T09:00:00.000Z")))
    expect(status(data).filter((s) => s === "gesendet")).toHaveLength(1)
    expect(status(data).filter((s) => s === "freigegeben")).toHaveLength(31)
    expect(dmrl(data).status).toBe("gesendet")
  })

  it("REPLY y → freigegeben (Typ entfernt), n → zu überarbeiten; DMRL in Bearbeitung bzw. freigegeben", () => {
    const partial = importReply(buildDemoDataset(), demoReply, "2026-11-12T10:00:00.000Z")
    expect(status(partial).filter((s) => s === "zu_ueberarbeiten")).toHaveLength(2)
    expect(entriesOf(partial).filter((e) => e.status === "freigegeben").every((e) => e.fields.dmentryType === "")).toBe(true)
    expect(dmrl(partial).status).toBe("in_bearbeitung")
    expect(dmrl(released()).status).toBe("freigegeben")
  })

  it("SEND zurückgezogen: gesendet → in Bearbeitung (Einträge und DMRL)", () => {
    const demo = buildDemoDataset()
    const data = ok(executeWithdrawSend(demo, DEMO_IDS.dmrlPhungun, user(demo, DEMO_IDS.admin), "Test"))
    expect(status(data).every((s) => s === "in_bearbeitung")).toBe(true)
    expect(dmrl(data).status).toBe("in_bearbeitung")
  })

  it("Invariante: DMRL ohne Einträge ist nie freigegeben; Widerspruch wird beim Laden erkannt", () => {
    const demo = buildDemoDataset()
    const broken: Dataset = {
      ...demo,
      entries: demo.entries.filter((e) => e.dmrlId !== DEMO_IDS.dmrlVehicle),
      dmrls: demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlVehicle ? { ...d, status: "freigegeben" } : d)),
    }
    expect(datasetSchema.safeParse(broken).success).toBe(false)
    const contradiction: Dataset = { ...demo, dmrls: demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlVehicle ? { ...d, status: "freigegeben" } : d)) }
    expect(datasetSchema.safeParse(contradiction).success).toBe(false)
  })
})

describe("Freigabe durch Übernahme Bestand per Check-in (PROJ-10, Refinement 2026-11-18)", () => {
  it("Freigabestand ohne REPLY: Beschriftung, Info, CSV- und XML-Export", () => {
    const demo = buildDemoDataset()
    const vehicle = dmrl(demo, DEMO_IDS.dmrlVehicle)
    const entries = entriesOf(demo, DEMO_IDS.dmrlVehicle).map(({ id, fields }) => ({
      id,
      status: "freigegeben" as const,
      fields: { ...fields, dmentryType: "", type: "new" },
    }))
    const snapshot = { id: "release-x", dmrlId: vehicle.id, createdAt: "2026-11-18T10:00:00.000Z", replyArchiveId: null, userId: DEMO_IDS.editorBen, entries }
    const data: Dataset = { ...demo, releases: [snapshot] }
    const info = releaseInfo(data, snapshot)
    expect(info.reply).toBeNull()
    expect(info.partner).toBeNull()
    expect(releaseLabel(info)).toBe("18.11.2026, Übernahme per Check-in")
    expect(releaseCsv(data, vehicle, snapshot).fileName).toMatch(/-Freigabe-2026-11-18\.csv$/)
    const xml = releaseXml(data, vehicle, snapshot, "2026-11-18T11:00:00.000Z")
    expect(xml.content).toContain("Freigabestand vom 18.11.2026")
  })
})
