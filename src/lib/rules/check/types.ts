import type { EntryFields } from "@/lib/data/schema"

/** Gemeinsames Prüfformat und Prüfbericht (PROJ-8 Tech Design B/D) */

export type RuleGroup = "S" | "XSD" | "A" | "B" | "C" | "D" | "E" | "I" | "F" | "K" | "G" | "H"

export const RULE_GROUP_LABEL: Record<RuleGroup, string> = {
  S: "Dateistruktur",
  XSD: "Schema (XSD)",
  A: "Feldformat",
  B: "Pflichtfeld",
  C: "DMC eindeutig",
  D: "Model Ident Code",
  E: "SNS → Tech Name",
  I: "Infocode → Info Name",
  F: "Eintragstyp",
  K: "Antwortfelder",
  G: "REPLY ↔ SEND",
  H: "Antworten vollständig",
}

export type Severity = "fehler" | "hinweis"

export interface Finding {
  severity: Severity
  group: RuleGroup
  /** CSV: Zeilennummer in der Datei; XML: Position des Eintrags (1-basiert) bzw. Zeile laut xmllint */
  line?: number
  dmc?: string
  field?: string
  message: string
}

/** Ein Eintrag im gemeinsamen Prüfformat */
export interface Candidate {
  /** Zeile (CSV) bzw. Position (XML) */
  line: number
  fields: EntryFields
}

export interface Report {
  /** „Zeile" bei CSV, „Eintrag" bei XML — für die Anzeige */
  lineLabel: string
  findings: Finding[]
}

export const errorCount = (report: Report) => report.findings.filter((f) => f.severity === "fehler").length
export const hintCount = (report: Report) => report.findings.filter((f) => f.severity === "hinweis").length
export const hasErrors = (report: Report) => errorCount(report) > 0
