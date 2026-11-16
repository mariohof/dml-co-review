import type { S1000dIssue } from "@/lib/data/schema"
import type { Finding, Report } from "@/lib/rules/check/types"
import { MAX_XML_BYTES, XSD_CLIENT_TIMEOUT_MS, XSD_ENDPOINT, xsdResultSchema, type XsdResult, type XsdUnavailableReason } from "./types"

/** XSD-Prüfdienst im Browser (PROJ-11): ruft die Serverfunktion auf und übersetzt das Ergebnis in den gemeinsamen Prüfbericht */

export const XSD_UNAVAILABLE_MESSAGE =
  "XSD-Prüfung nicht verfügbar — der Vorgang kann nicht ausgeführt werden. Bitte Administrator informieren."

const UNAVAILABLE_DETAIL: Record<XsdUnavailableReason, string> = {
  programm_fehlt: "Das Programm xmllint wurde nicht gefunden.",
  schema_fehlt: "Das Schema (dml.xsd) fehlt oder ist beschädigt.",
  zeitlimit: "Prüfung hat zu lange gedauert.",
  unerwartet: "Die Prüffunktion hat unerwartet geantwortet.",
  // PROJ-20 Refinement 2026-11-16: jede Meldung nennt die Handlung
  nicht_erreichbar: "Der Server der Anwendung läuft nicht — bitte die Anwendung neu starten (siehe START-HIER.md).",
  zugriff_abgelehnt: "Zugriff abgelehnt — bitte die Anwendung über {adresse} öffnen.",
}

/** Lokale Adresse mit dem Port der aktuellen Seite (Startskript 8877, Entwicklungsserver 3000) */
function localAddress(): string {
  const port = typeof window === "undefined" ? "" : window.location.port
  return `http://localhost${port ? `:${port}` : ""}`
}

export const unavailableDetail = (reason: XsdUnavailableReason) => UNAVAILABLE_DETAIL[reason].replace("{adresse}", localAddress())

const unavailable = (reason: XsdUnavailableReason): XsdResult => ({ state: "nicht_verfuegbar", reason })

/**
 * XML gegen das dml.xsd des Issues prüfen. Wirft nie: technische Probleme ergeben „nicht verfügbar",
 * damit der aufrufende Vorgang blockiert wird (kein „Trotzdem fortfahren").
 */
export async function validateXml(
  content: string | Blob,
  issue: S1000dIssue,
  { fetchImpl = fetch, timeoutMs = XSD_CLIENT_TIMEOUT_MS }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<XsdResult> {
  const body = typeof content === "string" ? new Blob([content], { type: "application/xml" }) : content
  if (body.size > MAX_XML_BYTES) throw new Error("Datei zu groß (höchstens 5 MB).")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(`${XSD_ENDPOINT}?issue=${encodeURIComponent(issue)}`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body,
      signal: controller.signal,
    })
    const json: unknown = await response.json().catch(() => null)
    const parsed = xsdResultSchema.safeParse(json)
    // 403: Serverfunktion lehnt fremde Adresse ab (Host-/Origin-Schutz, BUG-QA2-3)
    if (!parsed.success) return unavailable(response.status === 403 ? "zugriff_abgelehnt" : "unerwartet")
    return parsed.data
  } catch (error) {
    return unavailable(controller.signal.aborted || (error as Error)?.name === "AbortError" ? "zeitlimit" : "nicht_erreichbar")
  } finally {
    clearTimeout(timer)
  }
}

/** Überschrift des XSD-Prüfberichts (deutsch) */
export function xsdFailTitle(result: XsdResult): string {
  switch (result.state) {
    case "schemafehler":
      return `Die Datei entspricht nicht dem Schema S1000D Issue ${result.issue} (dml.xsd) — ${result.findings.length} Fehler`
    case "nicht_wohlgeformt":
      return "Die Datei ist kein gültiges XML"
    case "nicht_verfuegbar":
      return XSD_UNAVAILABLE_MESSAGE
    case "gueltig":
      return `XSD-Prüfung bestanden (S1000D Issue ${result.issue})`
  }
}

/** Ergebnis → Befunde im gemeinsamen Prüfbericht (Regelgruppe „XSD", Zeilen laut xmllint) */
export function xsdResultToReport(result: XsdResult): Report {
  const findings: Finding[] = []
  if (result.state === "schemafehler") {
    for (const f of result.findings) findings.push({ severity: "fehler", group: "XSD", line: f.line, message: f.message })
  }
  if (result.state === "nicht_wohlgeformt") {
    const [first, ...rest] = result.findings
    findings.push({
      severity: "fehler",
      group: "XSD",
      line: first.line,
      message: `Die Datei ist kein gültiges XML${first.line ? ` (Zeile ${first.line})` : ""} — ${first.message}`,
    })
    // Folgemeldungen von xmllint nur als Hinweise, damit die Fehlerzahl nicht künstlich steigt
    for (const f of rest) findings.push({ severity: "hinweis", group: "XSD", line: f.line, message: f.message })
  }
  return { lineLabel: "Zeile", findings }
}

export type XmlUploadResult = { ok: true; file: File } | { ok: false; message: string }

/** Dateiannahme REPLY (PROJ-11): nur .xml/.XML, höchstens 5 MB. Die Kodierung wertet xmllint anhand der XML-Deklaration aus. */
export function acceptXmlUpload(file: File): XmlUploadResult {
  if (!file.name.toLowerCase().endsWith(".xml")) return { ok: false, message: "Bitte eine XML-Datei auswählen." }
  if (file.size > MAX_XML_BYTES) return { ok: false, message: "Datei zu groß (höchstens 5 MB)." }
  if (file.size === 0) return { ok: false, message: "Die Datei ist leer." }
  return { ok: true, file }
}
