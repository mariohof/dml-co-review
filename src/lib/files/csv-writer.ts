import Papa from "papaparse"

import { ENTRY_FIELD_NAMES, type EntrySnapshot } from "@/lib/data/schema"
import { compareByDmc } from "@/lib/dmrl/entries"
import { guardCsvCell } from "./csv-formula"

/**
 * Gemeinsamer CSV-Schreiber (PROJ-9 Tech Design E; genutzt von PROJ-9/14/18):
 * alle Eintragsfelder (28 Spalten) in fester Reihenfolge, Semikolon, UTF-8 mit BOM, Anführungszeichen nur wo nötig, sortiert nach DMC.
 * Werte, die Excel als Formel ausführen würde, werden entschärft (BUG-QA2-1, siehe csv-formula.ts).
 */
export const CSV_BOM = "﻿"

/**
 * Eintrags-Tabelle — gemeinsame Quelle für CSV- und Excel-Export (PROJ-18 Tech Design G):
 * alle Eintragsfelder in fester Reihenfolge, Einträge nach DMC sortiert, Werte unverändert (ohne CSV-Entschärfung).
 */
export function entriesTable(entries: Pick<EntrySnapshot, "fields">[]): { header: string[]; rows: string[][] } {
  return {
    header: [...ENTRY_FIELD_NAMES],
    rows: [...entries].sort(compareByDmc).map((entry) => ENTRY_FIELD_NAMES.map((name) => entry.fields[name] ?? "")),
  }
}

export function writeEntriesCsv(entries: Pick<EntrySnapshot, "fields">[]): string {
  const table = entriesTable(entries)
  const rows = table.rows.map((values) => values.map(guardCsvCell))
  const body = Papa.unparse({ fields: table.header, data: rows }, { delimiter: ";", newline: "\r\n", quotes: false })
  return CSV_BOM + body + "\r\n"
}

/** Allgemeine Tabelle als Excel-taugliche CSV (z. B. Prüfbericht) */
export function writeTableCsv(header: string[], rows: string[][]): string {
  return CSV_BOM + Papa.unparse({ fields: header, data: rows.map((row) => row.map(guardCsvCell)) }, { delimiter: ";", newline: "\r\n", quotes: false }) + "\r\n"
}
