import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { latestSend } from "@/lib/data/queries"
import {
  CORE_FIELD_NAMES,
  datasetSchema,
  ENTRY_FILE_COLUMNS,
  INFO_FIELD_NAMES,
  type Dataset,
  type Dmrl,
  type EntrySnapshot,
  type User,
} from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { entriesTable, writeEntriesCsv } from "@/lib/files/csv-writer"
import { ENTRIES_SHEET_NAME } from "@/lib/files/entries-xlsx"
import { readXlsxSheet } from "@/lib/files/xlsx-reader"
import { NO_INFO_FIELDS_HINT, readCheckinCsv } from "@/lib/rules/check/csv-reader"
import { errorCount } from "@/lib/rules/check/types"
import { checkCheckinFile, executeCheckIn } from "./check-in"
import { executeCheckOut, lockXlsx } from "./check-out"
import { checkReplyFile, executeReplyImport } from "./reply"
import { prepareSend } from "./send"

/** PROJ-9/10 Refinement 2026-11-26 — `dmc` und Informationsfelder (37 Spalten) */

const AT = "2026-11-26T10:00:00.000Z"
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl
const vehicleEntries = (data: Dataset) => data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)

function checkOut(base: Dataset): Dataset {
  const result = executeCheckOut(base, DEMO_IDS.dmrlVehicle, user(base, DEMO_IDS.editorBen), AT)
  if (!result.ok) throw new Error(result.message)
  return result.data
}

/** Fahrzeug-DMRL freigegeben (alle Einträge freigegeben, ohne Eintragstyp), ausgecheckt von Ben */
function releasedCheckedOut(): Dataset {
  const demo = buildDemoDataset()
  return checkOut({
    ...demo,
    dmrls: demo.dmrls.map((d) => (d.id === DEMO_IDS.dmrlVehicle ? { ...d, status: "freigegeben" } : d)),
    entries: demo.entries.map((e) => (e.dmrlId === DEMO_IDS.dmrlVehicle ? { ...e, status: "freigegeben", fields: { ...e.fields, dmentryType: "" } } : e)),
  })
}

const lockRows = (data: Dataset) => structuredClone(dmrl(data, DEMO_IDS.dmrlVehicle).lock!.entries)
const csvOf = (data: Dataset, change?: (rows: EntrySnapshot[]) => EntrySnapshot[]) => writeEntriesCsv(change ? change(lockRows(data)) : lockRows(data))
const checkIn = (data: Dataset, csv: string) => {
  const checked = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), csv)
  const result = executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), checked, AT)
  return { checked, result }
}
const withInfo = (rows: EntrySnapshot[], index = 0) =>
  rows.map((e, i) => (i === index ? { ...e, fields: { ...e.fields, orig: "D0815", applic_model: "GTF-A", "io-pm": "=1+1" } } : e))

describe("Dateiaufbau", () => {
  it("37 Spalten: 28 bisherige, dann dmc und die 8 Informationsfelder", () => {
    expect(ENTRY_FILE_COLUMNS).toHaveLength(37)
    expect(ENTRY_FILE_COLUMNS.slice(0, 28)).toEqual([...CORE_FIELD_NAMES])
    expect(ENTRY_FILE_COLUMNS.slice(27)).toEqual(["remarks", "dmc", "orig", "applic_type", "applic_model", "applic_version", "rfu", "dtd-schema", "spec", "io-pm"])
  })

  it("dmc in der Schreibweise der Anwendung; Informationsfelder bestehender Einträge leer", () => {
    const data = checkOut(buildDemoDataset())
    const sheet = readXlsxSheet(lockXlsx(dmrl(data, DEMO_IDS.dmrlVehicle))!, ENTRIES_SHEET_NAME)
    if (!sheet.ok) throw new Error("nicht lesbar")
    expect(sheet.rows[0].cells).toEqual([...ENTRY_FILE_COLUMNS])
    const dmcIndex = ENTRY_FILE_COLUMNS.indexOf("dmc")
    const table = entriesTable(lockRows(data))
    expect(sheet.rows.slice(1).map((r) => r.cells[dmcIndex])).toEqual(table.rows.map((r) => r[dmcIndex]))
    expect(new Set(sheet.rows.slice(1).map((r) => r.cells[dmcIndex]))).toEqual(new Set(vehicleEntries(data).map((e) => formatDmc(e.fields))))
    const infoCells = sheet.rows.slice(1).flatMap((r) => r.cells.slice(dmcIndex + 1))
    expect(infoCells.every((c) => c === "")).toBe(true)
  })

  it("gespeicherte Daten ohne Informationsfelder bleiben gültig, die Felder sind leer", () => {
    const demo = buildDemoDataset()
    const stripped = JSON.parse(JSON.stringify(demo))
    for (const entry of stripped.entries) for (const name of INFO_FIELD_NAMES) delete entry.fields[name]
    const parsed = datasetSchema.parse(stripped)
    expect(parsed.entries.every((e) => INFO_FIELD_NAMES.every((name) => e.fields[name] === ""))).toBe(true)
  })
})

describe("Check-in", () => {
  it("nur Informationsfelder geändert: übernommen, Einträge unverändert, DMRL bleibt freigegeben, kein Eintragstyp nötig", () => {
    const data = releasedCheckedOut()
    const { checked, result } = checkIn(data, csvOf(data, withInfo))
    expect(errorCount(checked.report)).toBe(0)
    expect(checked.summary).toMatchObject({ neu: 0, geaendert: 0, informationsfelder: 1 })
    if (!result.ok) throw new Error(result.message)
    expect(dmrl(result.data, DEMO_IDS.dmrlVehicle).status).toBe("freigegeben")
    expect(vehicleEntries(result.data).every((e) => e.status === "freigegeben")).toBe(true)
    const changed = vehicleEntries(result.data).find((e) => e.fields.orig === "D0815")!
    expect(changed.fields).toMatchObject({ applic_model: "GTF-A", "io-pm": "=1+1" })
    expect(result.data.history.at(-1)!.details).toContain("Informationsfelder bei 1 Einträgen aktualisiert")
    // nächster Check-out enthält die Werte wieder
    const again = checkOut(result.data)
    expect(csvOf(again)).toContain(";D0815;;GTF-A;")
  })

  it("fachliche Änderung und Informationsfelder: geändert wie bisher, beide Änderungen übernommen", () => {
    const data = checkOut(buildDemoDataset())
    const csv = csvOf(data, (rows) => withInfo(rows).map((e, i) => (i === 0 ? { ...e, fields: { ...e.fields, remarks: "Neu", dmentryType: "c", type: "changed" } } : e)))
    const { checked, result } = checkIn(data, csv)
    expect(checked.report.findings.filter((f) => f.severity === "fehler")).toEqual([])
    expect(checked.summary).toMatchObject({ geaendert: 1, informationsfelder: 1 })
    if (!result.ok) throw new Error(result.message)
    const entry = vehicleEntries(result.data).find((e) => e.fields.remarks === "Neu")!
    expect(entry.status).toBe("in_bearbeitung")
    expect(entry.fields.orig).toBe("D0815")
  })

  it("geänderte dmc-Spalte wird ignoriert", () => {
    const data = releasedCheckedOut()
    const dmcIndex = ENTRY_FILE_COLUMNS.indexOf("dmc")
    const lines = csvOf(data).split("\r\n")
    const cells = lines[1].split(";")
    cells[dmcIndex] = "FALSCH"
    lines[1] = cells.join(";")
    const { checked, result } = checkIn(data, lines.join("\r\n"))
    expect(errorCount(checked.report)).toBe(0)
    expect(checked.summary).toMatchObject({ neu: 0, geaendert: 0, informationsfelder: 0 })
    if (!result.ok) throw new Error(result.message)
    expect(dmrl(result.data, DEMO_IDS.dmrlVehicle).status).toBe("freigegeben")
  })

  it("Datei mit 28 Spalten: angenommen, gespeicherte Informationsfelder bleiben, Hinweis im Prüfbericht", () => {
    // erster Zyklus: Informationsfelder setzen
    const first = checkIn(checkOut(buildDemoDataset()), csvOf(checkOut(buildDemoDataset()), withInfo))
    if (!first.result.ok) throw new Error(first.result.message)
    const data = checkOut(first.result.data)
    const legacy = csvOf(data)
      .split("\r\n")
      .map((line) => (line === "" ? line : line.split(";").slice(0, 28).join(";")))
      .join("\r\n")
    const { checked, result } = checkIn(data, legacy)
    expect(errorCount(checked.report)).toBe(0)
    expect(checked.report.findings.map((f) => f.message)).toContain(NO_INFO_FIELDS_HINT)
    expect(checked.summary.informationsfelder).toBe(0)
    if (!result.ok) throw new Error(result.message)
    expect(vehicleEntries(result.data).filter((e) => e.fields.orig === "D0815")).toHaveLength(1)
  })

  it("nur einige der neuen Spalten: Fehler im Spaltenaufbau", () => {
    const header = ENTRY_FILE_COLUMNS.filter((name) => name !== "spec")
    const result = readCheckinCsv(header.join(";"))
    expect(result.aborted).toBe(true)
    expect(result.findings[0].message).toBe("Spalte ‚spec' fehlt.")
  })

  it("beliebige Werte in Informationsfeldern: kein Fehler, kein Hinweis", () => {
    const data = checkOut(buildDemoDataset())
    const csv = csvOf(data, (rows) => rows.map((e, i) => (i === 0 ? { ...e, fields: { ...e.fields, orig: "abc", rfu: "x/1 ä" } } : e)))
    const { checked } = checkIn(data, csv)
    expect(checked.report.findings.filter((f) => f.field && (INFO_FIELD_NAMES as readonly string[]).includes(f.field))).toEqual([])
    expect(errorCount(checked.report)).toBe(0)
  })
})

describe("SEND und REPLY", () => {
  const ROOT = join(__dirname, "..", "..", "..")
  const demoReply = readFileSync(join(ROOT, "public/demo-dateien", "DML-PHUNGUN-C1234-C-2026-00002_001-00.XML"), "utf8")
  const withStoredInfo = (data: Dataset): Dataset => ({
    ...data,
    entries: data.entries.map((e) => ({ ...e, fields: { ...e.fields, orig: "ORIGX", spec: "SPECX" } })),
  })

  it("REPLY: keine Abweichungen wegen Informationsfeldern, Werte bleiben erhalten", () => {
    const data = withStoredInfo(buildDemoDataset())
    const result = checkReplyFile(data, dmrl(data, DEMO_IDS.dmrlPhungun), demoReply)
    expect(result.report.findings.filter((f) => f.group === "G")).toEqual([])
    const send = latestSend(data, DEMO_IDS.dmrlPhungun)!
    const outcome = executeReplyImport(
      data,
      DEMO_IDS.dmrlPhungun,
      user(data, DEMO_IDS.editorAnna),
      { fileName: "reply.xml", text: demoReply, result, sendArchiveId: send.id },
      AT
    )
    if (!outcome.ok) throw new Error(outcome.message)
    expect(outcome.data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlPhungun).every((e) => e.fields.orig === "ORIGX" && e.fields.spec === "SPECX")).toBe(true)
  })

  it("SEND-XML enthält die Informationsfelder nicht", () => {
    const data = withStoredInfo(buildDemoDataset())
    const partner = data.organisations.find((o) => o.code === "C1234")!
    const prepared = prepareSend(data, dmrl(data, DEMO_IDS.dmrlVehicle), partner.id, "", AT)
    expect(prepared.xml).not.toContain("ORIGX")
    expect(prepared.xml).not.toContain("SPECX")
  })
})
