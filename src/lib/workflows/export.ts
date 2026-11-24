import { canAccessDmrl } from "@/lib/auth/permissions"
import { writeDml } from "@/lib/data/dml-writer"
import { formatDate, latestSend } from "@/lib/data/queries"
import type { Dataset, DmlCode, DmlRef, Dmrl, EntrySnapshot, S1000dIssue, User } from "@/lib/data/schema"
import { compareByDmc } from "@/lib/dmrl/entries"
import { entriesTable, writeEntriesCsv } from "@/lib/files/csv-writer"
import { writeXlsx } from "@/lib/files/xlsx-writer"
import { presetSeqnum, sendDmlRef } from "./send"

/**
 * DMRL-Export (PROJ-18): liest nur, schreibt nichts in den Datenbestand
 * (keine Sperre, kein Status, kein Versionsindex, kein Archiv, kein Verlauf).
 */

export const NO_ENTRIES = "Die DMRL hat keine Einträge."

/** null = Export möglich — jederzeit, auch bei Sperre oder Status gesendet */
export function exportBlocked(dmrl: Dmrl, user: User | null): string | null {
  return canAccessDmrl(user, dmrl) ? null : "Keine Berechtigung für diese DMRL."
}

const pad = (n: number) => String(n).padStart(2, "0")
/** JJJJ-MM-TT (lokales Datum) */
export const isoDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const fileStem = (data: Dataset, dmrl: Dmrl) => {
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  const originator = data.organisations.find((o) => o.id === dmrl.originatorOrganisationId)
  return `DML-${system?.modelic ?? "DMRL"}-${originator?.code ?? "XXXXX"}-${dmrl.dmlType.toUpperCase()}`
}

/** CSV im Aufbau von PROJ-9: DML-{MI}-{CAGE}-{DML-Typ}-Export-{JJJJ-MM-TT}.csv */
export function exportCsv(data: Dataset, dmrl: Dmrl, at = new Date().toISOString()) {
  const entries = data.entries.filter((e) => e.dmrlId === dmrl.id)
  return { fileName: `${fileStem(data, dmrl)}-Export-${isoDate(at)}.csv`, content: writeEntriesCsv(entries) }
}

/** Blattname im Excel-Export (Refinement 2026-11-24) */
export const XLSX_SHEET_NAME = "Einträge"

/**
 * Excel im Aufbau des CSV-Exports (Refinement 2026-11-24): ein Blatt „Einträge", gleiche Spalten, Reihenfolge und Werte,
 * alle Zellen als Text — DML-{MI}-{CAGE}-{DML-Typ}-Export-{JJJJ-MM-TT}.xlsx
 */
export function exportXlsx(data: Dataset, dmrl: Dmrl, at = new Date().toISOString()) {
  const entries = data.entries.filter((e) => e.dmrlId === dmrl.id)
  return { fileName: `${fileStem(data, dmrl)}-Export-${isoDate(at)}.xlsx`, bytes: writeXlsx({ sheetName: XLSX_SHEET_NAME, ...entriesTable(entries) }) }
}

/**
 * Kopf-Variante „Export" des DML-Schreibers (gemeinsam für PROJ-18 und den Freigabestand PROJ-14):
 * Richtung send, issno 000 / inwork 01 (Arbeitsstand), Datum des Exports, ohne answer, Einträge nach DMC.
 */
export function writeExportDml(input: {
  dmrl: Dmrl
  issue: S1000dIssue
  dmlc: DmlCode
  dmlref: DmlRef
  remarks: string
  entries: Pick<EntrySnapshot, "fields">[]
  at: string
}): string {
  if (input.entries.length === 0) throw new Error(NO_ENTRIES)
  const date = new Date(input.at)
  return writeDml(
    {
      header: {
        direction: "send",
        dmlc: input.dmlc,
        issno: { issno: "000", inwork: "01", type: "new" },
        issdate: { day: pad(date.getDate()), month: pad(date.getMonth() + 1), year: String(date.getFullYear()) },
        security: input.dmrl.security,
        dmlref: input.dmlref,
        remarks: input.remarks,
      },
      entries: [...input.entries].sort(compareByDmc).map((e) => e.fields),
    },
    input.issue,
    { answers: false }
  )
}

/**
 * XML-Export des aktuellen Stands: dmlc = letzter nicht zurückgezogener SEND (ohne SEND: aktuelles Jahr und
 * vorgegebener Versionsindex erster SEND laut PROJ-6, sonst 00001),
 * dmlref wie beim nächsten SEND; Dateiname DML-{MI}-{CAGE}-{DML-Typ}-{Jahr}-{seqnum}_000-01.XML
 */
export function exportXml(data: Dataset, dmrl: Dmrl, at = new Date().toISOString()) {
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  if (!system) throw new Error("System der DMRL fehlt.")
  const originator = data.organisations.find((o) => o.id === dmrl.originatorOrganisationId)
  const send = latestSend(data, dmrl.id)
  const dmlc: DmlCode = send?.dmlc ?? {
    modelic: system.modelic,
    sendid: originator?.code ?? "",
    dmltype: dmrl.dmlType,
    diyear: String(new Date(at).getFullYear()),
    // Vorgabe erster SEND (PROJ-6); sonst 00001 — Schema: positiveInteger, 00000 ist ungültig (Entscheidung PO 2026-11-13)
    seqnum: presetSeqnum(data, dmrl, String(new Date(at).getFullYear())) ?? "00001",
  }
  const content = writeExportDml({
    dmrl,
    issue: system.s1000dIssue,
    dmlc,
    dmlref: sendDmlRef(data, dmrl, dmlc),
    remarks: `Export vom ${formatDate(at)} — kein offizieller Austauschstand`,
    entries: data.entries.filter((e) => e.dmrlId === dmrl.id),
    at,
  })
  const fileName = `DML-${dmlc.modelic}-${dmlc.sendid}-${dmlc.dmltype.toUpperCase()}-${dmlc.diyear}-${dmlc.seqnum}_000-01.XML`
  return { fileName, content, issue: system.s1000dIssue }
}
