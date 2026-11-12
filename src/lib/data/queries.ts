import { versionIndexOf, type ArchiveEntry, type Dataset } from "./schema"

/** Letzter nicht zurückgezogener SEND einer DMRL (nach Zeitpunkt), oder null */
export function latestSend(data: Dataset, dmrlId: string): ArchiveEntry | null {
  const sends = data.archive
    .filter((item) => item.dmrlId === dmrlId && item.direction === "send" && !item.withdrawn)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return sends.at(-1) ?? null
}

/** Aktueller Versionsindex NNNNN-JJJJ einer DMRL (abgeleitet aus dem Archiv), oder null wenn nie gesendet */
export function currentVersionIndex(data: Dataset, dmrlId: string): string | null {
  const send = latestSend(data, dmrlId)
  return send ? versionIndexOf(send.dmlc) : null
}
