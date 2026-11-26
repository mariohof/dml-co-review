import { S1000D_ISSUES, type S1000dIssue } from "@/lib/data/schema"
import type { Finding } from "./types"

/**
 * Abgleich der Schema-Angabe einer DML-Datei mit der gewählten Issue (PROJ-22, Abschnitt E).
 * Die XSDs von 5.0 und 6.0 akzeptieren sich gegenseitig — die Schema-Angabe ist der einzige Hinweis
 * auf eine Verwechslung. Ergebnis ist höchstens ein Hinweis, nie ein Fehler.
 */

/**
 * Attribute des Wurzelelements. Läuft einmal linear vom Dateianfang: Prolog-Bestandteile (XML-Deklaration,
 * Processing Instructions, Kommentare, DOCTYPE) werden mit indexOf übersprungen, danach endet die Suche am
 * ersten Start-Tag. Der Rest der Datei (z. B. CDATA mit `<!--`) wird nie betrachtet (BUG-QA22-2).
 */
function rootStartTagAttributes(xml: string): string | null {
  let pos = 0
  for (;;) {
    const lt = xml.indexOf("<", pos)
    if (lt === -1) return null
    if (xml.startsWith("<?", lt)) {
      const end = xml.indexOf("?>", lt + 2)
      if (end === -1) return null
      pos = end + 2
    } else if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt + 4)
      if (end === -1) return null
      pos = end + 3
    } else if (xml.startsWith("<!", lt)) {
      // DOCTYPE, ggf. mit interner Teilmenge [ … ]
      const bracket = xml.indexOf("[", lt)
      const close = xml.indexOf(">", lt)
      if (close === -1) return null
      if (bracket !== -1 && bracket < close) {
        const subsetEnd = xml.indexOf("]", bracket)
        if (subsetEnd === -1) return null
        const end = xml.indexOf(">", subsetEnd)
        if (end === -1) return null
        pos = end + 1
      } else pos = close + 1
    } else {
      const match = /^<[A-Za-z_][^\s/>]*/.exec(xml.slice(lt, lt + 256))
      if (!match) return null
      const end = xml.indexOf(">", lt)
      if (end === -1) return null
      return xml.slice(lt + match[0].length, end)
    }
  }
}

/** Wert von `noNamespaceSchemaLocation` (beliebiges Präfix) bzw. letzte URL von `schemaLocation` im Wurzelelement */
export function readSchemaLocation(xml: string): string | null {
  const attrs = rootStartTagAttributes(xml)
  if (attrs === null) return null
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
