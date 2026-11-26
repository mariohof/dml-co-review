import { z } from "zod"

/** Aktuelle Version des gespeicherten Datenformats. Bei inkompatiblen Modelländerungen erhöhen. */
export const DATA_FORMAT_VERSION = 2

/**
 * CSV-Felder eines DMRL-Eintrags in fester Reihenfolge (für alle S1000D-Versionen identisch).
 * Diese Reihenfolge ist zugleich die Spaltenfolge der Check-out-/Check-in-CSV (PROJ-8, PROJ-9).
 * Siehe docs/dmrl-mapping.md.
 */
export const ENTRY_FIELD_NAMES = [
  "dmentryType",
  "modelic",
  "sdc",
  "chapnum",
  "section",
  "subsect",
  "subject",
  "discode",
  "discodev",
  "incode",
  "incodev",
  "itemloc",
  "techname",
  "infoname",
  "language",
  "country",
  "security",
  "rpc",
  "rpcname",
  "issno",
  "type",
  "day",
  "month",
  "year",
  "answer",
  "answer_comment",
  /** Zeitpunkt der Übernahme der Antwort (ISO 8601 Ortszeit, nur CSV/Anwendung, nicht im XML) — PROJ-13 Refinement 2026-11-21 */
  "answer_timestamp",
  "remarks",
  // Informationsfelder (PROJ-9 Refinement 2026-11-26) — siehe INFO_FIELD_NAMES
  "orig",
  "applic_type",
  "applic_model",
  "applic_version",
  "rfu",
  "dtd-schema",
  "spec",
  "io-pm",
] as const

export type EntryFieldName = (typeof ENTRY_FIELD_NAMES)[number]

/**
 * Informationsfelder (PROJ-9 Refinement 2026-11-26): vom Bearbeiter in Excel gepflegt, je Eintrag gespeichert, ohne Prüfung.
 * Nicht in SEND/REPLY-XML; beim Check-in getrennt verglichen (keine fachliche Änderung), in der REPLY-Prüfung ausgenommen.
 */
export const INFO_FIELD_NAMES = [
  "orig",
  "applic_type",
  "applic_model",
  "applic_version",
  "rfu",
  "dtd-schema",
  "spec",
  "io-pm",
] as const satisfies readonly EntryFieldName[]
export type InfoFieldName = (typeof INFO_FIELD_NAMES)[number]
export const isInfoField = (name: string): name is InfoFieldName => (INFO_FIELD_NAMES as readonly string[]).includes(name)

/** Berechnete Spalte mit dem DMC (Schreibweise der Anwendung) — nur in Dateien, nie gespeichert (Refinement 2026-11-26) */
export const DMC_COLUMN = "dmc"

/** Die 28 Felder vor den Informationsfeldern (Dateiaufbau bis 25.11.2026) */
export const CORE_FIELD_NAMES = ENTRY_FIELD_NAMES.filter((name) => !isInfoField(name))

/**
 * Spalten einer Datei mit Eintragstabelle (Check-out, Check-in, Export, Freigabestand, PROJ-20) — 37 Spalten:
 * 28 bisherige Felder, `dmc`, 8 Informationsfelder (PROJ-9 Refinement 2026-11-26).
 */
export const ENTRY_FILE_COLUMNS: readonly (EntryFieldName | typeof DMC_COLUMN)[] = [...CORE_FIELD_NAMES, DMC_COLUMN, ...INFO_FIELD_NAMES]

// Alle Felder als Text, damit führende Nullen erhalten bleiben. Fachliche Prüfung: PROJ-8.
export const entryFieldsSchema = z.object({
  ...(Object.fromEntries(ENTRY_FIELD_NAMES.map((name) => [name, z.string()])) as Record<EntryFieldName, z.ZodString>),
  // Bestehende Daten ohne answer_timestamp bleiben gültig und erhalten ein leeres Feld (PROJ-13, Refinement 2026-11-21)
  answer_timestamp: z.string().default(""),
  // Bestehende Daten ohne Informationsfelder bleiben gültig, die Felder sind leer (PROJ-9, Refinement 2026-11-26)
  ...(Object.fromEntries(INFO_FIELD_NAMES.map((name) => [name, z.string().default("")])) as Record<InfoFieldName, z.ZodDefault<z.ZodString>>),
})
export type EntryFields = z.infer<typeof entryFieldsSchema>

export function emptyEntryFields(): EntryFields {
  return Object.fromEntries(ENTRY_FIELD_NAMES.map((name) => [name, ""])) as EntryFields
}

const id = z.string().min(1)
const timestamp = z.string().min(1)

// ---------------------------------------------------------------- Stammdaten

export const organisationSchema = z.object({
  id,
  /** CAGE-Code, 5 Zeichen, entspricht `sendid` im DML-Code (PROJ-4) */
  code: z.string().min(1),
  name: z.string().min(1),
})
export type Organisation = z.infer<typeof organisationSchema>

export const USER_ROLES = ["administrator", "bearbeiter"] as const
export type UserRole = (typeof USER_ROLES)[number]

export const userSchema = z.object({
  id,
  name: z.string().min(1),
  role: z.enum(USER_ROLES),
  active: z.boolean(),
  /** Genau ein Benutzer ist das Systemkonto „Administrator" (PROJ-2/3) */
  isSystemAccount: z.boolean(),
})
export type User = z.infer<typeof userSchema>

export const S1000D_ISSUES = ["2.3", "4.2", "5.0", "6.0"] as const
export type S1000dIssue = (typeof S1000D_ISSUES)[number]

export const systemSchema = z.object({
  id,
  name: z.string().min(1),
  description: z.string(),
  s1000dIssue: z.enum(S1000D_ISSUES),
  /** Model Ident Code */
  modelic: z.string().min(1),
})
export type DmrlSystem = z.infer<typeof systemSchema>

// ---------------------------------------------------------------- DML-Code

export const dmlCodeSchema = z.object({
  modelic: z.string(),
  sendid: z.string(),
  dmltype: z.string(),
  diyear: z.string(),
  seqnum: z.string(),
})
export type DmlCode = z.infer<typeof dmlCodeSchema>

export const issueNumberSchema = z.object({
  issno: z.string(),
  inwork: z.string(),
  type: z.string(),
})
export type IssueNumber = z.infer<typeof issueNumberSchema>

export const dmlRefSchema = z.object({
  dmlc: dmlCodeSchema,
  issno: issueNumberSchema.nullable(),
})
export type DmlRef = z.infer<typeof dmlRefSchema>

/** Kopfdaten einer DML-Datei (Ergebnis des DML-Lesers) */
export const dmlHeaderSchema = z.object({
  direction: z.enum(["send", "reply"]),
  dmlc: dmlCodeSchema,
  issno: issueNumberSchema,
  issdate: z.object({ day: z.string(), month: z.string(), year: z.string() }),
  security: z.string(),
  dmlref: dmlRefSchema.nullable(),
  remarks: z.string(),
})
export type DmlHeader = z.infer<typeof dmlHeaderSchema>

// ---------------------------------------------------------------- DMRL & Einträge

export const DMRL_STATUSES = ["in_bearbeitung", "gesendet", "freigegeben"] as const
export type DmrlStatus = (typeof DMRL_STATUSES)[number]

export const ENTRY_STATUSES = ["in_bearbeitung", "gesendet", "freigegeben", "zu_ueberarbeiten"] as const
export type EntryStatus = (typeof ENTRY_STATUSES)[number]

export const DML_TYPES = ["c", "p", "s"] as const

/** Sicherheitseinstufung: zwei Ziffern 01–20 (Schemas 4.2/5.0) */
export const SECURITY_PATTERN = /^(0[1-9]|1[0-9]|20)$/
/** Versionsindex NNNNN-JJJJ, Nummer 00001–99999 (PROJ-6, Refinement 2026-11-22) */
export const VERSION_INDEX_PATTERN = /^(?!00000)\d{5}-\d{4}$/

/** Eintrag ohne DMRL-Bezug — für Kopien in Sperre und Freigabestand */
export const entrySnapshotSchema = z.object({
  id,
  status: z.enum(ENTRY_STATUSES),
  fields: entryFieldsSchema,
})
export type EntrySnapshot = z.infer<typeof entrySnapshotSchema>

export const dmrlEntrySchema = entrySnapshotSchema.extend({ dmrlId: id })
export type DmrlEntry = z.infer<typeof dmrlEntrySchema>

export const dmrlLockSchema = z.object({
  userId: id,
  since: timestamp,
  /** Stand aller Einträge beim Check-out: Vergleichsbasis Check-in, erneuter Download (PROJ-9/10) */
  entries: z.array(entrySnapshotSchema),
})
export type DmrlLock = z.infer<typeof dmrlLockSchema>

export const releaseProofSchema = z.object({
  at: timestamp,
  /** REPLY, durch den freigegeben wurde; null = Übernahme Bestand per Check-in (PROJ-10, Refinement 2026-11-18) */
  replyArchiveId: id.nullable(),
  userId: id,
})
export type ReleaseProof = z.infer<typeof releaseProofSchema>

export const dmrlSchema = z.object({
  id,
  systemId: id,
  originatorOrganisationId: id,
  dmlType: z.enum(DML_TYPES),
  security: z.string().regex(SECURITY_PATTERN),
  /**
   * Versionsindex des ersten SEND (PROJ-6, Refinement 2026-11-22) — erlaubt die Fortsetzung eines laufenden Austauschs.
   * Optional: ältere Bestände ohne Angabe verhalten sich wie bisher (00001 im Jahr des ersten SEND).
   */
  firstSendVersionIndex: z.string().regex(VERSION_INDEX_PATTERN).optional(),
  /** Berechtigte Bearbeiter (PROJ-17) */
  editorUserIds: z.array(id),
  status: z.enum(DMRL_STATUSES),
  /** Gesamtbemerkung des Empfängers aus dem letzten REPLY (PROJ-13) */
  partnerRemarks: z.string(),
  /** Nachweis der letzten Freigabe (PROJ-14); bleibt auch nach Aufhebung der Freigabe als „letzte Freigabe" */
  release: releaseProofSchema.nullable(),
  lock: dmrlLockSchema.nullable(),
})
export type Dmrl = z.infer<typeof dmrlSchema>

// ---------------------------------------------------------------- Archiv, Freigabestände, Verlauf

export const archiveEntrySchema = z.object({
  id,
  dmrlId: id,
  direction: z.enum(["send", "reply"]),
  dmlc: dmlCodeSchema,
  versionIndex: z.string().regex(/^\d{5}-\d{4}$/),
  dmlref: dmlRefSchema.nullable(),
  fileName: z.string().min(1),
  /** Dateiinhalt unverändert (byte-genau als Text) */
  content: z.string().min(1),
  createdAt: timestamp,
  createdByUserId: id,
  /** SEND: gewählter Empfänger; REPLY: Absender */
  partnerOrganisationId: id,
  /** nur REPLY: zugehöriger SEND-Archivstand */
  sendArchiveId: id.nullable(),
  /** nur REPLY: Ergebnis der Übernahme */
  replyCounts: z.object({ approved: z.number().int().min(0), rework: z.number().int().min(0) }).nullable(),
  /** nur SEND: zurückgezogen (PROJ-12) */
  withdrawn: z.object({ at: timestamp, userId: id, reason: z.string().min(1) }).nullable(),
})
export type ArchiveEntry = z.infer<typeof archiveEntrySchema>

export const releaseSnapshotSchema = z.object({
  id,
  dmrlId: id,
  createdAt: timestamp,
  /** null = Freigabe durch Übernahme Bestand per Check-in (PROJ-10, Refinement 2026-11-18) */
  replyArchiveId: id.nullable(),
  userId: id,
  entries: z.array(entrySnapshotSchema),
})
export type ReleaseSnapshot = z.infer<typeof releaseSnapshotSchema>

export const HISTORY_ACTIONS = [
  "check_out",
  "check_out_zurueckgenommen",
  "sperre_aufgehoben",
  "check_in",
  "check_in_abgelehnt",
  "send",
  "send_fehlgeschlagen",
  "send_zurueckgezogen",
  "reply_uebernommen",
  "reply_abgelehnt",
  "kopfdaten_geaendert",
] as const
export type HistoryAction = (typeof HISTORY_ACTIONS)[number]

export const historyEntrySchema = z.object({
  id,
  dmrlId: id,
  at: timestamp,
  userId: id,
  action: z.enum(HISTORY_ACTIONS),
  details: z.string(),
})
export type HistoryEntry = z.infer<typeof historyEntrySchema>

// ---------------------------------------------------------------- Gesamtpaket

export const datasetSchema = z
  .object({
    formatVersion: z.literal(DATA_FORMAT_VERSION),
    organisations: z.array(organisationSchema),
    users: z.array(userSchema),
    systems: z.array(systemSchema),
    dmrls: z.array(dmrlSchema),
    entries: z.array(dmrlEntrySchema),
    archive: z.array(archiveEntrySchema),
    releases: z.array(releaseSnapshotSchema),
    history: z.array(historyEntrySchema),
  })
  .superRefine((data, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message })
    const ids = (list: { id: string }[]) => new Set(list.map((item) => item.id))
    const orgIds = ids(data.organisations)
    const userIds = ids(data.users)
    const systemIds = ids(data.systems)
    const dmrlIds = ids(data.dmrls)
    const archiveIds = ids(data.archive)

    // Eindeutige IDs je Liste
    for (const [name, list] of Object.entries({
      organisations: data.organisations,
      users: data.users,
      systems: data.systems,
      dmrls: data.dmrls,
      entries: data.entries,
      archive: data.archive,
      releases: data.releases,
      history: data.history,
    })) {
      if (ids(list).size !== list.length) issue(`${name}: doppelte IDs`)
    }

    // Systemkonto: genau eines, aktiv, Rolle Administrator (PROJ-2)
    const systemAccounts = data.users.filter((user) => user.isSystemAccount)
    if (systemAccounts.length !== 1) issue("Es muss genau ein Systemkonto „Administrator\" geben")
    for (const account of systemAccounts) {
      if (!account.active || account.role !== "administrator") {
        issue("Das Systemkonto muss aktiv sein und die Rolle Administrator haben")
      }
    }

    // Ein System hat höchstens eine DMRL (PROJ-5)
    const systemsWithDmrl = new Set<string>()
    for (const dmrl of data.dmrls) {
      if (systemsWithDmrl.has(dmrl.systemId)) issue(`System ${dmrl.systemId}: mehr als eine DMRL`)
      systemsWithDmrl.add(dmrl.systemId)
      if (!systemIds.has(dmrl.systemId)) issue(`DMRL ${dmrl.id}: System fehlt`)
      if (!orgIds.has(dmrl.originatorOrganisationId)) issue(`DMRL ${dmrl.id}: Originator fehlt`)
      for (const userId of dmrl.editorUserIds) {
        if (!userIds.has(userId)) issue(`DMRL ${dmrl.id}: Bearbeiter ${userId} fehlt`)
      }
      if (dmrl.lock && !userIds.has(dmrl.lock.userId)) issue(`DMRL ${dmrl.id}: Sperrinhaber fehlt`)
      if (dmrl.release) {
        if (!userIds.has(dmrl.release.userId)) issue(`DMRL ${dmrl.id}: Freigabe-Benutzer fehlt`)
        if (dmrl.release.replyArchiveId && !archiveIds.has(dmrl.release.replyArchiveId)) issue(`DMRL ${dmrl.id}: Freigabe-REPLY fehlt`)
      }

      // Grundregel PROJ-14: freigegeben ⇔ mindestens ein Eintrag und alle Einträge freigegeben
      const entries = data.entries.filter((entry) => entry.dmrlId === dmrl.id)
      const allReleased = entries.length > 0 && entries.every((entry) => entry.status === "freigegeben")
      if ((dmrl.status === "freigegeben") !== allReleased) {
        issue(`DMRL ${dmrl.id}: Status passt nicht zum Status der Einträge`)
      }
    }

    for (const entry of data.entries) {
      if (!dmrlIds.has(entry.dmrlId)) issue(`Eintrag ${entry.id}: DMRL fehlt`)
    }

    for (const item of data.archive) {
      if (!dmrlIds.has(item.dmrlId)) issue(`Archivstand ${item.id}: DMRL fehlt`)
      if (!userIds.has(item.createdByUserId)) issue(`Archivstand ${item.id}: Benutzer fehlt`)
      if (!orgIds.has(item.partnerOrganisationId)) issue(`Archivstand ${item.id}: Empfänger fehlt`)
      if (item.direction === "reply") {
        if (!item.sendArchiveId || !archiveIds.has(item.sendArchiveId)) {
          issue(`Archivstand ${item.id}: zugehöriger SEND fehlt`)
        }
        if (item.withdrawn) issue(`Archivstand ${item.id}: REPLY kann nicht zurückgezogen sein`)
      } else if (item.sendArchiveId || item.replyCounts) {
        issue(`Archivstand ${item.id}: SEND mit REPLY-Angaben`)
      }
      if (item.withdrawn && !userIds.has(item.withdrawn.userId)) {
        issue(`Archivstand ${item.id}: Benutzer des Zurückziehens fehlt`)
      }
    }

    for (const release of data.releases) {
      if (!dmrlIds.has(release.dmrlId)) issue(`Freigabestand ${release.id}: DMRL fehlt`)
      if (!userIds.has(release.userId)) issue(`Freigabestand ${release.id}: Benutzer fehlt`)
      if (release.replyArchiveId && !archiveIds.has(release.replyArchiveId)) issue(`Freigabestand ${release.id}: REPLY fehlt`)
    }

    for (const entry of data.history) {
      if (!dmrlIds.has(entry.dmrlId)) issue(`Verlaufseintrag ${entry.id}: DMRL fehlt`)
      if (!userIds.has(entry.userId)) issue(`Verlaufseintrag ${entry.id}: Benutzer fehlt`)
    }
  })

export type Dataset = z.infer<typeof datasetSchema>

/** Versionsindex NNNNN-JJJJ aus einem DML-Code */
export function versionIndexOf(dmlc: DmlCode): string {
  return `${dmlc.seqnum}-${dmlc.diyear}`
}
