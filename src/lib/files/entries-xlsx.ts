import type { EntrySnapshot } from "@/lib/data/schema"
import { entriesTable } from "@/lib/files/csv-writer"
import { writeXlsx } from "@/lib/files/xlsx-writer"

/**
 * Gemeinsamer Baustein „Einträge als Excel" (PROJ-9 Tech Design I, PROJ-18):
 * ein Blatt „Einträge", Spalten und DMC-Sortierung wie der CSV-Schreiber, alle Zellen als Text.
 * Genutzt von Excel-Export (PROJ-18) und Check-out (PROJ-9); der Excel-Leser des Check-ins (PROJ-10) sucht dasselbe Blatt.
 */

export const ENTRIES_SHEET_NAME = "Einträge"

export function writeEntriesXlsx(entries: Pick<EntrySnapshot, "fields">[]): Uint8Array {
  return writeXlsx({ sheetName: ENTRIES_SHEET_NAME, ...entriesTable(entries) })
}
