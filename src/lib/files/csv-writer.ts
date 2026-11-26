import Papa from "papaparse"

import { DMC_COLUMN, ENTRY_FILE_COLUMNS, type EntryFieldName, type EntrySnapshot } from "@/lib/data/schema"
import { compareByDmc, formatDmc } from "@/lib/dmrl/entries"
import { guardCsvCell } from "./csv-formula"

/**
 * Gemeinsamer CSV-Schreiber (PROJ-9 Tech Design E; genutzt von PROJ-9/14/18):
 * alle Dateispalten (37: 28 Felder, `dmc`, 8 Informationsfelder — Refinement 2026-11-26) in fester Reihenfolge, Semikolon, UTF-8 mit BOM, Anführungszeichen nur wo nötig, sortiert nach DMC.
 * Werte, die Excel als Formel ausführen würde, werden entschärft (BUG-QA2-1, siehe csv-formula.ts).
 */
export const CSV_BOM = "﻿"

/**
 * Eintrags-Tabelle — gemeinsame Quelle für CSV- und Excel-Export (PROJ-18 Tech Design G):
 * alle Dateispalten in fester Reihenfolge, Einträge nach DMC sortiert, Werte unverändert (ohne CSV-Entschärfung).
 * `dmc` wird je Zeile aus den DMC-Teilen gebildet, nie gespeichert (PROJ-9 Refinement 2026-11-26).
 */
export function entriesTable(
  entries: Pick<EntrySnapshot, "fields">[],
  columns: readonly (EntryFieldName | typeof DMC_COLUMN)[] = ENTRY_FILE_COLUMNS
): { header: string[]; rows: string[][] } {
  return {
    header: [...columns],
    rows: [...entries]
      .sort(compareByDmc)
      .map((entry) => columns.map((name) => (name === DMC_COLUMN ? formatDmc(entry.fields) : (entry.fields[name] ?? "")))),
  }
}

export function writeEntriesCsv(
  entries: Pick<EntrySnapshot, "fields">[],
  columns: readonly (EntryFieldName | typeof DMC_COLUMN)[] = ENTRY_FILE_COLUMNS
): string {
  const table = entriesTable(entries, columns)
  const rows = table.rows.map((values) => values.map(guardCsvCell))
  const body = Papa.unparse({ fields: table.header, data: rows }, { delimiter: ";", newline: "\r\n", quotes: false })
  return CSV_BOM + body + "\r\n"
}

/** Allgemeine Tabelle als Excel-taugliche CSV (z. B. Prüfbericht) */
export function writeTableCsv(header: string[], rows: string[][]): string {
  return CSV_BOM + Papa.unparse({ fields: header, data: rows.map((row) => row.map(guardCsvCell)) }, { delimiter: ";", newline: "\r\n", quotes: false }) + "\r\n"
}
