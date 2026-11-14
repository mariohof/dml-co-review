import { ENTRY_FIELD_NAMES, type EntryFields, type EntrySnapshot } from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { readCheckinCsv } from "./csv-reader"
import { checkCommon } from "./entry-rules"
import type { Candidate, Finding, Report } from "./types"

/**
 * Check-in-Prüfung (PROJ-8 Gruppen S, A–E, I, F) inkl. Abgleich mit dem Stand beim Check-out (PROJ-10).
 * Gruppe K liefert seit dem Refinement 2026-11-14 keine Fehler mehr, sondern die abweichenden Partnerantworten
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
    const changedFields = ENTRY_FIELD_NAMES.filter((name) => !isAnswerField(name) && candidate.fields[name] !== previous.fields[name])
    const answerChanged = ANSWER_FIELDS.some((f) => candidate.fields[f] !== previous.fields[f])
    return { candidate, classification: changedFields.length > 0 ? "geaendert" : "unveraendert", previous, changedFields, answerChanged }
  })
  const missing = snapshot.filter((entry) => !seen.has(formatDmc(entry.fields)))
  return { entries, missing }
}

/** Fachliche Felder = alle außer Eintragstyp und Antwortfeldern */
const NON_BUSINESS: (keyof EntryFields)[] = ["dmentryType", "answer", "answer_comment"]

/** Gruppe F — Eintragstyp plausibel (manuell gesetzt) */
export function checkEntryTypes(comparison: Comparison): Finding[] {
  const findings: Finding[] = []
  for (const { candidate: c, classification, changedFields } of comparison.entries) {
    const dmc = formatDmc(c.fields)
    if (classification === "neu" && c.fields.dmentryType !== "n") {
      findings.push({ severity: "fehler", group: "F", line: c.line, dmc, field: "dmentryType", message: "Neuer Eintrag muss Eintragstyp ‚n' haben." })
    }
    if (classification === "geaendert" && c.fields.dmentryType === "" && changedFields.some((f) => !NON_BUSINESS.includes(f))) {
      findings.push({ severity: "fehler", group: "F", line: c.line, dmc, field: "dmentryType", message: "Geänderter Eintrag ohne Eintragstyp (n, c oder d setzen)." })
    }
  }
  for (const entry of comparison.missing) {
    const dmc = formatDmc(entry.fields)
    findings.push({ severity: "fehler", group: "F", dmc, message: `Eintrag ${dmc} fehlt — Einträge können nicht entfernt werden (Löschung über Eintragstyp ‚d' bzw. DM-Ausgabetyp ‚deleted').` })
  }
  return findings
}

/** Gruppe K — abweichende Partnerantworten (kein Fehler; Übernahme nur nach Abfrage, PROJ-10) */
export const answerDeviations = (comparison: Comparison): ComparedEntry[] => comparison.entries.filter((e) => e.answerChanged)

/**
 * Bedingte Sperre „Eintragstyp bei Antwortübernahme": Einträge ohne Eintragstyp, bei denen nur die Antwort abweicht.
 * Würden ihre Antworten übernommen, wären sie *in Bearbeitung*, könnten aber nie gesendet und freigegeben werden.
 */
export const answerTakeoverBlockers = (comparison: Comparison): ComparedEntry[] =>
  comparison.entries.filter((e) => e.answerChanged && e.classification === "unveraendert" && e.candidate.fields.dmentryType === "")

export const ANSWER_TAKEOVER_BLOCKED =
  "Eintragstyp setzen (n, c oder d), damit der Eintrag erneut gesendet werden kann — Datei korrigieren oder Antworten nicht übernehmen."

/** Wirksame Einordnung: mit Antwortübernahme zählt eine reine Antwortabweichung als Änderung */
export const effectiveClassification = (entry: ComparedEntry, takeAnswers: boolean): Classification =>
  takeAnswers && entry.answerChanged && entry.classification === "unveraendert" ? "geaendert" : entry.classification

export interface CheckinSummary {
  geprueft: number
  neu: number
  geaendert: number
  unveraendert: number
  loeschungen: number
}

/** Zahlen der Zusammenfassung — ohne bzw. mit Übernahme der Partnerantworten (aus demselben Abgleich) */
export function checkinSummary(candidates: Candidate[], comparison: Comparison | null, takeAnswers = false): CheckinSummary {
  const entries = comparison?.entries ?? []
  const count = (k: Classification) => entries.filter((e) => effectiveClassification(e, takeAnswers) === k).length
  return {
    geprueft: candidates.length,
    neu: count("neu"),
    geaendert: count("geaendert"),
    unveraendert: count("unveraendert"),
    loeschungen: candidates.filter((c) => c.fields.dmentryType === "d").length,
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
  /** Zahlen ohne Übernahme der Partnerantworten (Standard) */
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
