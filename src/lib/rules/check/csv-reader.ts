import Papa from "papaparse"

import { CORE_FIELD_NAMES, DMC_COLUMN, emptyEntryFields, ENTRY_FILE_COLUMNS, INFO_FIELD_NAMES, type EntryFields } from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { unguardCsvCell } from "@/lib/files/csv-formula"
import type { SheetRow } from "@/lib/files/xlsx-reader"
import type { Candidate, Finding } from "./types"

/**
 * Leser für den Check-in (PROJ-8 Gruppe S, Tech Design B; PROJ-10 Tech Design J).
 * CSV: Semikolon, UTF-8 mit/ohne BOM, Anführungszeichen. Excel: Tabelle aus dem Excel-Leser.
 * Kopfzeile = 37 Spalten (aktuell), 28 (Stand 21.11.2026) oder 27 (ohne answer_timestamp) in fester Reihenfolge.
 */

export interface CsvReadResult {
  candidates: Candidate[]
  findings: Finding[]
  /** true = Strukturfehler, Datei wird nicht weiter geprüft */
  aborted: boolean
  /** Datei enthält die Informationsfelder (37 Spalten); sonst bleiben die gespeicherten Werte erhalten (Refinement 2026-11-26) */
  hasInfoFields: boolean
}

const S = (message: string, line?: number): Finding => ({ severity: "fehler", group: "S", line, message })

export const NO_INFO_FIELDS_HINT = "Datei ohne Informationsfelder – gespeicherte Werte bleiben erhalten."

/** Spalten einer Datei vom Stand 21.–25.11.2026 (28 Spalten, ohne `dmc` und Informationsfelder) — weiterhin gültig (PROJ-10) */
export const LEGACY_28_COLUMNS: readonly string[] = CORE_FIELD_NAMES

/** Spalten einer CSV vom Stand vor dem 21.11.2026 (27 Spalten, ohne answer_timestamp) — weiterhin gültig (PROJ-10) */
export const LEGACY_CSV_COLUMNS: readonly string[] = CORE_FIELD_NAMES.filter((name) => name !== "answer_timestamp")

const NEW_COLUMNS: readonly string[] = [DMC_COLUMN, ...INFO_FIELD_NAMES]

/** true = Kopfzeile nutzt den aktuellen Aufbau (eine der neuen Spalten kommt vor → alle 37 erwartet, Refinement 2026-11-26) */
export const hasCurrentLayout = (header: string[]) => header.some((name) => NEW_COLUMNS.includes(name))

/** Erwartete Spaltenfolge zur Kopfzeile: aktuell (37), Stand 21.11. (28) oder alter Stand (27) */
export function expectedColumns(header: string[]): readonly string[] {
  if (hasCurrentLayout(header)) return ENTRY_FILE_COLUMNS
  return header.includes("answer_timestamp") ? LEGACY_28_COLUMNS : LEGACY_CSV_COLUMNS
}

/** Prüft die Kopfzeile; liefert Strukturfehler (leer = in Ordnung) */
export function checkHeader(header: string[]): Finding[] {
  const expected = expectedColumns(header)
  const findings: Finding[] = []
  const seen = new Set<string>()
  for (const name of header) {
    if (seen.has(name)) findings.push(S(`Spalte ‚${name}' kommt mehrfach vor.`, 1))
    seen.add(name)
    if (!expected.includes(name)) findings.push(S(`Unbekannte Spalte ‚${name || "(leer)"}'.`, 1))
  }
  for (const name of expected) {
    if (!seen.has(name)) findings.push(S(`Spalte ‚${name}' fehlt.`, 1))
  }
  if (findings.length === 0 && header.some((name, index) => name !== expected[index])) {
    findings.push(S(`Spalten in falscher Reihenfolge. Erwartet: ${expected.join(";")}`, 1))
  }
  return findings
}

/** Felder mit fester Länge, die nur Ziffern enthalten → fehlende führende Nullen werden aufgefüllt (PROJ-9) */
export const PADDED_FIELDS = { security: 2, issno: 3, day: 2, month: 2 } as const

export function padLeadingZeros(fields: EntryFields, line: number): { fields: EntryFields; hints: Finding[] } {
  const result = { ...fields }
  const hints: Finding[] = []
  for (const [name, length] of Object.entries(PADDED_FIELDS) as [keyof typeof PADDED_FIELDS, number][]) {
    const value = result[name]
    if (/^\d+$/.test(value) && value.length < length) {
      result[name] = value.padStart(length, "0")
      hints.push({
        severity: "hinweis",
        group: "A",
        line,
        dmc: formatDmc(result),
        field: name,
        message: `Führende Nullen ergänzt: ‚${value}' → ‚${result[name]}'.`,
      })
    }
  }
  return { fields: result, hints }
}

/** Herkunft der Tabelle: CSV (Formelschutz-Apostroph entfernen, feste Spaltenzahl) oder Excel (PROJ-10 Refinement 2026-11-25) */
export type TableSource = "csv" | "xlsx"

/** CSV zerlegen → Tabelle (Zeilennummer = Datensatz-Nummer, wie bisher) */
export function csvTable(text: string): SheetRow[] {
  const content = text.replace(/^\uFEFF/, "")
  const parsed = Papa.parse<string[]>(content, { delimiter: ";", skipEmptyLines: false })
  return parsed.data.map((cells, index) => ({ line: index + 1, cells }))
}

/** CSV-Leser für den Check-in (unverändertes Verhalten) */
export function readCheckinCsv(text: string): CsvReadResult {
  return readCheckinTable(csvTable(text), "csv")
}

/**
 * Gemeinsamer Schritt „Tabelle → Einträge" für CSV und Excel (PROJ-10 Tech Design J):
 * Kopfzeile (37, 28 bzw. alte 27 Spalten), Spaltenzahl, Trimmen, führende Nullen, leere Zeilen überspringen.
 * Excel lässt leere Zellen am Zeilenende weg — fehlende Zellen gelten dort als leer.
 */
export function readCheckinTable(rows: SheetRow[], source: TableSource): CsvReadResult {
  const isBlank = (row: SheetRow) => row.cells.every((cell) => cell.trim() === "")
  // Nach dem Kopf nur nicht leere Zeilen (leere Zeilen werden übersprungen)
  const headerIndex = rows.findIndex((row) => !isBlank(row))
  if (headerIndex === -1) return { candidates: [], findings: [S("Die Datei enthält keine Einträge.")], aborted: true, hasInfoFields: false }

  const header = rows[headerIndex].cells.map((cell) => cell.trim())
  const headerFindings = checkHeader(header)
  if (headerFindings.length > 0) return { candidates: [], findings: headerFindings, aborted: true, hasInfoFields: false }

  const columns = expectedColumns(header)
  const findings: Finding[] = []
  const candidates: Candidate[] = []
  rows.forEach((row, index) => {
    if (index <= headerIndex || isBlank(row)) return
    const { line } = row
    const width = source === "xlsx" ? Math.max(row.cells.length, columns.length) : row.cells.length
    if (width !== columns.length) {
      findings.push(S(`Zeile hat ${width} statt ${columns.length} Spalten.`, line))
      return
    }
    const fields = emptyEntryFields()
    columns.forEach((name, column) => {
      // `dmc` wird gelesen und verworfen — maßgeblich sind die DMC-Teile (Refinement 2026-11-26)
      if (name === DMC_COLUMN) return
      const value = (row.cells[column] ?? "").trim()
      // Entschärfung gegen Formel-Injection aus Check-out/Export rückgängig machen (BUG-QA2-1) — nur CSV
      fields[name as keyof EntryFields] = source === "csv" ? unguardCsvCell(value) : value
    })
    const padded = padLeadingZeros(fields, line)
    findings.push(...padded.hints)
    candidates.push({ line, fields: padded.fields })
  })

  if (candidates.length === 0 && !findings.some((f) => f.severity === "fehler")) {
    findings.push(S("Die Datei enthält keine Einträge."))
  }
  const hasInfoFields = hasCurrentLayout(header)
  if (!hasInfoFields) findings.push({ severity: "hinweis", group: "S", line: 1, message: NO_INFO_FIELDS_HINT })
  return { candidates, findings, aborted: false, hasInfoFields }
}
