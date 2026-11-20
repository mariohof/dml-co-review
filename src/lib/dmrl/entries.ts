import { ENTRY_STATUSES, type EntryFields, type EntrySnapshot, type EntryStatus } from "@/lib/data/schema"

/**
 * Darstellung und Auswertung von DMRL-Einträgen (PROJ-7 Tech Design C) — gemeinsam für
 * DMRL-Ansicht, Freigabestand (PROJ-14), Archiv (PROJ-15), Prüfberichte (PROJ-8).
 */

/** DMC aus den 11 Feldern, z. B. PHUNGUN-A-A05-40-0000-01A-000A-A (gleich für Issue 2.3/4.2/5.0) */
export function formatDmc(f: Pick<EntryFields, "modelic" | "sdc" | "chapnum" | "section" | "subsect" | "subject" | "discode" | "discodev" | "incode" | "incodev" | "itemloc">): string {
  return [
    f.modelic,
    f.sdc,
    f.chapnum,
    `${f.section}${f.subsect}`,
    f.subject,
    `${f.discode}${f.discodev}`,
    `${f.incode}${f.incodev}`,
    f.itemloc,
  ].join("-")
}

/** Feste Sortierung nach DMC */
export function compareByDmc(a: { fields: EntryFields }, b: { fields: EntryFields }): number {
  return formatDmc(a.fields).localeCompare(formatDmc(b.fields), "de", { numeric: false, sensitivity: "variant" })
}

export const ENTRY_STATUS_LABEL: Record<EntryStatus, string> = {
  in_bearbeitung: "In Bearbeitung",
  gesendet: "Gesendet",
  freigegeben: "Freigegeben",
  zu_ueberarbeiten: "Zu überarbeiten",
}

/** Eintragstyp (/dml/dmentry/@type) */
export const ENTRY_TYPES = ["n", "c", "d"] as const
export type EntryTypeFilter = (typeof ENTRY_TYPES)[number] | "ohne"

export const ENTRY_TYPE_LABEL: Record<(typeof ENTRY_TYPES)[number], string> = {
  n: "neu",
  c: "geändert",
  d: "Löschung",
}

/** DM-Ausgabetyp (/dml/dmentry/addresdm/issno/@type) = deleted → Kennzeichen „DM gelöscht" */
export const isDmDeleted = (fields: EntryFields) => fields.type === "deleted"

export interface EntryFilter {
  status: EntryStatus | "alle"
  type: EntryTypeFilter | "alle"
  search: string
}

export const EMPTY_FILTER: EntryFilter = { status: "alle", type: "alle", search: "" }

export function isFilterActive(filter: EntryFilter): boolean {
  return filter.status !== "alle" || filter.type !== "alle" || filter.search.trim() !== ""
}

/** Filtern nach Eintragsstatus, Eintragstyp und Suche (DMC, Tech Name, Info Name; ohne Groß-/Kleinschreibung); sortiert nach DMC */
export function filterEntries<T extends Pick<EntrySnapshot, "status" | "fields">>(entries: T[], filter: EntryFilter): T[] {
  const term = filter.search.trim().toLocaleLowerCase("de")
  return entries
    .filter((entry) => filter.status === "alle" || entry.status === filter.status)
    .filter((entry) => {
      if (filter.type === "alle") return true
      if (filter.type === "ohne") return entry.fields.dmentryType === ""
      return entry.fields.dmentryType === filter.type
    })
    .filter((entry) => {
      if (!term) return true
      return [formatDmc(entry.fields), entry.fields.techname, entry.fields.infoname].some((value) =>
        value.toLocaleLowerCase("de").includes(term)
      )
    })
    .sort(compareByDmc)
}

/** Anzahl je Eintragsstatus + Gesamt */
export function countByStatus(entries: Pick<EntrySnapshot, "status">[]): Record<EntryStatus, number> & { gesamt: number } {
  const counts = Object.fromEntries(ENTRY_STATUSES.map((status) => [status, 0])) as Record<EntryStatus, number>
  for (const entry of entries) counts[entry.status] += 1
  return { ...counts, gesamt: entries.length }
}

/** Beschriftungen aller 27 Felder für das Detailfenster */
export const FIELD_LABEL: Record<keyof EntryFields, string> = {
  dmentryType: "Eintragstyp (dmentry/@type)",
  modelic: "Model Ident Code",
  sdc: "System Difference Code",
  chapnum: "System (chapnum)",
  section: "Subsystem (section)",
  subsect: "Sub-Subsystem (subsect)",
  subject: "Unit/Assembly (subject)",
  discode: "Disassembly Code",
  discodev: "Disassembly Code Variant",
  incode: "Info Code",
  incodev: "Info Code Variant",
  itemloc: "Item Location Code",
  techname: "Tech Name",
  infoname: "Info Name",
  language: "Sprache",
  country: "Land",
  security: "Sicherheitseinstufung",
  rpc: "Verantwortliche Firma (rpc)",
  rpcname: "Firmenname (rpcname)",
  issno: "Ausgabenummer (issno)",
  type: "DM-Ausgabetyp (issno/@type)",
  day: "Tag",
  month: "Monat",
  year: "Jahr",
  answer: "Antwort des Empfängers",
  answer_comment: "Kommentar des Empfängers",
  remarks: "Bemerkung",
}
