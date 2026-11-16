import { DmlParseError, readDml, type ParsedDml } from "@/lib/data/dml-reader"
import type { DmlCode, S1000dIssue } from "@/lib/data/schema"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { checkFormats, checkInfocodeInfoname, checkMandatory, checkSnsTechname, checkUniqueDmc, OPTIONAL_IN_REPLY } from "@/lib/rules/check/entry-rules"
import type { Candidate, Finding, Report } from "@/lib/rules/check/types"
import { formatDmc } from "@/lib/dmrl/entries"
import { deriveIssueType } from "@/lib/dmrl/issue-type"
import { acceptXmlUpload, unavailableDetail, validateXml, xsdResultToReport } from "@/lib/xsd/client"
import type { XsdResult } from "@/lib/xsd/types"
import { readReplyFile } from "./reply"

/**
 * Prüfkern „XML prüfen" (PROJ-20 Tech Design C/E): XSD (PROJ-11) → Lesen in deklarierter Kodierung →
 * DML-Leser der gewählten Issue → Regeln wie Check-in (A, B, C, E, I) + „MI einheitlich" statt Regel D;
 * Pflichtfelder wie REPLY (Ausgabedaten optional, Sammelhinweis).
 * Refinement 2/3 (2026-11-16): ist der Ausgabetyp `addresdm/issno/@type` leer, erhält die CSV ergänzte Ausgabedaten —
 * Ausgabetyp aus dem Eintragstyp abgeleitet (Prüfung auf Originaldaten).
 * Ohne Bildschirmbezug und ohne Datenbestand. Speichert nichts.
 */

export const XSD_NOT_PERFORMED = "XSD-Prüfung nicht durchgeführt"
export const ISSUE_MISMATCH = "Datei passt nicht zur gewählten Issue — bitte Issue prüfen."
export const CSV_HAS_ERRORS = "Die CSV enthält Fehler aus der Prüfung — ein Check-in wird abgewiesen, bis sie behoben sind."
export const CSV_WITHOUT_XSD = "Die XSD-Prüfung wurde nicht durchgeführt — der Check-in in eine DMRL prüft die Einträge erneut."
export const MI_NOT_UNIFORM = "uneinheitlich"
export const issueDataMissing = (count: number) =>
  `Bei ${count} ${count === 1 ? "Eintrag fehlen" : "Einträgen fehlen"} Ausgabedaten (Ausgabenummer, Ausgabetyp, Datum) — beim Check-in sind sie Pflicht.`

/** Standardwerte für fehlende Ausgabedaten (Refinement 2/3, 2026-11-16) */
export const DEFAULT_ISSNO = "001"
export const DEFAULT_ENTRY_TYPE = "n"

/** Ableitung Ausgabetyp aus dem Eintragstyp (Refinement 3); leerer oder unbekannter Eintragstyp → `new` — gemeinsam mit PROJ-1/PROJ-10 */
export { DEFAULT_ISSUE_TYPE, deriveIssueType } from "@/lib/dmrl/issue-type"

export interface CheckDate {
  day: string
  month: string
  year: string
}

/** Lokales Datum als TT/MM/JJJJ (führende Nullen) */
export function toCheckDate(date: Date): CheckDate {
  const pad = (n: number, width: number) => String(n).padStart(width, "0")
  return { day: pad(date.getDate(), 2), month: pad(date.getMonth() + 1, 2), year: pad(date.getFullYear(), 4) }
}

export const issueDataFilled = (count: number, date: CheckDate) =>
  `Bei ${count} ${count === 1 ? "Eintrag fehlten" : "Einträgen fehlten"} Ausgabedaten — in der CSV ergänzt: Ausgabetyp aus dem Eintragstyp (n → new, c → changed, d → deleted; ohne Eintragstyp new und Eintragstyp n), Ausgabenummer ${DEFAULT_ISSNO} und Datum ${date.day}.${date.month}.${date.year} (nur wo leer).`

export type XsdState = "bestanden" | "schemafehler" | "nicht_wohlgeformt" | "nicht_durchgefuehrt"

export interface XmlCheckSummary {
  /** MI aller Einträge, „uneinheitlich" oder leer (keine Einträge) */
  modelic: string
  entries: number
  freigegeben: number
  zuUeberarbeiten: number
  ohneAntwort: number
}

export interface XmlCheckResult {
  fileName: string
  issue: S1000dIssue
  xsd: XsdState
  /** nur bei XSD „nicht durchgeführt": Grund (deutsch) */
  xsdUnavailableDetail?: string
  /** Kopfdaten und Einträge — null, wenn die Datei nicht lesbar ist */
  parsed: ParsedDml | null
  candidates: Candidate[]
  report: Report
  summary: XmlCheckSummary
  /** CSV im Check-out-Format (mit ergänzten Ausgabedaten) — null, wenn die Datei nicht lesbar ist */
  csv: string | null
  /** Anzahl Einträge, deren Ausgabedaten in der CSV ergänzt wurden */
  filledEntries: number
  /** Datum der Prüfung (für ergänzte Ausgabedaten) */
  checkDate: CheckDate
}

export type XmlCheckOutcome = { ok: true; result: XmlCheckResult } | { ok: false; message: string }

const finding = (group: Finding["group"], message: string, extra: Partial<Finding> = {}): Finding => ({ severity: "fehler", group, message, ...extra })

/** „MI einheitlich" (statt Regel D): häufigster MI ist der Datei-MI, abweichende Einträge erhalten je einen Befund */
export function checkModelicUniform(candidates: Candidate[]): { modelic: string; findings: Finding[] } {
  const counts = new Map<string, number>()
  for (const c of candidates) {
    if (c.fields.modelic !== "") counts.set(c.fields.modelic, (counts.get(c.fields.modelic) ?? 0) + 1)
  }
  if (counts.size === 0) return { modelic: "", findings: [] }
  // bei Gleichstand gilt der zuerst vorkommende MI
  const [major] = [...counts.entries()].reduce((best, current) => (current[1] > best[1] ? current : best))
  if (counts.size === 1) return { modelic: major, findings: [] }
  const findings = candidates
    .filter((c) => c.fields.modelic !== "" && c.fields.modelic !== major)
    .map((c) =>
      finding("D", `MI uneinheitlich: ‚${c.fields.modelic}' statt ‚${major}' (häufigster MI der Datei).`, { line: c.line, dmc: formatDmc(c.fields), field: "modelic" })
    )
  return { modelic: MI_NOT_UNIFORM, findings }
}

/** Auslöser für die Ergänzung (Refinement 3): Ausgabetyp leer — egal ob die Ausgabenummer vorhanden ist */
export const needsIssueData = (c: Candidate) => c.fields.type === ""

/**
 * Ergänzt fehlende Ausgabedaten für die CSV (Refinement 2/3): nur bei leerem Ausgabetyp. Ausgabetyp aus dem Eintragstyp
 * abgeleitet; Ausgabenummer nur, wenn leer; Datum nur, wenn Tag/Monat/Jahr alle leer; Eintragstyp nur, wenn leer.
 * Vorhandene Werte werden nie überschrieben. Liefert Kopien, Originale bleiben.
 */
export function fillIssueData(candidates: Candidate[], date: CheckDate): { candidates: Candidate[]; filled: number } {
  let filled = 0
  const result = candidates.map((c) => {
    if (!needsIssueData(c)) return c
    filled++
    const f = c.fields
    const dateEmpty = f.day === "" && f.month === "" && f.year === ""
    return {
      ...c,
      fields: {
        ...f,
        issno: f.issno === "" ? DEFAULT_ISSNO : f.issno,
        type: deriveIssueType(f.dmentryType),
        ...(dateEmpty ? date : {}),
        dmentryType: f.dmentryType === "" ? DEFAULT_ENTRY_TYPE : f.dmentryType,
      },
    }
  })
  return { candidates: result, filled }
}

/**
 * Hinweise zu Ausgabedaten (in DMRL-XML optional): ein Hinweis für ergänzte Einträge (Ausgabetyp leer), ein Sammelhinweis
 * für Einträge mit Ausgabetyp, aber fehlender Ausgabenummer oder fehlendem Datum — keine Pflichtfeld-Fehler
 */
export function checkIssueDataHint(candidates: Candidate[], date: CheckDate): Finding[] {
  const filled = candidates.filter(needsIssueData).length
  const missing = candidates.filter((c) => !needsIssueData(c) && OPTIONAL_IN_REPLY.some((field) => c.fields[field] === "")).length
  const hints: Finding[] = []
  if (filled > 0) hints.push({ severity: "hinweis", group: "B", message: issueDataFilled(filled, date) })
  if (missing > 0) hints.push({ severity: "hinweis", group: "B", message: issueDataMissing(missing) })
  return hints
}

export function xmlCheckSummary(candidates: Candidate[], modelic: string): XmlCheckSummary {
  const freigegeben = candidates.filter((c) => c.fields.answer === "y").length
  const zuUeberarbeiten = candidates.filter((c) => c.fields.answer === "n").length
  return { modelic, entries: candidates.length, freigegeben, zuUeberarbeiten, ohneAntwort: candidates.length - freigegeben - zuUeberarbeiten }
}

const EMPTY_SUMMARY: XmlCheckSummary = { modelic: "", entries: 0, freigegeben: 0, zuUeberarbeiten: 0, ohneAntwort: 0 }

const XSD_STATE: Record<XsdResult["state"], XsdState> = {
  gueltig: "bestanden",
  schemafehler: "schemafehler",
  nicht_wohlgeformt: "nicht_wohlgeformt",
  nicht_verfuegbar: "nicht_durchgefuehrt",
}

/** Prüfung des Dateitextes nach vorliegendem XSD-Ergebnis (rein, ohne Netz) */
export function checkXmlText(
  fileName: string,
  issue: S1000dIssue,
  text: string,
  xsdResult: XsdResult,
  now: Date = new Date()
): XmlCheckResult {
  const checkDate = toCheckDate(now)
  const xsd = XSD_STATE[xsdResult.state]
  const xsdFindings = xsdResultToReport(xsdResult).findings
  const xsdUnavailableDetail = xsdResult.state === "nicht_verfuegbar" ? unavailableDetail(xsdResult.reason) : undefined
  if (xsdUnavailableDetail) {
    xsdFindings.push({ severity: "hinweis", group: "XSD", message: `${XSD_NOT_PERFORMED} — ${xsdUnavailableDetail}` })
  }
  const base = { fileName, issue, xsd, xsdUnavailableDetail, checkDate }
  const unreadable = (findings: Finding[]): XmlCheckResult => ({
    ...base,
    parsed: null,
    candidates: [],
    report: { lineLabel: "Zeile / Eintrag", findings },
    summary: EMPTY_SUMMARY,
    csv: null,
    filledEntries: 0,
  })

  if (xsd === "nicht_wohlgeformt") return unreadable(xsdFindings)

  let parsed: ParsedDml
  try {
    parsed = readDml(text, issue)
  } catch (error) {
    const detail = error instanceof DmlParseError ? error.message : "unbekannter Lesefehler"
    const message =
      detail === "XML ist nicht wohlgeformt"
        ? "Die Datei ist kein gültiges XML — sie kann nicht gelesen werden."
        : `${ISSUE_MISMATCH} Die Datei kann mit dem Leser für S1000D Issue ${issue} nicht gelesen werden (${detail}).`
    return unreadable([...xsdFindings, finding("S", message)])
  }

  const candidates = parsed.entries.map((fields, index) => ({ line: index + 1, fields }))
  const mi = checkModelicUniform(candidates)
  const findings = [
    ...xsdFindings,
    ...checkFormats(candidates),
    // Pflichtfelder wie beim REPLY-Import: Ausgabedaten optional, angefangenes Datum vollständig
    ...checkMandatory(candidates, "reply"),
    ...checkIssueDataHint(candidates, checkDate),
    ...checkUniqueDmc(candidates),
    ...mi.findings,
    ...checkSnsTechname(candidates),
    ...checkInfocodeInfoname(candidates),
  ]
  // Ergänzung nur für die CSV; Bericht und Zusammenfassung beruhen auf den Originaldaten
  const filled = fillIssueData(candidates, checkDate)
  return {
    ...base,
    parsed,
    candidates,
    report: { lineLabel: "Zeile / Eintrag", findings },
    summary: xmlCheckSummary(candidates, mi.modelic),
    csv: writeEntriesCsv(filled.candidates),
    filledEntries: filled.filled,
  }
}

/** Vollständiger Ablauf für eine ausgewählte Datei; `validate` austauschbar für Tests */
export async function runXmlCheck(file: File, issue: S1000dIssue, validate: typeof validateXml = validateXml): Promise<XmlCheckOutcome> {
  const accepted = acceptXmlUpload(file)
  if (!accepted.ok) return accepted
  const xsdResult = await validate(file, issue)
  // nicht wohlgeformt: Bericht laut xmllint, Datei wird nicht gelesen
  if (xsdResult.state === "nicht_wohlgeformt") return { ok: true, result: checkXmlText(file.name, issue, "", xsdResult) }
  const read = await readReplyFile(file)
  if (!read.ok) return read
  return { ok: true, result: checkXmlText(file.name, issue, read.text, xsdResult) }
}

/** CSV-Dateiname = Name der XML-Datei mit Endung .csv */
export function xmlCsvFileName(xmlFileName: string): string {
  return `${xmlFileName.replace(/\.xml$/i, "")}.csv`
}

export const formatDmlCode = (dmlc: DmlCode) => `DML-${dmlc.modelic}-${dmlc.sendid}-${dmlc.dmltype.toUpperCase()}-${dmlc.diyear}-${dmlc.seqnum}`

/** Gegenstand für den Dateinamen des Prüfberichts (Name der XML-Datei ohne Endung) */
export const xmlReportSubject = (xmlFileName: string) => `XML-${xmlFileName.replace(/\.xml$/i, "")}`
