import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { writeDml } from "@/lib/data/dml-writer"
import { S1000D_ISSUES, type Dataset, type Dmrl, type DmlHeader, type EntrySnapshot, type User } from "@/lib/data/schema"
import { deriveIssueType } from "@/lib/dmrl/issue-type"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { runCheckinCheck } from "@/lib/rules/check/checkin"
import { runReplyCheck } from "@/lib/rules/check/reply"
import { errorCount } from "@/lib/rules/check/types"
import { validateWithXmllint } from "@/lib/xsd/server/xmllint"
import { checkCheckinFile, executeCheckIn } from "./check-in"
import { executeCheckOut } from "./check-out"
import { checkReplyFile, executeReplyImport, replyContext } from "./reply"

/** QA PROJ-10 Refinement 2026-11-16 — Eintragstyp ↔ DM-Ausgabetyp (Red Team, Workflow, Schema) */

const ROOT = join(__dirname, "..", "..", "..")
const demoReply = readFileSync(join(ROOT, "public/demo-dateien/DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"), "utf8")
const AT = "2026-11-16T09:00:00.000Z"
const hasXmllint = spawnSync("xmllint", ["--version"]).status === 0
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const ok = <T,>(r: { ok: true; data: T } | { ok: false; message: string }): T => {
  if (!r.ok) throw new Error(r.message)
  return r.data
}
const checkedOut = (data: Dataset, id: string, userId: string) => ok(executeCheckOut(data, id, user(data, userId), AT))
const csvFromLock = (data: Dataset, id: string, change: (rows: EntrySnapshot[]) => EntrySnapshot[] = (r) => r) =>
  writeEntriesCsv(change(structuredClone(dmrl(data, id).lock!.entries)))

const vehicle = () => {
  const demo = buildDemoDataset()
  const snapshot: EntrySnapshot[] = demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle).map(({ id, status, fields }) => ({ id, status, fields }))
  return { snapshot, context: { systemModelic: "GTFDEMO", snapshot } }
}

describe("Red Team — Eingaben, die die Typ-Regel umgehen oder stören könnten", () => {
  // BUG-QA7-1 (behoben 2026-11-18): vorher TypeError „allowed.includes is not a function“
  it.each(["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf"])(
    "BUG-QA7-1: Eintragstyp ‚%s‘ führt nicht zum Absturz, sondern zu einem Formatfehler A",
    (entryType) => {
      const { snapshot, context } = vehicle()
      const rows = structuredClone(snapshot)
      rows[0].fields.dmentryType = entryType
      const run = () => runCheckinCheck(writeEntriesCsv(rows), context)
      expect(run).not.toThrow()
      const findings = run().report.findings
      expect(findings.some((f) => f.group === "A" && f.field === "dmentryType")).toBe(true)
      expect(findings.some((f) => f.field === "type")).toBe(false)
    },
  )

  it.each(["constructor", "__proto__", "toString"])("Ableitung des Ausgabetyps für ‚%s‘ liefert new (PROJ-1/PROJ-20)", (entryType) => {
    expect(deriveIssueType(entryType)).toBe("new")
  })

  it("Leerzeichen um Eintrags- und Ausgabetyp werden entfernt: ‚ d ‘ + ‚ deleted ‘ ist gültig", () => {
    const { snapshot, context } = vehicle()
    const csv = writeEntriesCsv(snapshot).replace(/\r\nn;(GTFDEMO;[^\r]*?);001;new;/, "\r\n d ;$1;001; deleted ;")
    expect(csv).toContain(" deleted ")
    expect(runCheckinCheck(csv, context).report.findings).toEqual([])
  })

  it.each([
    ["N", "new"],
    ["d", "DELETED"],
    ["c", "Status"],
  ])("Großschreibung (%s / %s): nur Formatfehler A, keine Typ-Meldung", (entryType, issueType) => {
    const { snapshot, context } = vehicle()
    const rows = structuredClone(snapshot)
    Object.assign(rows[0].fields, { dmentryType: entryType, type: issueType })
    const findings = runCheckinCheck(writeEntriesCsv(rows), context).report.findings
    expect(findings.every((f) => f.group === "A")).toBe(true)
    expect(findings).toHaveLength(1)
  })

  it("viele Verstöße: jeder Eintrag wird einzeln gemeldet", () => {
    const { snapshot, context } = vehicle()
    const rows = structuredClone(snapshot).map((r) => ({ ...r, fields: { ...r.fields, dmentryType: "d" } }))
    const findings = runCheckinCheck(writeEntriesCsv(rows), context).report.findings
    expect(findings.filter((f) => f.field === "type")).toHaveLength(10)
    expect(new Set(findings.map((f) => f.line)).size).toBe(10)
  })
})

/** PHUNGUN wartet im Demo-Zustand auf den REPLY — Check-out erst nach Import der Demo-REPLY-Datei möglich */
function phungunAfterReply(base: Dataset = buildDemoDataset()) {
  const result = checkReplyFile(base, dmrl(base, DEMO_IDS.dmrlPhungun), demoReply)
  const sendArchiveId = base.archive.filter((a) => a.dmrlId === DEMO_IDS.dmrlPhungun && a.direction === "send").at(-1)!.id
  const replied = ok(executeReplyImport(base, DEMO_IDS.dmrlPhungun, user(base, DEMO_IDS.editorAnna), { fileName: "reply.XML", text: demoReply, result, sendArchiveId }, AT))
  return checkedOut(replied, DEMO_IDS.dmrlPhungun, DEMO_IDS.editorAnna)
}

describe("Workflow — Check-out → Check-in mit der Typ-Regel", () => {
  it("Demo PHUNGUN lässt sich vor dem REPLY nicht auschecken (Akzeptanzkriterium „frisch geladen → auschecken“ so nicht erreichbar)", () => {
    const demo = buildDemoDataset()
    expect(executeCheckOut(demo, DEMO_IDS.dmrlPhungun, user(demo, DEMO_IDS.editorAnna), AT).ok).toBe(false)
  })

  it("PHUNGUN nach dem Demo-REPLY: ausgecheckte CSV unverändert einchecken ist fehlerfrei", () => {
    const data = phungunAfterReply()
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlPhungun), csvFromLock(data, DEMO_IDS.dmrlPhungun))
    expect(result.report.findings).toEqual([])
    expect(result.summary).toMatchObject({ geprueft: 32, neu: 0, geaendert: 0, unveraendert: 32 })
  })

  it("abgelehnter Check-in bei Verstoß (freigegebener Eintrag mit new erhält d, Ausgabetyp nicht angepasst): nichts übernommen, Sperre bleibt", () => {
    const data = phungunAfterReply()
    const csv = csvFromLock(data, DEMO_IDS.dmrlPhungun, (rows) => {
      Object.assign(rows.find((r) => r.status === "freigegeben" && r.fields.type === "new")!.fields, { dmentryType: "d" })
      return rows
    })
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlPhungun), csv)
    expect(result.report.findings.map((f) => f.message)).toEqual(["Eintragstyp ‚d‘ verlangt DM-Ausgabetyp ‚deleted‘ — gefunden: ‚new‘"])
    const attempt = executeCheckIn(data, DEMO_IDS.dmrlPhungun, user(data, DEMO_IDS.editorAnna), result, AT)
    expect(attempt.ok).toBe(false)
    expect(dmrl(data, DEMO_IDS.dmrlPhungun).lock).not.toBeNull()
  })

  it("alte Demo-Daten im Browser (d + new): nach dem REPLY ohne Eintragstyp → keine Typ-Meldung (Regel 4)", () => {
    const fresh = buildDemoDataset()
    const old: Dataset = {
      ...fresh,
      entries: fresh.entries.map((e) => (e.dmrlId === DEMO_IDS.dmrlPhungun ? { ...e, fields: { ...e.fields, type: "new" } } : e)),
    }
    const data = phungunAfterReply(old)
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlPhungun), csvFromLock(data, DEMO_IDS.dmrlPhungun))
    expect(result.report.findings).toEqual([])
  })

  it("alte Demo-Daten mit d + new bei einem Eintrag mit Eintragstyp: Fehler; Korrektur in der CSV → geändert, „in Bearbeitung“", () => {
    const { snapshot, context } = vehicle()
    const old = structuredClone(snapshot)
    Object.assign(old[0].fields, { dmentryType: "d", type: "new" })
    expect(runCheckinCheck(writeEntriesCsv(old), { ...context, snapshot: old }).report.findings).toHaveLength(1)
    const fixed = structuredClone(old)
    fixed[0].fields.type = "deleted"
    const result = runCheckinCheck(writeEntriesCsv(fixed), { ...context, snapshot: old })
    expect(errorCount(result.report)).toBe(0)
    expect(result.summary).toMatchObject({ geaendert: 1, unveraendert: 9 })
  })

  it("Eintrag c mit Ausgabetyp status wird übernommen und bleibt status", () => {
    const data = checkedOut(buildDemoDataset(), DEMO_IDS.dmrlVehicle, DEMO_IDS.editorBen)
    const csv = csvFromLock(data, DEMO_IDS.dmrlVehicle, (rows) => {
      Object.assign(rows[0].fields, { dmentryType: "c", type: "status", issno: "002" })
      return rows
    })
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), csv)
    expect(errorCount(result.report)).toBe(0)
    const after = ok(executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), result, AT))
    expect(after.entries.find((e) => e.id === rows0Id(data))).toMatchObject({ status: "in_bearbeitung", fields: { dmentryType: "c", type: "status" } })
  })
})

const rows0Id = (data: Dataset) => dmrl(data, DEMO_IDS.dmrlVehicle).lock!.entries[0].id

describe("Nur beim Check-in — REPLY bleibt unberührt", () => {
  it("Demo-REPLY auf SEND 00002 besteht weiterhin die Prüfung (Einträge ohne Ausgabedaten)", () => {
    const demo = buildDemoDataset()
    const findings = runReplyCheck(demoReply, replyContext(demo, dmrl(demo, DEMO_IDS.dmrlPhungun))).report.findings
    expect(findings.filter((f) => f.severity === "fehler")).toEqual([])
  })

  it("REPLY mit unpassendem Ausgabetyp zu einem d-Eintrag: keine Typ-Meldung, nur Regel G (verändert)", () => {
    const demo = buildDemoDataset()
    const xml = demoReply.replace(/(<dmentry[^>]*type="d"[^>]*>[\s\S]*?<\/dmtitle>)/, '$1<issno issno="001" type="new"/>')
    expect(xml).not.toBe(demoReply)
    const findings = runReplyCheck(xml, replyContext(demo, dmrl(demo, DEMO_IDS.dmrlPhungun))).report.findings
    expect(findings.some((f) => f.message.includes("verlangt DM-Ausgabetyp"))).toBe(false)
    expect(findings.some((f) => f.group === "G")).toBe(true)
  })
})

describe.skipIf(!hasXmllint)("Schema — Ausgabetyp status im SEND", () => {
  const demo = buildDemoDataset()
  const entries = demo.entries
    .filter((e) => e.dmrlId === DEMO_IDS.dmrlPhungun)
    .map((e, i) => (i === 0 ? { ...e.fields, dmentryType: "c", type: "status", issno: "002" } : e.fields))
  const header: DmlHeader = {
    direction: "send",
    dmlc: { modelic: "PHUNGUN", sendid: "D0815", dmltype: "c", diyear: "2026", seqnum: "00003" },
    issno: { issno: "001", inwork: "00", type: "new" },
    issdate: { day: "16", month: "11", year: "2026" },
    security: "01",
    dmlref: null,
    remarks: "",
  }

  it.each(S1000D_ISSUES)("Issue %s: SEND mit c + status ist schemagültig", async (issue) => {
    const xml = writeDml({ header, entries }, issue, { answers: false })
    expect(xml).toMatch(/type="status"|issueType="status"/)
    const result = await validateWithXmllint(xml, issue)
    expect(result).toMatchObject({ state: "gueltig" })
  })
})
