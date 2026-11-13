import { canAccessDmrl } from "@/lib/auth/permissions"
import { readDml } from "@/lib/data/dml-reader"
import { latestSend } from "@/lib/data/queries"
import {
  versionIndexOf,
  type ArchiveEntry,
  type Dataset,
  type Dmrl,
  type DmrlEntry,
  type DmrlStatus,
  type HistoryEntry,
  type User,
} from "@/lib/data/schema"
import { formatDmc } from "@/lib/dmrl/entries"
import { newId } from "@/lib/ids"
import { runReplyCheck, type ReplyContext, type ReplyResult } from "@/lib/rules/check/reply"
import type { WorkflowResult } from "./check-out"
import { organisationLabel } from "./send"

/** Workflow „REPLY-Import" (PROJ-13): Verfügbarkeit, Datei lesen, Prüfkontext, Abgleich, atomare Übernahme inkl. Freigabe (PROJ-14) */

export const NOT_WAITING = "Die DMRL wartet nicht mehr auf eine Antwort."

/** null = REPLY-Import möglich; sonst Grund */
export function replyBlocked(dmrl: Dmrl, user: User | null): string | null {
  if (!canAccessDmrl(user, dmrl)) return "Keine Berechtigung für diese DMRL."
  if (dmrl.status !== "gesendet") return "Es wird keine Antwort des Partners erwartet — die DMRL ist nicht gesendet."
  return null
}

// ---------------------------------------------------------------- Datei lesen

/** Zeichenkodierung aus der XML-Deklaration (Standard UTF-8) */
export function declaredEncoding(bytes: Uint8Array): string {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 200))
  return /^﻿?<\?xml[^>]*encoding\s*=\s*["']([A-Za-z0-9._-]+)["']/.exec(head)?.[1]?.toLowerCase() ?? "utf-8"
}

/**
 * Datei als Text — unverändert (Zeilenenden, BOM bleiben erhalten) in der deklarierten Kodierung.
 * Die Wohlgeformtheit (inkl. Kodierung) hat zuvor xmllint geprüft (PROJ-11).
 */
export async function readReplyFile(file: Blob): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const encoding = declaredEncoding(bytes)
  try {
    return { ok: true, text: new TextDecoder(encoding, { fatal: true, ignoreBOM: true }).decode(bytes) }
  } catch {
    return { ok: false, message: `Die Datei kann nicht in der angegebenen Kodierung (${encoding}) gelesen werden.` }
  }
}

// ---------------------------------------------------------------- Prüfung

/** Prüfkontext: Vergleichsbasis ist der archivierte XML-Text des letzten SEND */
export function replyContext(data: Dataset, dmrl: Dmrl): ReplyContext {
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  const issue = system?.s1000dIssue ?? "2.3"
  const send = latestSend(data, dmrl.id)
  let lastSend: ReplyContext["lastSend"] = null
  if (send) {
    const partner = data.organisations.find((o) => o.id === send.partnerOrganisationId)
    lastSend = { dmlc: send.dmlc, partnerCode: partner?.code ?? "", entries: readDml(stripBom(send.content), issue).entries }
  }
  return {
    issue,
    systemModelic: system?.modelic ?? "",
    dmlType: dmrl.dmlType,
    dmrlStatus: dmrl.status,
    lastSend,
    archivedReplies: data.archive.filter((a) => a.dmrlId === dmrl.id && a.direction === "reply").map((a) => a.dmlc),
  }
}

const stripBom = (text: string) => text.replace(/^﻿/, "")

export function checkReplyFile(data: Dataset, dmrl: Dmrl, text: string): ReplyResult {
  return runReplyCheck(stripBom(text), replyContext(data, dmrl))
}

// ---------------------------------------------------------------- Abgleich (einmal berechnet für Zusammenfassung und Übernahme)

export interface RejectedEntry {
  dmc: string
  techname: string
  comment: string
}

export interface ReplyOutcome {
  /** neue Einträge der DMRL (nur geprüfte verändert) */
  entries: DmrlEntry[]
  approved: number
  rework: number
  rejected: RejectedEntry[]
  futureStatus: DmrlStatus
}

export function replyOutcome(data: Dataset, dmrlId: string, result: ReplyResult): ReplyOutcome {
  const answers = new Map(result.candidates.map((c) => [formatDmc(c.fields), c.fields]))
  let approved = 0
  let rework = 0
  const rejected: RejectedEntry[] = []
  const entries = data.entries
    .filter((e) => e.dmrlId === dmrlId)
    .map((entry): DmrlEntry => {
      const reply = answers.get(formatDmc(entry.fields))
      // Nur vom Partner geprüfte Einträge (Eintragstyp n/c/d mit Antwort); übrige unverändert inkl. früherer Antwort
      if (!reply || !["n", "c", "d"].includes(entry.fields.dmentryType) || !reply.answer) return entry
      if (reply.answer === "y") {
        approved++
        return {
          ...entry,
          status: "freigegeben",
          fields: { ...entry.fields, dmentryType: "", answer: "y", answer_comment: reply.answer_comment },
        }
      }
      rework++
      rejected.push({ dmc: formatDmc(entry.fields), techname: entry.fields.techname, comment: reply.answer_comment })
      return { ...entry, status: "zu_ueberarbeiten", fields: { ...entry.fields, answer: "n", answer_comment: reply.answer_comment } }
    })
  const futureStatus: DmrlStatus = entries.length > 0 && entries.every((e) => e.status === "freigegeben") ? "freigegeben" : "in_bearbeitung"
  return { entries, approved, rework, rejected: rejected.sort((a, b) => a.dmc.localeCompare(b.dmc)), futureStatus }
}

// ---------------------------------------------------------------- Verlauf und Übernahme

const history = (dmrlId: string, userId: string, at: string, action: HistoryEntry["action"], details: string): HistoryEntry => ({
  id: newId("history"),
  dmrlId,
  at,
  userId,
  action,
  details,
})

/** Abgelehnte Datei (XSD oder Regelwerk): nur Verlaufseintrag */
export function recordRejectedReply(
  data: Dataset,
  dmrlId: string,
  user: User,
  fileName: string,
  kind: "XSD-Prüfung" | "Regelwerk",
  errors: number,
  at = new Date().toISOString()
): Dataset {
  return {
    ...data,
    history: [...data.history, history(dmrlId, user.id, at, "reply_abgelehnt", `REPLY „${fileName}" abgelehnt — ${kind}, ${errors} Fehler`)],
  }
}

export interface ReplyImport {
  fileName: string
  /** Dateiinhalt unverändert */
  text: string
  result: ReplyResult
  /** SEND, auf den sich die Prüfung bezog */
  sendArchiveId: string
}

/**
 * Übernahme in einer Speicherung: Einträge, DMRL-Status, Partner-Bemerkung, Archiv (byte-genau, mit SEND verknüpft), Verlauf;
 * bei vollständiger Freigabe zusätzlich Freigabe-Nachweis und Freigabestand (PROJ-14).
 */
export function executeReplyImport(data: Dataset, dmrlId: string, user: User | null, input: ReplyImport, at = new Date().toISOString()): WorkflowResult {
  const dmrl = data.dmrls.find((d) => d.id === dmrlId)
  if (!dmrl || !user) return { ok: false, message: "DMRL oder Benutzer nicht gefunden." }
  if (!canAccessDmrl(user, dmrl)) return { ok: false, message: "Keine Berechtigung für diese DMRL." }
  const send = latestSend(data, dmrlId)
  if (dmrl.status !== "gesendet" || !send || send.id !== input.sendArchiveId) return { ok: false, message: NOT_WAITING }
  const { result } = input
  if (!result.parsed || result.report.findings.some((f) => f.severity === "fehler")) {
    return { ok: false, message: "Die Datei enthält Fehler und kann nicht übernommen werden." }
  }

  const outcome = replyOutcome(data, dmrlId, result)
  const header = result.parsed.header
  const partner = data.organisations.find((o) => o.id === send.partnerOrganisationId)
  const versionIndex = versionIndexOf(header.dmlc)
  const archive: ArchiveEntry = {
    id: newId("archive"),
    dmrlId,
    direction: "reply",
    dmlc: header.dmlc,
    versionIndex,
    dmlref: header.dmlref,
    fileName: input.fileName,
    content: input.text,
    createdAt: at,
    createdByUserId: user.id,
    partnerOrganisationId: send.partnerOrganisationId,
    sendArchiveId: send.id,
    replyCounts: { approved: outcome.approved, rework: outcome.rework },
    withdrawn: null,
  }
  const released = outcome.futureStatus === "freigegeben"
  const details = `REPLY ${versionIndex} von ${partner ? organisationLabel(partner) : "Partner"} übernommen — ${outcome.approved} freigegeben, ${outcome.rework} zu überarbeiten${released ? " — DMRL freigegeben" : ""}`

  return {
    ok: true,
    data: {
      ...data,
      entries: [...data.entries.filter((e) => e.dmrlId !== dmrlId), ...outcome.entries],
      dmrls: data.dmrls.map((d) =>
        d.id === dmrlId
          ? {
              ...d,
              status: outcome.futureStatus,
              partnerRemarks: header.remarks,
              release: released ? { at, replyArchiveId: archive.id, userId: user.id } : d.release,
            }
          : d
      ),
      archive: [...data.archive, archive],
      releases: released
        ? [
            ...data.releases,
            {
              id: newId("release"),
              dmrlId,
              createdAt: at,
              replyArchiveId: archive.id,
              userId: user.id,
              entries: outcome.entries.map(({ id, status, fields }) => ({ id, status, fields })),
            },
          ]
        : data.releases,
      history: [...data.history, history(dmrlId, user.id, at, "reply_uebernommen", details)],
    },
  }
}
