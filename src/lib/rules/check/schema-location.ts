import { S1000D_ISSUES, type S1000dIssue } from "@/lib/data/schema"
import type { Finding } from "./types"

/**
 * Abgleich der Schema-Angabe einer DML-Datei mit der gewählten Issue (PROJ-22, Abschnitt E).
 * Die XSDs von 5.0 und 6.0 akzeptieren sich gegenseitig — die Schema-Angabe ist der einzige Hinweis
 * auf eine Verwechslung. Ergebnis ist höchstens ein Hinweis, nie ein Fehler.
 */

/** Wert von `noNamespaceSchemaLocation` (beliebiges Präfix) bzw. letzte URL von `schemaLocation` im Wurzelelement */
export function readSchemaLocation(xml: string): string | null {
  const root = xml
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/i, "")
    .match(/<[A-Za-z_][^\s/>]*([^>]*)>/)
  if (!root) return null
  const attrs = root[1]
  const noNs = attrs.match(/(?:^|\s)(?:[\w.-]+:)?noNamespaceSchemaLocation\s*=\s*(["'])([\s\S]*?)\1/)
  if (noNs) return noNs[2].trim() || null
  const withNs = attrs.match(/(?:^|\s)(?:[\w.-]+:)?schemaLocation\s*=\s*(["'])([\s\S]*?)\1/)
  if (!withNs) return null
  const parts = withNs[2].trim().split(/\s+/).filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : null
}

/**
 * Issue aus der Versionskennung im Pfad, z. B. `S1000D_5-0`, `S1000D_6`, `S1000D_6-0`, `S1000D2.3` (NSG).
 * Nicht zuordenbar → null.
 */
export function issueFromSchemaLocation(location: string): S1000dIssue | null {
  const match = location.match(/S1000D[_-]?(\d{1,2})(?:[-._](\d))?(?!\d)/i)
  if (!match) return null
  const candidate = `${match[1]}.${match[2] ?? "0"}`
  return (S1000D_ISSUES as readonly string[]).includes(candidate) ? (candidate as S1000dIssue) : null
}

export type SchemaLocationTarget = "system" | "auswahl"

export const schemaLocationMismatch = (fileIssue: S1000dIssue, issue: S1000dIssue, target: SchemaLocationTarget) =>
  target === "system"
    ? `Die Schema-Angabe der Datei verweist auf S1000D Issue ${fileIssue}, das System verwendet Issue ${issue} — bitte prüfen, ob die Datei in der richtigen Version erstellt wurde.`
    : `Die Schema-Angabe der Datei verweist auf S1000D Issue ${fileIssue}, gewählt ist Issue ${issue} — bitte Issue prüfen.`

/** Ein Hinweis (Gruppe XSD), wenn die Schema-Angabe eindeutig auf eine andere Issue verweist; sonst nichts */
export function checkSchemaLocation(xml: string, issue: S1000dIssue, target: SchemaLocationTarget): Finding[] {
  const location = readSchemaLocation(xml)
  if (!location) return []
  const fileIssue = issueFromSchemaLocation(location)
  if (!fileIssue || fileIssue === issue) return []
  return [{ severity: "hinweis", group: "XSD", message: schemaLocationMismatch(fileIssue, issue, target) }]
}
