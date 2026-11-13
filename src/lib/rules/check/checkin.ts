import { ENTRY_FIELD_NAMES, type EntryFields, type EntrySnapshot } from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { readCheckinCsv } from "./csv-reader"
import { checkCommon } from "./entry-rules"
import type { Candidate, Finding, Report } from "./types"

/** Check-in-Prüfung (PROJ-8 Gruppen S, A–E, I, F, K) inkl. Abgleich mit dem Stand beim Check-out (PROJ-10) */

export type Classification = "neu" | "geaendert" | "unveraendert"

export interface ComparedEntry {
  candidate: Candidate
  classification: Classification
  /** Eintrag aus dem Stand beim Check-out (bei neu: null) */
  previous: EntrySnapshot | null
  /** geänderte Felder (inkl. Eintragstyp) */
  changedFields: (keyof EntryFields)[]
}

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
    if (!previous) return { candidate, classification: "neu", previous: null, changedFields: [] }
    const changedFields = ENTRY_FIELD_NAMES.filter((name) => candidate.fields[name] !== previous.fields[name])
    return { candidate, classification: changedFields.length > 0 ? "geaendert" : "unveraendert", previous, changedFields }
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

/** Gruppe K — answer/answer_comment nur durch REPLY */
export function checkAnswerFields(comparison: Comparison): Finding[] {
  const findings: Finding[] = []
  for (const { candidate: c, previous } of comparison.entries) {
    for (const field of ["answer", "answer_comment"] as const) {
      const expected = previous ? previous.fields[field] : ""
      if (c.fields[field] !== expected) {
        findings.push({ severity: "fehler", group: "K", line: c.line, dmc: formatDmc(c.fields), field, message: `${field} darf nur durch REPLY gesetzt werden.` })
      }
    }
  }
  return findings
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
  summary: { geprueft: number; neu: number; geaendert: number; unveraendert: number; loeschungen: number }
}

export function runCheckinCheck(csvText: string, context: CheckinContext): CheckinResult {
  const read = readCheckinCsv(csvText)
  const emptySummary = { geprueft: 0, neu: 0, geaendert: 0, unveraendert: 0, loeschungen: 0 }
  if (read.aborted) {
    return { report: { lineLabel: "Zeile", findings: read.findings }, candidates: [], comparison: null, summary: emptySummary }
  }
  const comparison = compareWithSnapshot(context.snapshot, read.candidates)
  const findings = [
    ...read.findings,
    ...checkCommon(read.candidates, "checkin", context.systemModelic),
    ...checkEntryTypes(comparison),
    ...checkAnswerFields(comparison),
  ]
  const count = (k: Classification) => comparison.entries.filter((e) => e.classification === k).length
  return {
    report: { lineLabel: "Zeile", findings },
    candidates: read.candidates,
    comparison,
    summary: {
      geprueft: read.candidates.length,
      neu: count("neu"),
      geaendert: count("geaendert"),
      unveraendert: count("unveraendert"),
      loeschungen: read.candidates.filter((c) => c.fields.dmentryType === "d").length,
    },
  }
}
