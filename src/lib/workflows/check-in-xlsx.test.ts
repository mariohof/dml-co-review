import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { buildDemoDataset, DEMO_IDS } from "@/lib/data/demo-data"
import { ENTRY_FIELD_NAMES, type Dataset, type Dmrl, type EntrySnapshot, type User } from "@/lib/data/schema"
import { entriesTable } from "@/lib/files/csv-writer"
import { writeEntriesXlsx } from "@/lib/files/entries-xlsx"
import { writeXlsx, XLSX_MIME_TYPE } from "@/lib/files/xlsx-writer"
import { runCheckinCheck } from "@/lib/rules/check/checkin"
import { errorCount } from "@/lib/rules/check/types"
import { checkCheckinFile, executeCheckIn, MAX_CHECKIN_BYTES, readCheckinFile, type FileReadResult } from "./check-in"
import { executeCheckOut, lockXlsx } from "./check-out"

/** PROJ-10 Refinement 2026-11-25 — Check-in einer MS-Excel-Datei (.xlsx) */

const AT = "2026-11-25T10:00:00.000Z"
const user = (data: Dataset, id: string) => data.users.find((u) => u.id === id) as User
const dmrl = (data: Dataset, id: string) => data.dmrls.find((d) => d.id === id) as Dmrl

function checkedOut(): Dataset {
  const demo = buildDemoDataset()
  const result = executeCheckOut(demo, DEMO_IDS.dmrlVehicle, user(demo, DEMO_IDS.editorBen), AT)
  if (!result.ok) throw new Error(result.message)
  return result.data
}

const lockRows = (data: Dataset) => structuredClone(dmrl(data, DEMO_IDS.dmrlVehicle).lock!.entries)
const xlsxFile = (bytes: Uint8Array, name = "DML-GTFDEMO-D0815-C-2026.xlsx") => new File([bytes as BlobPart], name, { type: XLSX_MIME_TYPE })

async function read(file: File) {
  const result: FileReadResult = await readCheckinFile(file)
  if (!result.ok || !("table" in result)) throw new Error(result.ok ? "keine Tabelle" : result.message)
  return result.table
}

const errors = (result: ReturnType<typeof runCheckinCheck>) => result.report.findings.filter((f) => f.severity === "fehler")

describe("Check-in einer Excel-Datei", () => {
  it("ausgecheckte Excel-Datei unverändert einchecken: fehlerfrei, nur unveränderte Einträge", async () => {
    const data = checkedOut()
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), await read(xlsxFile(lockXlsx(dmrl(data, DEMO_IDS.dmrlVehicle))!)))
    expect(errorCount(result.report)).toBe(0)
    expect(result.summary).toMatchObject({ geprueft: 10, neu: 0, geaendert: 0, unveraendert: 10 })
  })

  it("in Excel bearbeitet (neue Zeile mit n, Bemerkung geändert): 1 neu, 1 geändert; Übernahme hebt die Sperre auf", async () => {
    const data = checkedOut()
    const rows = lockRows(data)
    rows[0].fields.remarks = "Geändert in Excel"
    const added: EntrySnapshot = structuredClone(rows[1])
    added.fields = { ...added.fields, itemloc: "Q", dmentryType: "n", type: "new", answer: "", answer_comment: "", answer_timestamp: "" }
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), await read(xlsxFile(writeEntriesXlsx([...rows, added]))))
    expect(errors(result)).toEqual([])
    expect(result.summary).toMatchObject({ neu: 1, geaendert: 1, unveraendert: 9 })
    const outcome = executeCheckIn(data, DEMO_IDS.dmrlVehicle, user(data, DEMO_IDS.editorBen), result, AT)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(dmrl(outcome.data, DEMO_IDS.dmrlVehicle).lock).toBeNull()
    expect(outcome.data.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlVehicle)).toHaveLength(11)
  })

  it("Zahlzelle `1` in security wird zu `01` aufgefüllt (Hinweis), Datumszelle in day ist ein Formatfehler", () => {
    const data = checkedOut()
    const { header, rows } = entriesTable(lockRows(data))
    const col = (name: string) => header.indexOf(name)
    rows[0][col("security")] = "1"
    rows[1][col("day")] = "46351"
    const sheet = { source: "xlsx" as const, rows: [header, ...rows].map((cells, i) => ({ line: i + 1, cells })) }
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), sheet)
    expect(result.report.findings.find((f) => f.severity === "hinweis" && f.field === "security")?.message).toBe("Führende Nullen ergänzt: ‚1' → ‚01'.")
    expect(errors(result).map((f) => [f.group, f.field, f.line])).toEqual([["A", "day", 3]])
  })

  it("echter Text `'=x` bleibt unverändert (kein Entfernen des Apostrophs wie bei CSV)", async () => {
    const data = checkedOut()
    const rows = lockRows(data)
    rows[0].fields.remarks = "'=x"
    const result = checkCheckinFile(data, dmrl(data, DEMO_IDS.dmrlVehicle), await read(xlsxFile(writeEntriesXlsx(rows))))
    expect(result.candidates.find((c) => c.fields.remarks !== "")?.fields.remarks).toBe("'=x")
  })

  it("leere Zeilen werden ignoriert, fehlende Zellen am Zeilenende gelten als leer, Zeilennummern des Blatts im Prüfbericht", () => {
    const data = checkedOut()
    const { header, rows } = entriesTable(lockRows(data))
    const trimmed = rows.map((cells) => {
      const copy = [...cells]
      while (copy.length > 0 && copy[copy.length - 1] === "") copy.pop()
      return copy
    })
    trimmed[2][header.indexOf("modelic")] = "FALSCH"
    const sheetRows = [
      { line: 1, cells: header },
      { line: 2, cells: [] },
      ...trimmed.map((cells, i) => ({ line: i + 3, cells })),
    ]
    const result = runCheckinCheck({ source: "xlsx", rows: sheetRows }, { systemModelic: "GTFDEMO", snapshot: lockRows(data) })
    expect(result.candidates).toHaveLength(10)
    // dritte Datenzeile steht im Blatt in Zeile 5
    const lined = errors(result).filter((f) => f.line !== undefined)
    expect(lined.length).toBeGreaterThan(0)
    expect(lined.every((f) => f.line === 5)).toBe(true)
  })

  it("Werte außerhalb der 28 Spalten sind ein Fehler", () => {
    const data = checkedOut()
    const { header, rows } = entriesTable(lockRows(data))
    const sheetRows = [{ line: 1, cells: header }, ...rows.map((cells, i) => ({ line: i + 2, cells: i === 0 ? [...cells, "zu viel"] : cells }))]
    const result = runCheckinCheck({ source: "xlsx", rows: sheetRows }, { systemModelic: "GTFDEMO", snapshot: lockRows(data) })
    expect(errors(result).filter((f) => f.group === "S").map((f) => [f.line, f.message])).toEqual([[2, `Zeile hat 29 statt ${ENTRY_FIELD_NAMES.length} Spalten.`]])
  })

  it("Testdatei aus MS Excel gegen den Demo-Stand PHUNGUN: keine Fehler, 32 Einträge fachlich unverändert", () => {
    const demo = buildDemoDataset()
    const snapshot = demo.entries.filter((e) => e.dmrlId === DEMO_IDS.dmrlPhungun).map(({ id, status, fields }) => ({ id, status, fields: { ...fields } }))
    const bytes = new Uint8Array(readFileSync(resolve(__dirname, "../../../tests/fixtures/PHUNGUN-ms-excel-aus-csv.xlsx")))
    return read(xlsxFile(bytes, "DML-PHUNGUN-D0815-C-Export-2026-11-25.xlsx")).then((table) => {
      const result = runCheckinCheck(table, { systemModelic: "PHUNGUN", snapshot })
      expect(errors(result)).toEqual([])
      expect(result.summary).toMatchObject({ geprueft: 32, neu: 0, geaendert: 0 })
    })
  })
})

describe("Datei wählen", () => {
  it("Excel-Datei über 5 MB wird abgelehnt", async () => {
    const big = new File([new Uint8Array(MAX_CHECKIN_BYTES + 1)], "gross.xlsx")
    expect(await readCheckinFile(big)).toEqual({ ok: false, message: "Datei zu groß (höchstens 5 MB)." })
  })

  it("eigene Datei mit genau einem Blatt wird gelesen; Endung in Großbuchstaben wird erkannt", async () => {
    const bytes = writeXlsx({ sheetName: "Tabelle1", header: ["a"], rows: [] })
    // eigene Datei hat genau ein Blatt → wird gelesen
    expect((await readCheckinFile(xlsxFile(bytes, "LISTE.XLSX"))).ok).toBe(true)
  })
})
