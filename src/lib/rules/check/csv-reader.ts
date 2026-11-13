import Papa from "papaparse"

import { emptyEntryFields, ENTRY_FIELD_NAMES, type EntryFields } from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import type { Candidate, Finding } from "./types"

/**
 * CSV-Leser für den Check-in (PROJ-8 Gruppe S, Tech Design B).
 * Semikolon, UTF-8 mit/ohne BOM, Anführungszeichen; Kopfzeile = 27 Feldnamen in fester Reihenfolge.
 */

export interface CsvReadResult {
  candidates: Candidate[]
  findings: Finding[]
  /** true = Strukturfehler, Datei wird nicht weiter geprüft */
  aborted: boolean
}

const S = (message: string, line?: number): Finding => ({ severity: "fehler", group: "S", line, message })

/** Prüft die Kopfzeile; liefert Strukturfehler (leer = in Ordnung) */
export function checkHeader(header: string[]): Finding[] {
  const expected = ENTRY_FIELD_NAMES as readonly string[]
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

export function readCheckinCsv(text: string): CsvReadResult {
  const content = text.replace(/^﻿/, "")
  const parsed = Papa.parse<string[]>(content, { delimiter: ";", skipEmptyLines: false })
  const rows = parsed.data
  // Nach dem Kopf nur nicht leere Zeilen (leere Zeilen werden übersprungen)
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.trim() !== ""))
  if (headerIndex === -1) return { candidates: [], findings: [S("Die Datei enthält keine Einträge.")], aborted: true }

  const header = rows[headerIndex].map((cell) => cell.trim())
  const headerFindings = checkHeader(header)
  if (headerFindings.length > 0) return { candidates: [], findings: headerFindings, aborted: true }

  const findings: Finding[] = []
  const candidates: Candidate[] = []
  rows.forEach((row, index) => {
    if (index <= headerIndex || row.every((cell) => cell.trim() === "")) return
    const line = index + 1
    if (row.length !== ENTRY_FIELD_NAMES.length) {
      findings.push(S(`Zeile hat ${row.length} statt ${ENTRY_FIELD_NAMES.length} Spalten.`, line))
      return
    }
    const fields = emptyEntryFields()
    ENTRY_FIELD_NAMES.forEach((name, column) => {
      fields[name] = (row[column] ?? "").trim()
    })
    const padded = padLeadingZeros(fields, line)
    findings.push(...padded.hints)
    candidates.push({ line, fields: padded.fields })
  })

  if (candidates.length === 0 && !findings.some((f) => f.severity === "fehler")) {
    findings.push(S("Die Datei enthält keine Einträge."))
  }
  return { candidates, findings, aborted: false }
}
