import { writeTableCsv } from "@/lib/files/csv-writer"
import { RULE_GROUP_LABEL, type Finding, type Report } from "./types"

/** Sortierung des Prüfberichts: nach Zeile oder nach Regel (PROJ-8 Tech Design C) */
export type ReportOrder = "zeile" | "regel"

const GROUP_ORDER = Object.keys(RULE_GROUP_LABEL)

export function sortFindings(findings: Finding[], order: ReportOrder): Finding[] {
  const byLine = (a: Finding, b: Finding) => (a.line ?? 0) - (b.line ?? 0)
  const byGroup = (a: Finding, b: Finding) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
  const bySeverity = (a: Finding, b: Finding) => (a.severity === b.severity ? 0 : a.severity === "fehler" ? -1 : 1)
  return [...findings].sort((a, b) =>
    order === "zeile" ? byLine(a, b) || byGroup(a, b) || bySeverity(a, b) : byGroup(a, b) || byLine(a, b) || bySeverity(a, b)
  )
}

/** Prüfbericht als Excel-taugliche CSV (Semikolon, UTF-8 mit BOM) */
export function reportToCsv(report: Report): string {
  return writeTableCsv(
    ["Art", report.lineLabel, "DMC", "Feld", "Regel", "Meldung"],
    sortFindings(report.findings, "zeile").map((f) => [
      f.severity === "fehler" ? "Fehler" : "Hinweis",
      f.line ? String(f.line) : "",
      f.dmc ?? "",
      f.field ?? "",
      RULE_GROUP_LABEL[f.group],
      f.message,
    ])
  )
}

/** Dateiname, z. B. Pruefbericht-PHUNGUN-2026-11-13.csv */
export function reportFileName(subject: string, date: Date = new Date()): string {
  const safe = subject.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "DMRL"
  return `Pruefbericht-${safe}-${date.toISOString().slice(0, 10)}.csv`
}
