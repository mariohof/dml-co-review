// Nur serverseitig verwenden (Node.js: child_process, fs) — wird ausschließlich von src/app/api/xsd-pruefung importiert
import { spawn } from "node:child_process"
import { access } from "node:fs/promises"
import { join } from "node:path"

import type { S1000dIssue } from "@/lib/data/schema"
import type { XsdFinding, XsdResult } from "../types"

/**
 * XSD-Prüfung mit dem installierten xmllint (PROJ-11 Tech Design D/E).
 * - Schema nur aus der Issue-Whitelist, nie aus Benutzereingaben
 * - kein Shell-Aufruf, feste Argumente, offline (--nonet), keine Entity-Ersetzung
 * - Datei über stdin → keine Zwischendateien, nichts wird gespeichert oder protokolliert
 * - Zeitlimit; Ausgabe begrenzt
 */

export const XMLLINT_TIMEOUT_MS = 20_000
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024

export interface XmllintOptions {
  /** Programmpfad; Standard: Umgebungsvariable XMLLINT_PATH oder „xmllint" im Systempfad */
  xmllintPath?: string
  /** Ordner mit issue-2.3 / issue-4.2 / issue-5.0 */
  schemaRoot?: string
  timeoutMs?: number
}

export const schemaPathFor = (issue: S1000dIssue, schemaRoot = join(process.cwd(), "schemas", "s1000d")) =>
  join(schemaRoot, `issue-${issue}`, "dml.xsd")

// Beispiele (libxml2 2.9 und 2.13+):
//   -:28: element dmtitle: Schemas validity error : Element 'dmtitle': This element is not expected. …
//   -:987: parser error : Premature end of data in tag dml line 2
//   -:12: Schemas validity error : Element 'x': …
const LINE_PATTERN = /^-:(\d+): (.*?)(parser error|namespace error|validity error|error|warning) : (.*)$/

export interface ParsedOutput {
  findings: XsdFinding[]
  wellFormednessError: boolean
}

/** stderr von xmllint auswerten; Kontextzeilen (Quelltext, Caret) und „- fails to validate" werden übergangen */
export function parseXmllintOutput(stderr: string): ParsedOutput {
  const findings: XsdFinding[] = []
  let wellFormednessError = false
  for (const raw of stderr.split(/\r?\n/)) {
    const match = LINE_PATTERN.exec(raw)
    if (!match) continue
    const [, line, , kind, message] = match
    if (kind === "warning") continue
    if (kind === "parser error" || kind === "namespace error") wellFormednessError = true
    findings.push({ line: Number(line) || undefined, message: message.trim() })
  }
  return { findings, wellFormednessError }
}

interface RunOutcome {
  code: number | null
  stderr: string
  timedOut: boolean
  notFound: boolean
}

function runXmllint(program: string, args: string[], input: Uint8Array, timeoutMs: number): Promise<RunOutcome> {
  return new Promise((resolve) => {
    let stderr = ""
    let size = 0
    let timedOut = false
    let settled = false
    const finish = (outcome: RunOutcome) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(outcome)
    }

    const child = spawn(program, args, { shell: false, windowsHide: true, stdio: ["pipe", "ignore", "pipe"] })
    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, timeoutMs)

    child.on("error", (error: NodeJS.ErrnoException) =>
      finish({ code: null, stderr, timedOut, notFound: error.code === "ENOENT" || error.code === "EACCES" })
    )
    child.stderr.setEncoding("utf8")
    child.stderr.on("data", (chunk: string) => {
      size += chunk.length
      if (size <= MAX_OUTPUT_BYTES) stderr += chunk
    })
    child.on("close", (code) => finish({ code, stderr, timedOut, notFound: false }))
    // EPIPE, falls xmllint vorzeitig endet, ist kein eigener Fehler
    child.stdin.on("error", () => {})
    child.stdin.end(Buffer.from(input))
  })
}

/** Prüft die XML-Datei gegen dml.xsd des Issues und liefert das strukturierte Ergebnis (Vertrag: ../types.ts) */
export async function validateWithXmllint(input: Uint8Array, issue: S1000dIssue, options: XmllintOptions = {}): Promise<XsdResult> {
  const program = options.xmllintPath ?? process.env.XMLLINT_PATH ?? "xmllint"
  const schemaPath = schemaPathFor(issue, options.schemaRoot)
  try {
    await access(schemaPath)
  } catch {
    return { state: "nicht_verfuegbar", reason: "schema_fehlt" }
  }

  const outcome = await runXmllint(program, ["--noout", "--nonet", "--schema", schemaPath, "-"], input, options.timeoutMs ?? XMLLINT_TIMEOUT_MS)
  if (outcome.notFound) return { state: "nicht_verfuegbar", reason: "programm_fehlt" }
  if (outcome.timedOut) return { state: "nicht_verfuegbar", reason: "zeitlimit" }

  const { findings, wellFormednessError } = parseXmllintOutput(outcome.stderr)
  switch (outcome.code) {
    case 0:
      return { state: "gueltig", issue }
    case 1:
      if (wellFormednessError && findings.length > 0) return { state: "nicht_wohlgeformt", issue, findings }
      break
    case 3:
    case 4:
      if (wellFormednessError && findings.length > 0) return { state: "nicht_wohlgeformt", issue, findings }
      if (findings.length > 0) return { state: "schemafehler", issue, findings }
      break
    case 5:
      return { state: "nicht_verfuegbar", reason: "schema_fehlt" }
  }
  return { state: "nicht_verfuegbar", reason: "unerwartet" }
}
