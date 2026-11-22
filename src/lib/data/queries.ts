import { versionIndexOf, type ArchiveEntry, type Dataset } from "./schema"

/** Letzter nicht zurückgezogener SEND einer DMRL (nach Zeitpunkt), oder null */
export function latestSend(data: Dataset, dmrlId: string): ArchiveEntry | null {
  const sends = data.archive
    .filter((item) => item.dmrlId === dmrlId && item.direction === "send" && !item.withdrawn)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return sends.at(-1) ?? null
}

/** Hat die DMRL bereits einen SEND-Archivstand (auch zurückgezogen)? Dann führt allein das Archiv den Zähler fort (PROJ-6). */
export function hasAnySend(data: Dataset, dmrlId: string): boolean {
  return data.archive.some((item) => item.dmrlId === dmrlId && item.direction === "send")
}

/** Aktueller Versionsindex NNNNN-JJJJ einer DMRL (abgeleitet aus dem Archiv), oder null wenn nie gesendet */
export function currentVersionIndex(data: Dataset, dmrlId: string): string | null {
  const send = latestSend(data, dmrlId)
  return send ? versionIndexOf(send.dmlc) : null
}

/** Letzter nicht zurückgezogener SEND mit Empfänger und Bearbeiter (für den Kopfbereich der DMRL-Ansicht) */
export function latestSendInfo(data: Dataset, dmrlId: string) {
  const send = latestSend(data, dmrlId)
  if (!send) return null
  return {
    send,
    versionIndex: versionIndexOf(send.dmlc),
    partner: data.organisations.find((org) => org.id === send.partnerOrganisationId) ?? null,
    user: data.users.find((user) => user.id === send.createdByUserId) ?? null,
  }
}

/** Datum/Uhrzeit deutsch formatiert, z. B. „29.09.2026, 11:00" */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** Datum deutsch formatiert, z. B. „29.09.2026" */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}
