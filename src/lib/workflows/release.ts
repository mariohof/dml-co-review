import { formatDate } from "@/lib/data/queries"
import {
  versionIndexOf,
  type ArchiveEntry,
  type Dataset,
  type DmlCode,
  type Dmrl,
  type Organisation,
  type ReleaseSnapshot,
  type User,
} from "@/lib/data/schema"
import { writeEntriesCsv } from "@/lib/files/csv-writer"
import { isoDate, writeExportDml } from "./export"

/** Freigabe-Nachweis und Freigabestand (PROJ-14) */

/** Alle Freigabestände einer DMRL, neuester zuerst */
export function releaseSnapshots(data: Dataset, dmrlId: string): ReleaseSnapshot[] {
  return data.releases.filter((r) => r.dmrlId === dmrlId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** „Letzte Freigabe" = neuester Freigabestand */
export const latestRelease = (data: Dataset, dmrlId: string): ReleaseSnapshot | null => releaseSnapshots(data, dmrlId)[0] ?? null

export interface ReleaseInfo {
  snapshot: ReleaseSnapshot
  reply: ArchiveEntry | null
  /** SEND, auf den der REPLY geantwortet hat */
  send: ArchiveEntry | null
  partner: Organisation | null
  user: User | null
  /** Versionsindex des REPLY */
  versionIndex: string
}

/** Freigabe durch Übernahme Bestand per Check-in statt durch REPLY (PROJ-10, Refinement 2026-11-18) */
export const isCheckinRelease = (snapshot: Pick<ReleaseSnapshot, "replyArchiveId">): boolean => snapshot.replyArchiveId === null

export const CHECKIN_RELEASE_LABEL = "Übernahme per Check-in"

export function releaseInfo(data: Dataset, snapshot: ReleaseSnapshot): ReleaseInfo {
  const reply = snapshot.replyArchiveId ? (data.archive.find((a) => a.id === snapshot.replyArchiveId) ?? null) : null
  return {
    snapshot,
    reply,
    send: reply?.sendArchiveId ? (data.archive.find((a) => a.id === reply.sendArchiveId) ?? null) : null,
    partner: reply ? (data.organisations.find((o) => o.id === reply.partnerOrganisationId) ?? null) : null,
    // deaktivierte Benutzer bleiben mit Namen sichtbar
    user: data.users.find((u) => u.id === snapshot.userId) ?? null,
    versionIndex: reply ? versionIndexOf(reply.dmlc) : "—",
  }
}

/** Herkunft der Freigabe: „REPLY C1234 00002-2026" bzw. „Übernahme per Check-in" */
export function releaseSourceLabel(info: ReleaseInfo): string {
  if (isCheckinRelease(info.snapshot)) return CHECKIN_RELEASE_LABEL
  return ["REPLY", info.partner?.code, info.versionIndex].filter(Boolean).join(" ")
}

/** „12.11.2026, REPLY C1234 00002-2026" bzw. „18.11.2026, Übernahme per Check-in" */
export function releaseLabel(info: ReleaseInfo): string {
  if (isCheckinRelease(info.snapshot)) return `${formatDate(info.snapshot.createdAt)}, ${CHECKIN_RELEASE_LABEL}`
  return `${formatDate(info.snapshot.createdAt)}, ${["REPLY", info.partner?.code, info.versionIndex].filter(Boolean).join(" ")}`
}

/** DML-{MI}-{CAGE}-{DML-Typ}-Freigabe-{JJJJ-MM-TT} (Datum der Freigabe) */
export function releaseFileBase(data: Dataset, dmrl: Dmrl, snapshot: ReleaseSnapshot): string {
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  const originator = data.organisations.find((o) => o.id === dmrl.originatorOrganisationId)
  return `DML-${system?.modelic ?? "DMRL"}-${originator?.code ?? "XXXXX"}-${dmrl.dmlType.toUpperCase()}-Freigabe-${isoDate(snapshot.createdAt)}`
}

/** CSV im Aufbau von PROJ-9 (27 Spalten, nach DMC) aus dem Freigabestand */
export function releaseCsv(data: Dataset, dmrl: Dmrl, snapshot: ReleaseSnapshot): { fileName: string; content: string } {
  return { fileName: `${releaseFileBase(data, dmrl, snapshot)}.csv`, content: writeEntriesCsv(snapshot.entries) }
}

/**
 * XML mit der Kopf-Variante „Export" (PROJ-18, writeExportDml): Richtung send, issno 000 / inwork 01, ohne answer;
 * dmlc = SEND, auf den der Freigabe-REPLY antwortete (kein neuer Versionsindex), dmlref = Freigabe-REPLY,
 * remarks „Freigabestand vom … — Export vom …".
 */
export function releaseXml(data: Dataset, dmrl: Dmrl, snapshot: ReleaseSnapshot, at = new Date().toISOString()) {
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  if (!system) throw new Error("System der DMRL fehlt.")
  if (snapshot.entries.length === 0) throw new Error("Der Freigabestand hat keine Einträge.")
  const info = releaseInfo(data, snapshot)
  const originator = data.organisations.find((o) => o.id === dmrl.originatorOrganisationId)
  const ownDmlc: DmlCode = info.send?.dmlc ?? {
    modelic: system.modelic,
    sendid: originator?.code ?? "",
    dmltype: dmrl.dmlType,
    diyear: String(new Date(snapshot.createdAt).getFullYear()),
    seqnum: "00001", // Schema: positiveInteger — 00000 ist ungültig (Entscheidung PO 2026-11-13)
  }
  const content = writeExportDml({
    dmrl,
    issue: system.s1000dIssue,
    dmlc: ownDmlc,
    dmlref: { dmlc: info.reply?.dmlc ?? ownDmlc, issno: { issno: "001", inwork: "00", type: "" } },
    remarks: `Freigabestand vom ${formatDate(snapshot.createdAt)} — Export vom ${formatDate(at)}`,
    entries: snapshot.entries,
    at,
  })
  return { fileName: `${releaseFileBase(data, dmrl, snapshot)}.XML`, content, issue: system.s1000dIssue }
}
