import { ENTRIES_SHEET_NAME } from "@/lib/files/entries-xlsx"
import { readXlsxSheet, type SheetRow } from "@/lib/files/xlsx-reader"
import type { CheckinInput } from "@/lib/rules/check/checkin"
import { readCheckinTable } from "@/lib/rules/check/csv-reader"

/**
 * Testhilfen für die Excel-Datei des Werkzeugs (PROJ-20 Refinement 2026-11-26 (3)):
 * liest die Datei auf demselben Weg wie der Check-in (Blatt „Einträge“, Excel-Zweig des Tabellenlesers).
 */

/** Alle Zeilen des Blatts „Einträge“ (Zeile 1 = Kopfzeile) */
export function toolXlsxRows(bytes: Uint8Array): SheetRow[] {
  const sheet = readXlsxSheet(bytes, ENTRIES_SHEET_NAME)
  if (!sheet.ok) throw new Error(`Excel-Datei des Werkzeugs nicht lesbar: ${sheet.reason}`)
  return sheet.rows
}

/** Kopfzeile der Excel-Datei */
export const toolXlsxHeader = (bytes: Uint8Array): string[] => toolXlsxRows(bytes)[0]?.cells ?? []

/** Eingabe für runCheckinCheck wie beim Check-in einer .xlsx */
export const toolXlsxInput = (bytes: Uint8Array): CheckinInput => ({ source: "xlsx", rows: toolXlsxRows(bytes) })

/** Einträge wie vom Check-in gelesen */
export const readToolXlsx = (bytes: Uint8Array) => readCheckinTable(toolXlsxRows(bytes), "xlsx")
