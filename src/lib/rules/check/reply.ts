import { DmlParseError, readDml, type ParsedDml } from "@/lib/data/dml-reader"
import { ENTRY_FIELD_NAMES, type DmlCode, type DmrlStatus, type EntryFields, type S1000dIssue } from "@/lib/data/schema"
import { versionIndexOf } from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { checkCommon, OPTIONAL_IN_REPLY } from "./entry-rules"
import type { Candidate, Finding, Report } from "./types"

/** REPLY-Prüfung (PROJ-8 Gruppen A–E, I, G, H) — läuft nach bestandener XSD-Prüfung (PROJ-11) */

export interface ReplyContext {
  issue: S1000dIssue
  systemModelic: string
  dmlType: string
  dmrlStatus: DmrlStatus
  /** letzter (nicht zurückgezogener) SEND: DML-Code, Empfänger-CAGE und Einträge laut archivierter Datei */
  lastSend: { dmlc: DmlCode; partnerCode: string; entries: EntryFields[] } | null
  /** DML-Codes bereits archivierter REPLYs (Duplikatprüfung) */
  archivedReplies: DmlCode[]
}

export interface ReplyResult {
  report: Report
  parsed: ParsedDml | null
  candidates: Candidate[]
  summary: { geprueft: number; freigegeben: number; zuUeberarbeiten: number }
}

const sameDmlc = (a: DmlCode, b: DmlCode) =>
  a.modelic === b.modelic && a.sendid === b.sendid && a.dmltype.toLowerCase() === b.dmltype.toLowerCase() && a.diyear === b.diyear && a.seqnum === b.seqnum

const G = (message: string, extra: Partial<Finding> = {}): Finding => ({ severity: "fehler", group: "G", message, ...extra })

/** Gruppe G — REPLY passt zum letzten SEND */
export function checkReplyAgainstSend(parsed: ParsedDml, candidates: Candidate[], context: ReplyContext): Finding[] {
  const { header } = parsed
  const findings: Finding[] = []
  if (header.direction !== "reply") findings.push(G(`Die Datei ist keine Antwort (Richtung ‚${header.direction}' statt ‚reply').`))
  if (header.dmlc.modelic !== context.systemModelic) {
    findings.push(G(`Model Ident Code ‚${header.dmlc.modelic}' passt nicht zum System ‚${context.systemModelic}'.`))
  }
  if (header.dmlc.dmltype.toLowerCase() !== context.dmlType.toLowerCase()) {
    findings.push(G(`DML-Typ ‚${header.dmlc.dmltype}' passt nicht zur DMRL (‚${context.dmlType}').`))
  }
  if (context.dmrlStatus !== "gesendet" || !context.lastSend) {
    findings.push(G("Für diese DMRL wird keine Antwort erwartet."))
    return findings
  }
  const send = context.lastSend
  if (header.dmlc.sendid !== send.partnerCode) findings.push(G(`REPLY stammt nicht vom Empfänger ${send.partnerCode} (Absender ‚${header.dmlc.sendid}').`))
  if (!header.dmlref || !sameDmlc(header.dmlref.dmlc, send.dmlc)) {
    findings.push(G(`REPLY bezieht sich nicht auf den letzten SEND ${versionIndexOf(send.dmlc)}.`))
  }
  if (context.archivedReplies.some((dmlc) => sameDmlc(dmlc, header.dmlc))) findings.push(G("REPLY wurde bereits importiert."))

  // Einträge: gleiche DMCs, keine Änderungen außer Antworten
  const sendByDmc = new Map(send.entries.map((fields) => [formatDmc(fields), fields]))
  const replyDmcs = new Set<string>()
  for (const c of candidates) {
    const dmc = formatDmc(c.fields)
    replyDmcs.add(dmc)
    const sent = sendByDmc.get(dmc)
    if (!sent) {
      findings.push(G("DMC war nicht im SEND enthalten.", { line: c.line, dmc }))
      continue
    }
    for (const name of ENTRY_FIELD_NAMES) {
      if (name === "answer" || name === "answer_comment" || name === "answer_timestamp") continue
      if (OPTIONAL_IN_REPLY.includes(name) && c.fields[name] === "") continue
      if (c.fields[name] !== sent[name]) {
        findings.push(G(`Feld ${name} wurde gegenüber dem SEND verändert (SEND ‚${sent[name]}', REPLY ‚${c.fields[name]}').`, { line: c.line, dmc, field: name }))
      }
    }
  }
  for (const dmc of sendByDmc.keys()) {
    if (!replyDmcs.has(dmc)) findings.push(G("DMC aus dem SEND fehlt im REPLY.", { dmc }))
  }
  return findings
}

/** Gruppe H — Antworten vollständig */
export function checkAnswers(candidates: Candidate[]): Finding[] {
  const findings: Finding[] = []
  for (const c of candidates) {
    const typed = ["n", "c", "d"].includes(c.fields.dmentryType)
    const base = { severity: "fehler" as const, group: "H" as const, line: c.line, dmc: formatDmc(c.fields), field: "answer" }
    if (typed && c.fields.answer === "") findings.push({ ...base, message: "Antwort fehlt." })
    if (!typed && c.fields.answer !== "") findings.push({ ...base, message: "Antwort nur bei Eintragstyp n/c/d zulässig." })
    if (c.fields.answer === "n" && c.fields.answer_comment.trim() === "") {
      findings.push({ ...base, field: "answer_comment", message: "Begründung fehlt." })
    }
  }
  return findings
}

export function runReplyCheck(xml: string, context: ReplyContext): ReplyResult {
  let parsed: ParsedDml
  try {
    parsed = readDml(xml, context.issue)
  } catch (error) {
    const message = error instanceof DmlParseError ? error.message : "Die Datei konnte nicht gelesen werden."
    return {
      report: { lineLabel: "Eintrag", findings: [{ severity: "fehler", group: "G", message }] },
      parsed: null,
      candidates: [],
      summary: { geprueft: 0, freigegeben: 0, zuUeberarbeiten: 0 },
    }
  }
  const candidates = parsed.entries.map((fields, index) => ({ line: index + 1, fields }))
  const findings = [
    ...checkReplyAgainstSend(parsed, candidates, context),
    ...checkCommon(candidates, "reply", context.systemModelic),
    ...checkAnswers(candidates),
  ]
  return {
    report: { lineLabel: "Eintrag", findings },
    parsed,
    candidates,
    summary: {
      geprueft: candidates.length,
      freigegeben: candidates.filter((c) => c.fields.answer === "y").length,
      zuUeberarbeiten: candidates.filter((c) => c.fields.answer === "n").length,
    },
  }
}
