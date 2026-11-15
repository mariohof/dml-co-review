import { readDml, type ParsedDml } from "@/lib/data/dml-reader"
import { versionIndexOf, type ArchiveEntry, type Dataset, type DmlRef, type HistoryAction, type HistoryEntry } from "@/lib/data/schema"

/** Archiv je DMRL (PROJ-15) — nur lesend */

/** Archivstände einer DMRL, neueste oben */
export function archiveEntries(data: Dataset, dmrlId: string): ArchiveEntry[] {
  return data.archive.filter((a) => a.dmrlId === dmrlId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Kurzbezeichnung eines Stands: „SEND 00002-2026" bzw. „REPLY C1234 00001-2026" */
export function archiveLabel(entry: Pick<ArchiveEntry, "direction" | "dmlc">): string {
  return entry.direction === "send" ? `SEND ${versionIndexOf(entry.dmlc)}` : `REPLY ${entry.dmlc.sendid} ${versionIndexOf(entry.dmlc)}`
}

/** Kette, neueste zuerst: „SEND 00002-2026 → REPLY C1234 00001-2026 → SEND 00001-2026" */
export const archiveChain = (entries: ArchiveEntry[]) => entries.map(archiveLabel).join(" → ")

/** Bezug (dmlref) lesbar; erster SEND verweist auf sich selbst */
export function dmlRefLabel(entry: Pick<ArchiveEntry, "dmlc" | "dmlref">): string {
  const ref: DmlRef | null = entry.dmlref
  if (!ref) return "—"
  const same =
    ref.dmlc.sendid === entry.dmlc.sendid && ref.dmlc.seqnum === entry.dmlc.seqnum && ref.dmlc.diyear === entry.dmlc.diyear
  if (same) return "eigener Stand (erster SEND)"
  return `${ref.dmlc.sendid} ${versionIndexOf(ref.dmlc)}`
}

/** Benutzername aktuell über die ID; deaktivierte Benutzer gekennzeichnet */
export function userLabel(data: Dataset, userId: string): { name: string; inactive: boolean } {
  const user = data.users.find((u) => u.id === userId)
  return user ? { name: user.name, inactive: !user.active } : { name: "unbekannt", inactive: false }
}

/** Organisation aktuell über die ID (CAGE-Code + aktueller Name) */
export function organisationLabelById(data: Dataset, id: string): string {
  const org = data.organisations.find((o) => o.id === id)
  return org ? `${org.code} ${org.name}` : "unbekannt"
}

/** Archivierte Datei mit dem DML-Leser des Issues neu einlesen; null, wenn nicht lesbar */
export function readArchived(data: Dataset, entry: ArchiveEntry): ParsedDml | null {
  const dmrl = data.dmrls.find((d) => d.id === entry.dmrlId)
  const system = data.systems.find((s) => s.id === dmrl?.systemId)
  if (!system) return null
  try {
    return readDml(entry.content.replace(/^﻿/, ""), system.s1000dIssue)
  } catch {
    return null
  }
}

/**
 * Dateiinhalt wieder als Bytes in der Kodierung laut XML-Deklaration — damit der Download byte-genau der
 * gesendeten bzw. importierten Datei entspricht (UTF-8 inkl. BOM, ISO-8859-1, UTF-16; Zeilenenden bleiben).
 */
export function archiveFileBytes(content: string): Uint8Array {
  const encoding = /^﻿?<\?xml[^>]*encoding\s*=\s*["']([A-Za-z0-9._-]+)["']/.exec(content)?.[1]?.toLowerCase() ?? "utf-8"
  if (["iso-8859-1", "latin1", "iso8859-1", "l1"].includes(encoding)) {
    return Uint8Array.from(content, (char) => char.charCodeAt(0) & 0xff)
  }
  if (encoding.startsWith("utf-16")) {
    // UTF-16 (BUG-QA1-1): Little Endian mit BOM — wie beim Import gelesen, BOM ergänzt, falls er fehlte
    const text = content.startsWith("\ufeff") ? content : `\ufeff${content}`
    const bytes = new Uint8Array(text.length * 2)
    for (let i = 0; i < text.length; i++) {
      bytes[i * 2] = text.charCodeAt(i) & 0xff
      bytes[i * 2 + 1] = text.charCodeAt(i) >> 8
    }
    return bytes
  }
  return new TextEncoder().encode(content)
}

// ---------------------------------------------------------------- Verlauf

export const HISTORY_ACTION_LABEL: Record<HistoryAction, string> = {
  check_out: "Check-out",
  check_out_zurueckgenommen: "Check-out zurückgenommen",
  sperre_aufgehoben: "Sperre aufgehoben durch Administrator",
  check_in: "Check-in",
  check_in_abgelehnt: "Check-in abgelehnt",
  send: "SEND",
  send_fehlgeschlagen: "SEND fehlgeschlagen",
  send_zurueckgezogen: "SEND zurückgezogen",
  reply_uebernommen: "REPLY übernommen",
  reply_abgelehnt: "REPLY abgelehnt",
  kopfdaten_geaendert: "Kopfdaten geändert",
}

export const HISTORY_FILTERS = {
  alle: { label: "Alle Aktionen", actions: null },
  checkout: { label: "Check-out / Check-in", actions: ["check_out", "check_out_zurueckgenommen", "sperre_aufgehoben", "check_in", "check_in_abgelehnt"] },
  send: { label: "SEND", actions: ["send", "send_fehlgeschlagen", "send_zurueckgezogen"] },
  reply: { label: "REPLY", actions: ["reply_uebernommen", "reply_abgelehnt"] },
  kopfdaten: { label: "Kopfdaten", actions: ["kopfdaten_geaendert"] },
} as const satisfies Record<string, { label: string; actions: readonly HistoryAction[] | null }>

export type HistoryFilter = keyof typeof HISTORY_FILTERS

/** Verlauf einer DMRL, neueste oben, optional nach Aktionsart gefiltert */
export function historyEntries(data: Dataset, dmrlId: string, filter: HistoryFilter = "alle"): HistoryEntry[] {
  const actions: readonly HistoryAction[] | null = HISTORY_FILTERS[filter].actions
  return data.history
    .filter((h) => h.dmrlId === dmrlId && (!actions || actions.includes(h.action)))
    .sort((a, b) => b.at.localeCompare(a.at))
}
