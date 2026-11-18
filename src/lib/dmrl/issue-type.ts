/**
 * DM-Ausgabetyp (`addresdm/issno/@type` bzw. `@issueType`) und sein Zusammenhang mit dem Eintragstyp (`dmentry/@type`).
 * Gemeinsam genutzt von Regelwerk (PROJ-8 A/F), Check-in (PROJ-10), Demo-Daten (PROJ-1) und XML-Prüfung (PROJ-20).
 */

/** Gültige DM-Ausgabetypen (PROJ-8 Regel A; `status` seit Refinement 2026-11-16, `rinstate-*` bewusst nicht) */
export const ISSUE_TYPES = ["new", "changed", "revised", "deleted", "status"] as const

/** Zulässige DM-Ausgabetypen je Eintragstyp beim Check-in (PROJ-10, Refinement 2026-11-16); leerer Eintragstyp → keine Prüfung */
export const ALLOWED_ISSUE_TYPES_BY_ENTRY_TYPE: Readonly<Record<string, readonly string[]>> = {
  n: ["new"],
  c: ["changed", "revised", "status"],
  d: ["deleted"],
}

export const DEFAULT_ISSUE_TYPE = "new"

/**
 * Zulässige DM-Ausgabetypen für einen Eintragstyp; undefined für leere oder ungültige Werte.
 * Nur eigene Schlüssel — sonst liefern Werte wie `constructor` oder `__proto__` geerbte Objekteigenschaften (BUG-QA7-1).
 */
export const allowedIssueTypes = (entryType: string): readonly string[] | undefined =>
  Object.hasOwn(ALLOWED_ISSUE_TYPES_BY_ENTRY_TYPE, entryType) ? ALLOWED_ISSUE_TYPES_BY_ENTRY_TYPE[entryType] : undefined

/** Abgeleiteter Ausgabetyp für fehlende Werte: n → new, c → changed, d → deleted, sonst new (PROJ-1, PROJ-20) */
export const deriveIssueType = (entryType: string): string => allowedIssueTypes(entryType)?.[0] ?? DEFAULT_ISSUE_TYPE
