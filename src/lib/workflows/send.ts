import { canAccessAdministration, canAccessDmrl } from "@/lib/auth/permissions"
import { writeDml } from "@/lib/data/dml-writer"
import { currentVersionIndex, latestSend } from "@/lib/data/queries"
import {
  versionIndexOf,
  type ArchiveEntry,
  type Dataset,
  type DmlCode,
  type DmlRef,
  type Dmrl,
  type HistoryEntry,
  type Organisation,
  type User,
} from "@/lib/data/schema"
import { compareByDmc } from "@/lib/dmrl/entries"
import { newId } from "@/lib/ids"
import type { WorkflowResult } from "./check-out"

/** Workflow „SEND-Export" (PROJ-12): Voraussetzungen, Versionsindex, dmlref, XML, atomare Ausführung, Zurückziehen */

export const MAX_SEND_REMARKS = 2000

const userName = (data: Dataset, id: string) => data.users.find((u) => u.id === id)?.name ?? "unbekannt"
const entriesOf = (data: Dataset, dmrlId: string) => data.entries.filter((e) => e.dmrlId === dmrlId)
const hasEntryType = (type: string) => type === "n" || type === "c" || type === "d"

export const organisationLabel = (org: Pick<Organisation, "code" | "name">) => `${org.code} ${org.name}`

/** null = SEND möglich; sonst Grund (Reihenfolge laut Spec) */
export function sendBlocked(data: Dataset, dmrl: Dmrl, user: User | null): string | null {
  if (!canAccessDmrl(user, dmrl)) return "Keine Berechtigung für diese DMRL."
  if (dmrl.lock) return `Die DMRL ist ausgecheckt von ${userName(data, dmrl.lock.userId)}.`
  if (dmrl.status === "gesendet") {
    const index = currentVersionIndex(data, dmrl.id)
    return index ? `Es wird noch auf die Antwort zum SEND ${index} gewartet.` : "Es wird noch auf die Antwort des Partners gewartet."
  }
  const entries = entriesOf(data, dmrl.id)
  const rework = entries.filter((e) => e.status === "zu_ueberarbeiten").length
  if (rework > 0) {
    return `${rework} abgelehnte ${rework === 1 ? "Eintrag ist" : "Einträge sind"} noch nicht überarbeitet (per Check-in ändern, mit „d" kennzeichnen oder erneut mit „n" versehen).`
  }
  if (!entries.some((e) => hasEntryType(e.fields.dmentryType))) return "Es gibt keine Änderungen, die der Partner prüfen müsste."
  return null
}

/** SEND zurückziehen: nur Administrator, nur bei Status gesendet */
export function withdrawSendBlocked(data: Dataset, dmrl: Dmrl, user: User | null): string | null {
  if (!canAccessAdministration(user)) return "Nur Administratoren können einen SEND zurückziehen."
  if (dmrl.status !== "gesendet" || !latestSend(data, dmrl.id)) return "Es gibt keinen offenen SEND."
  return null
}

/** Partner: alle Organisationen außer dem Originator, nach CAGE-Code sortiert */
export function sendPartners(data: Dataset, dmrl: Dmrl): Organisation[] {
  return data.organisations.filter((o) => o.id !== dmrl.originatorOrganisationId).sort((a, b) => a.code.localeCompare(b.code))
}

/** Partner des letzten gültigen SEND (Vorbelegung), oder null */
export function lastSendPartner(data: Dataset, dmrl: Dmrl): Organisation | null {
  const send = latestSend(data, dmrl.id)
  return send ? (data.organisations.find((o) => o.id === send.partnerOrganisationId) ?? null) : null
}

/** Nächster DML-Code: seqnum je DMRL + Absender + Jahr; zurückgezogene SENDs belegen ihre Nummer */
export function nextSendDmlCode(data: Dataset, dmrl: Dmrl, at: string): DmlCode {
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  const originator = data.organisations.find((o) => o.id === dmrl.originatorOrganisationId)
  const year = String(new Date(at).getFullYear())
  const sendid = originator?.code ?? ""
  const used = data.archive
    .filter((a) => a.dmrlId === dmrl.id && a.direction === "send" && a.dmlc.sendid === sendid && a.dmlc.diyear === year)
    .map((a) => Number(a.dmlc.seqnum) || 0)
  const seqnum = String(Math.max(0, ...used) + 1).padStart(5, "0")
  return { modelic: system?.modelic ?? "", sendid, dmltype: dmrl.dmlType, diyear: year, seqnum }
}

/** dmlref: erster SEND → eigener DML-Code; sonst letzter REPLY; jeweils mit issno 001 (NSG) */
export function sendDmlRef(data: Dataset, dmrl: Dmrl, own: DmlCode): DmlRef {
  const replies = data.archive
    .filter((a) => a.dmrlId === dmrl.id && a.direction === "reply")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const lastReply = replies.at(-1)
  return { dmlc: lastReply ? lastReply.dmlc : own, issno: { issno: "001", inwork: "00", type: "" } }
}

/** DML-{MI}-{CAGE}-{DML-Typ}-{Jahr}-{seqnum}_001-00.XML */
export const sendFileName = (dmlc: DmlCode) =>
  `DML-${dmlc.modelic}-${dmlc.sendid}-${dmlc.dmltype.toUpperCase()}-${dmlc.diyear}-${dmlc.seqnum}_001-00.XML`

export interface SendCounts {
  gesamt: number
  n: number
  c: number
  d: number
}

export function sendCounts(data: Dataset, dmrlId: string): SendCounts {
  const entries = entriesOf(data, dmrlId)
  const count = (type: string) => entries.filter((e) => e.fields.dmentryType === type).length
  return { gesamt: entries.length, n: count("n"), c: count("c"), d: count("d") }
}

export interface SendPreview {
  dmlc: DmlCode
  versionIndex: string
  fileName: string
  counts: SendCounts
}

export function sendPreview(data: Dataset, dmrl: Dmrl, at: string): SendPreview {
  const dmlc = nextSendDmlCode(data, dmrl, at)
  return { dmlc, versionIndex: versionIndexOf(dmlc), fileName: sendFileName(dmlc), counts: sendCounts(data, dmrl.id) }
}

export interface PreparedSend extends SendPreview {
  xml: string
  dmlref: DmlRef
  partnerOrganisationId: string
  at: string
}

/** XML erzeugen (alle Einträge nach DMC sortiert, ohne answer) — noch nichts gespeichert */
export function prepareSend(data: Dataset, dmrl: Dmrl, partnerOrganisationId: string, remarks: string, at: string): PreparedSend {
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  if (!system) throw new Error("System der DMRL fehlt.")
  const preview = sendPreview(data, dmrl, at)
  const dmlref = sendDmlRef(data, dmrl, preview.dmlc)
  const date = new Date(at)
  const pad = (n: number) => String(n).padStart(2, "0")
  const entries = [...entriesOf(data, dmrl.id)].sort(compareByDmc).map((e) => e.fields)
  const xml = writeDml(
    {
      header: {
        direction: "send",
        dmlc: preview.dmlc,
        issno: { issno: "001", inwork: "00", type: "new" },
        issdate: { day: pad(date.getDate()), month: pad(date.getMonth() + 1), year: String(date.getFullYear()) },
        security: dmrl.security,
        dmlref,
        remarks: remarks.trim(),
      },
      entries,
    },
    system.s1000dIssue,
    { answers: false }
  )
  return { ...preview, xml, dmlref, partnerOrganisationId, at }
}

const history = (dmrlId: string, userId: string, at: string, action: HistoryEntry["action"], details: string): HistoryEntry => ({
  id: newId("history"),
  dmrlId,
  at,
  userId,
  action,
  details,
})

/** XSD-Prüfung der erzeugten Datei fehlgeschlagen: nur Verlaufseintrag */
export function recordFailedSend(data: Dataset, dmrlId: string, user: User, errors: number, at = new Date().toISOString()): Dataset {
  return {
    ...data,
    history: [...data.history, history(dmrlId, user.id, at, "send_fehlgeschlagen", `SEND fehlgeschlagen — XSD-Prüfung (${errors} Fehler)`)],
  }
}

/**
 * Erfolgreicher SEND in einer Speicherung: Archiv (byte-genau), Einträge n/c/d → gesendet, DMRL → gesendet, Verlauf.
 * Prüft Voraussetzungen und Versionsindex erneut (paralleler Tab, Jahreswechsel).
 */
export function executeSend(data: Dataset, dmrlId: string, user: User | null, prepared: PreparedSend): WorkflowResult {
  const dmrl = data.dmrls.find((d) => d.id === dmrlId)
  if (!dmrl || !user) return { ok: false, message: "DMRL oder Benutzer nicht gefunden." }
  const blocked = sendBlocked(data, dmrl, user)
  if (blocked) return { ok: false, message: blocked }
  const partner = data.organisations.find((o) => o.id === prepared.partnerOrganisationId)
  if (!partner || partner.id === dmrl.originatorOrganisationId) return { ok: false, message: "Bitte einen Partner auswählen." }
  if (versionIndexOf(nextSendDmlCode(data, dmrl, prepared.at)) !== prepared.versionIndex) {
    return { ok: false, message: "Der Versionsindex hat sich inzwischen geändert. Bitte erneut senden." }
  }

  const archive: ArchiveEntry = {
    id: newId("archive"),
    dmrlId,
    direction: "send",
    dmlc: prepared.dmlc,
    versionIndex: prepared.versionIndex,
    dmlref: prepared.dmlref,
    fileName: prepared.fileName,
    content: prepared.xml,
    createdAt: prepared.at,
    createdByUserId: user.id,
    partnerOrganisationId: partner.id,
    sendArchiveId: null,
    replyCounts: null,
    withdrawn: null,
  }
  return {
    ok: true,
    data: {
      ...data,
      archive: [...data.archive, archive],
      entries: data.entries.map((e) => (e.dmrlId === dmrlId && hasEntryType(e.fields.dmentryType) ? { ...e, status: "gesendet" } : e)),
      dmrls: data.dmrls.map((d) => (d.id === dmrlId ? { ...d, status: "gesendet" } : d)),
      history: [
        ...data.history,
        history(dmrlId, user.id, prepared.at, "send", `SEND ${prepared.versionIndex} an ${organisationLabel(partner)}`),
      ],
    },
  }
}

/** SEND zurückziehen (Administrator, Pflicht-Begründung) */
export function executeWithdrawSend(data: Dataset, dmrlId: string, user: User | null, reason: string, at = new Date().toISOString()): WorkflowResult {
  const dmrl = data.dmrls.find((d) => d.id === dmrlId)
  if (!dmrl || !user) return { ok: false, message: "DMRL oder Benutzer nicht gefunden." }
  const blocked = withdrawSendBlocked(data, dmrl, user)
  if (blocked) return { ok: false, message: blocked }
  const text = reason.trim()
  if (!text) return { ok: false, message: "Bitte eine Begründung angeben." }
  const send = latestSend(data, dmrlId)!
  return {
    ok: true,
    data: {
      ...data,
      archive: data.archive.map((a) => (a.id === send.id ? { ...a, withdrawn: { at, userId: user.id, reason: text } } : a)),
      entries: data.entries.map((e) => (e.dmrlId === dmrlId && e.status === "gesendet" ? { ...e, status: "in_bearbeitung" } : e)),
      dmrls: data.dmrls.map((d) => (d.id === dmrlId ? { ...d, status: "in_bearbeitung" } : d)),
      history: [...data.history, history(dmrlId, user.id, at, "send_zurueckgezogen", `SEND ${send.versionIndex} zurückgezogen — ${text}`)],
    },
  }
}
