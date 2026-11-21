import { ENTRY_FIELD_NAMES, type EntryFields, type EntrySnapshot } from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { allowedIssueTypes, ISSUE_TYPES } from "@/lib/dmrl/issue-type"
import { readCheckinCsv } from "./csv-reader"
import { checkCommon } from "./entry-rules"
import type { Candidate, Finding, Report } from "./types"

/**
 * Check-in-Prüfung (PROJ-8 Gruppen S, A–E, I, F) inkl. Abgleich mit dem Stand beim Check-out (PROJ-10).
 * Gruppe K liefert seit dem Refinement 2026-11-14 keine Fehler mehr, sondern die abweichenden Empfängerantworten
 * zur optionalen Übernahme (PROJ-10 Tech Design I).
 */

export type Classification = "neu" | "geaendert" | "unveraendert"

export interface ComparedEntry {
  candidate: Candidate
  classification: Classification
  /** Eintrag aus dem Stand beim Check-out (bei neu: null) */
  previous: EntrySnapshot | null
  /** geänderte Felder (inkl. Eintragstyp, ohne Antwortfelder) */
  changedFields: (keyof EntryFields)[]
  /** answer/answer_comment weichen vom Stand beim Check-out ab (bei neuen Einträgen: nicht leer) */
  answerChanged: boolean
}

/** Antwortfelder — werden getrennt von den übrigen Feldern abgeglichen (Refinement 2026-11-14) */
export const ANSWER_FIELDS = ["answer", "answer_comment"] as const satisfies readonly (keyof EntryFields)[]
const isAnswerField = (name: keyof EntryFields) => (ANSWER_FIELDS as readonly string[]).includes(name)
/** answer_timestamp aus der Datei wird nie übernommen und nie verglichen (PROJ-10, Refinement 2026-11-21) */
const isIgnoredField = (name: keyof EntryFields) => name === "answer_timestamp"

export interface Comparison {
  entries: ComparedEntry[]
  /** bisherige Einträge, die in der Datei fehlen */
  missing: EntrySnapshot[]
}

/** Abgleich Datei ↔ Stand beim Check-out; Zuordnung über den DMC (einmal berechnet, PROJ-10 Tech Design C) */
export function compareWithSnapshot(snapshot: EntrySnapshot[], candidates: Candidate[]): Comparison {
  const previousByDmc = new Map(snapshot.map((entry) => [formatDmc(entry.fields), entry]))
  const seen = new Set<string>()
  const entries = candidates.map((candidate): ComparedEntry => {
    const dmc = formatDmc(candidate.fields)
    const previous = seen.has(dmc) ? null : (previousByDmc.get(dmc) ?? null)
    seen.add(dmc)
    if (!previous) {
      return { candidate, classification: "neu", previous: null, changedFields: [], answerChanged: ANSWER_FIELDS.some((f) => candidate.fields[f] !== "") }
    }
    const changedFields = ENTRY_FIELD_NAMES.filter((name) => !isAnswerField(name) && !isIgnoredField(name) && candidate.fields[name] !== previous.fields[name])
    const answerChanged = ANSWER_FIELDS.some((f) => candidate.fields[f] !== previous.fields[f])
    return { candidate, classification: changedFields.length > 0 ? "geaendert" : "unveraendert", previous, changedFields, answerChanged }
  })
  const missing = snapshot.filter((entry) => !seen.has(formatDmc(entry.fields)))
  return { entries, missing }
}

/** Fachliche Felder = alle außer Eintragstyp und Antwortfeldern */
const NON_BUSINESS: (keyof EntryFields)[] = ["dmentryType", "answer", "answer_comment", "answer_timestamp"]

export const IN_PROGRESS_WITHOUT_TYPE = "Eintrag in Bearbeitung braucht einen Eintragstyp (n, c oder d) — sonst kann er nicht gesendet werden."

/**
 * Gruppe F — Eintragstyp plausibel (manuell gesetzt).
 * Neue Einträge dürfen jeden Eintragstyp haben (Refinement 2026-11-18, „Bestand übernehmen"): mit n/c/d → *in Bearbeitung*,
 * ohne Eintragstyp → *freigegeben* (siehe `releasedOnTakeover`).
 * Grundsatz (Refinement 2026-11-14, BUG-QA4-1): Nach dem Check-in gibt es keinen Eintrag *in Bearbeitung* ohne Eintragstyp —
 * SEND nimmt nur Einträge mit n/c/d mit. Betrifft geänderte Einträge (auch nur Eintragstyp entfernt) und unveränderten
 * Altbestand, der bereits *in Bearbeitung* ohne Eintragstyp ist. Unveränderte freigegebene Einträge ohne Typ bleiben erlaubt.
 */
export function checkEntryTypes(comparison: Comparison): Finding[] {
  const findings: Finding[] = []
  for (const { candidate: c, classification, changedFields, previous } of comparison.entries) {
    const dmc = formatDmc(c.fields)
    const withoutType = c.fields.dmentryType === ""
    if (classification === "geaendert" && withoutType) {
      const businessChange = changedFields.some((f) => !NON_BUSINESS.includes(f))
      const message = businessChange ? "Geänderter Eintrag ohne Eintragstyp (n, c oder d setzen)." : IN_PROGRESS_WITHOUT_TYPE
      findings.push({ severity: "fehler", group: "F", line: c.line, dmc, field: "dmentryType", message })
    }
    if (classification === "unveraendert" && withoutType && previous?.status === "in_bearbeitung") {
      findings.push({ severity: "fehler", group: "F", line: c.line, dmc, field: "dmentryType", message: IN_PROGRESS_WITHOUT_TYPE })
    }
  }
  findings.push(...checkIssueTypeMatchesEntryType(comparison))
  for (const entry of comparison.missing) {
    const dmc = formatDmc(entry.fields)
    findings.push({ severity: "fehler", group: "F", dmc, message: `Eintrag ${dmc} fehlt — Einträge können nicht entfernt werden (Löschung über Eintragstyp ‚d' bzw. DM-Ausgabetyp ‚deleted').` })
  }
  return findings
}

const quoteList = (values: readonly string[]) => {
  const quoted = values.map((v) => `‚${v}‘`)
  return quoted.length > 1 ? `${quoted.slice(0, -1).join(", ")} oder ${quoted[quoted.length - 1]}` : quoted[0]
}

/** Meldung der Typ-Regel, z. B. „Eintragstyp ‚d‘ verlangt DM-Ausgabetyp ‚deleted‘ — gefunden: ‚new‘" */
export const issueTypeMismatch = (entryType: string, found: string) =>
  `Eintragstyp ‚${entryType}‘ verlangt DM-Ausgabetyp ${quoteList(allowedIssueTypes(entryType) ?? [])} — gefunden: ‚${found}‘`

/**
 * Gruppe F — Eintragstyp ↔ DM-Ausgabetyp (Refinement 2026-11-16, nur Check-in): n → new; c → changed/revised/status;
 * d → deleted; ohne Eintragstyp keine Prüfung. Gilt für alle Einträge der Datei (auch unveränderten Altbestand).
 * Ungültige Werte (Eintragstyp oder Ausgabetyp) meldet nur Regel A; leerer Ausgabetyp nur Regel B.
 */
export function checkIssueTypeMatchesEntryType(comparison: Comparison): Finding[] {
  const findings: Finding[] = []
  for (const { candidate: c } of comparison.entries) {
    const { dmentryType, type } = c.fields
    const allowed = allowedIssueTypes(dmentryType)
    if (!allowed || !(ISSUE_TYPES as readonly string[]).includes(type) || allowed.includes(type)) continue
    findings.push({ severity: "fehler", group: "F", line: c.line, dmc: formatDmc(c.fields), field: "type", message: issueTypeMismatch(dmentryType, type) })
  }
  return findings
}

/** Gruppe K — abweichende Empfängerantworten (kein Fehler; Übernahme nur nach Abfrage, PROJ-10) */
export const answerDeviations = (comparison: Comparison): ComparedEntry[] => comparison.entries.filter((e) => e.answerChanged)

/**
 * Bedingte Sperre „Eintragstyp bei Antwortübernahme": Einträge ohne Eintragstyp, bei denen nur die Antwort abweicht.
 * Würden ihre Antworten übernommen, wären sie *in Bearbeitung*, könnten aber nie gesendet und freigegeben werden.
 */
export const answerTakeoverBlockers = (comparison: Comparison): ComparedEntry[] =>
  comparison.entries.filter((e) => e.answerChanged && e.classification === "unveraendert" && e.candidate.fields.dmentryType === "")

export const ANSWER_TAKEOVER_BLOCKED =
  "Eintragstyp setzen (n, c oder d), damit der Eintrag erneut gesendet werden kann — Datei korrigieren oder Antworten nicht übernehmen."

/**
 * Bestand übernehmen (Refinement 2026-11-18): neue Einträge ohne Eintragstyp gelten als mit dem Empfänger abgestimmt
 * und werden beim Check-in *freigegeben*. Maßgeblich ist allein der fehlende Eintragstyp, nicht `answer`.
 */
export const isReleasedOnTakeover = (entry: ComparedEntry): boolean =>
  entry.classification === "neu" && entry.candidate.fields.dmentryType === ""

export const releasedOnTakeover = (comparison: Comparison): ComparedEntry[] => comparison.entries.filter(isReleasedOnTakeover)

/** Wirksame Einordnung: mit Antwortübernahme zählt eine reine Antwortabweichung als Änderung */
export const effectiveClassification = (entry: ComparedEntry, takeAnswers: boolean): Classification =>
  takeAnswers && entry.answerChanged && entry.classification === "unveraendert" ? "geaendert" : entry.classification

export interface CheckinSummary {
  geprueft: number
  neu: number
  geaendert: number
  unveraendert: number
  loeschungen: number
  /** davon neue Einträge ohne Eintragstyp, die als *freigegeben* übernommen werden (Refinement 2026-11-18) */
  alsFreigegeben: number
}

/** Zahlen der Zusammenfassung — ohne bzw. mit Übernahme der Empfängerantworten (aus demselben Abgleich) */
export function checkinSummary(candidates: Candidate[], comparison: Comparison | null, takeAnswers = false): CheckinSummary {
  const entries = comparison?.entries ?? []
  const count = (k: Classification) => entries.filter((e) => effectiveClassification(e, takeAnswers) === k).length
  return {
    geprueft: candidates.length,
    neu: count("neu"),
    geaendert: count("geaendert"),
    unveraendert: count("unveraendert"),
    loeschungen: candidates.filter((c) => c.fields.dmentryType === "d").length,
    alsFreigegeben: entries.filter(isReleasedOnTakeover).length,
  }
}

export interface CheckinContext {
  systemModelic: string
  /** Stand der Einträge beim Check-out (Kopie in der Sperre) */
  snapshot: EntrySnapshot[]
}

export interface CheckinResult {
  report: Report
  candidates: Candidate[]
  /** nur ohne Strukturfehler vorhanden */
  comparison: Comparison | null
  /** Zahlen ohne Übernahme der Empfängerantworten (Standard) */
  summary: CheckinSummary
}

export function runCheckinCheck(csvText: string, context: CheckinContext): CheckinResult {
  const read = readCheckinCsv(csvText)
  if (read.aborted) {
    return { report: { lineLabel: "Zeile", findings: read.findings }, candidates: [], comparison: null, summary: checkinSummary([], null) }
  }
  const comparison = compareWithSnapshot(context.snapshot, read.candidates)
  const findings = [
    ...read.findings,
    ...checkCommon(read.candidates, "checkin", context.systemModelic),
    ...checkEntryTypes(comparison),
  ]
  return {
    report: { lineLabel: "Zeile", findings },
    candidates: read.candidates,
    comparison,
    summary: checkinSummary(read.candidates, comparison),
  }
}
