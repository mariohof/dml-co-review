import { z } from "zod"

import { newId } from "@/lib/ids"
import {
  DML_TYPES,
  SECURITY_PATTERN,
  VERSION_INDEX_PATTERN,
  versionIndexOf,
  type Dataset,
  type Dmrl,
  type HistoryEntry,
} from "@/lib/data/schema"
import { hasAnySend } from "@/lib/data/queries"
import { isDmrlUsedInWorkflow } from "./workflow-usage"

/** Fachregeln „DMRL anlegen" (PROJ-6, Tech Design C) — ohne Oberflächenbezug */

export type DmlType = (typeof DML_TYPES)[number]

export const DML_TYPE_LABEL: Record<DmlType, string> = {
  c: "c – vollständig",
  p: "p – partiell",
  s: "s – Status",
}

export const SECURITY_ERROR = "Sicherheitseinstufung muss zweistellig sein (01–20)."
export const VERSION_INDEX_ERROR = "Versionsindex muss das Format NNNNN-JJJJ haben (00001–99999)."
export const versionIndexYearError = (year: string) => `Das Jahr muss das aktuelle Jahr (${year}) sein.`
export const VERSION_INDEX_HINT =
  "Versionsindex des ersten SEND. Bei einem bereits laufenden Austausch die nächste Nummer eintragen, die der Empfänger erwartet (z. B. 00013-2026). Danach zählt die Anwendung automatisch weiter."
export const VERSION_INDEX_LOCKED = "Versionsindex wird bereits vom SEND-Zähler fortgeführt."

const yearOf = (now: string) => String(new Date(now).getFullYear())

/**
 * Versionsindex erster SEND, wie er im Formular angezeigt wird (PROJ-6):
 * gespeicherte Vorgabe · sonst (Altbestand) Versionsindex des tatsächlich ersten SEND · sonst 00001-<aktuelles Jahr>
 */
export function firstSendVersionIndexOf(data: Dataset, dmrl: Dmrl, now: string = new Date().toISOString()): string {
  if (dmrl.firstSendVersionIndex) return dmrl.firstSendVersionIndex
  const first = data.archive
    .filter((a) => a.dmrlId === dmrl.id && a.direction === "send")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
  return first ? versionIndexOf(first.dmlc) : `00001-${yearOf(now)}`
}

/** Hinweis „Vorgabe abgelaufen", wenn der erste SEND noch aussteht und das Jahr der Vorgabe vergangen ist; sonst null */
export function expiredPresetHint(data: Dataset, dmrl: Dmrl, now: string = new Date().toISOString()): string | null {
  if (hasAnySend(data, dmrl.id) || !dmrl.firstSendVersionIndex) return null
  const year = yearOf(now)
  return dmrl.firstSendVersionIndex.endsWith(`-${year}`)
    ? null
    : `Vorgabe abgelaufen — der erste SEND erhält 00001-${year}.`
}

/** Systeme, zu denen noch keine DMRL existiert (1 System = 1 DMRL) */
export function systemsWithoutDmrl(data: Dataset) {
  return data.systems
    .filter((system) => !data.dmrls.some((dmrl) => dmrl.systemId === system.id))
    .sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))
}

export function dmrlFormSchema(data: Dataset, editingId?: string, now: string = new Date().toISOString()) {
  const freeSystems = new Set(systemsWithoutDmrl(data).map((s) => s.id))
  const editing = editingId ? data.dmrls.find((d) => d.id === editingId) : undefined
  const year = yearOf(now)
  // Jahresprüfung nur, wenn der Wert neu ist oder geändert wurde (Tech Design 2026-11-22)
  const unchanged = editing ? firstSendVersionIndexOf(data, editing, now) : null
  return z.object({
    systemId: z
      .string()
      .min(1, "Bitte ein System wählen.")
      .refine((id) => (editing ? id === editing.systemId : freeSystems.has(id)), "Zu diesem System existiert bereits eine DMRL."),
    originatorOrganisationId: z
      .string()
      .min(1, "Bitte einen Originator wählen.")
      .refine((id) => data.organisations.some((o) => o.id === id), "Bitte einen Originator wählen."),
    dmlType: z
      .string()
      .refine((v): v is DmlType => (DML_TYPES as readonly string[]).includes(v), "Bitte einen DML-Typ wählen.")
      .transform((v) => v as DmlType),
    security: z.string().trim().regex(SECURITY_PATTERN, SECURITY_ERROR),
    firstSendVersionIndex: z
      .string()
      .trim()
      .regex(VERSION_INDEX_PATTERN, VERSION_INDEX_ERROR)
      .refine((v) => v === unchanged || v.endsWith(`-${year}`), versionIndexYearError(year)),
  })
}
type FormFields = { systemId: string; originatorOrganisationId: string; security: string; firstSendVersionIndex: string }
export type DmrlFormInput = FormFields & { dmlType: string }
export type DmrlFormValues = FormFields & { dmlType: DmlType }

/** Vorbelegung des Anlegen-Dialogs; Versionsindex erster SEND = 00001-<aktuelles Jahr> */
export function dmrlFormDefaults(now: string = new Date().toISOString()): DmrlFormInput {
  return { systemId: "", originatorOrganisationId: "", dmlType: "c", security: "01", firstSendVersionIndex: `00001-${yearOf(now)}` }
}

/** Formularwerte einer bestehenden DMRL */
export function dmrlFormValuesOf(data: Dataset, dmrl: Dmrl, now: string = new Date().toISOString()): DmrlFormInput {
  return {
    systemId: dmrl.systemId,
    originatorOrganisationId: dmrl.originatorOrganisationId,
    dmlType: dmrl.dmlType,
    security: dmrl.security,
    firstSendVersionIndex: firstSendVersionIndexOf(data, dmrl, now),
  }
}

const FIXED_USED = "Wird in Workflows verwendet und kann nicht geändert werden."

export interface DmrlRights {
  used: boolean
  fieldBlocked: Record<"systemId" | "originatorOrganisationId" | "dmlType" | "security" | "firstSendVersionIndex", string | null>
  deleteBlocked: string | null
}

export function dmrlRights(data: Dataset, dmrl: Dmrl): DmrlRights {
  const used = isDmrlUsedInWorkflow(data, dmrl.id)
  const lockOwner = dmrl.lock ? data.users.find((u) => u.id === dmrl.lock?.userId)?.name ?? "unbekannt" : null
  return {
    used,
    fieldBlocked: {
      systemId: "Das System einer DMRL kann nicht geändert werden.",
      originatorOrganisationId: used ? FIXED_USED : null,
      dmlType: used ? FIXED_USED : null,
      security: null,
      // eigene Regel: änderbar bis zum ersten SEND (auch zurückgezogen), unabhängig von „im Workflow benutzt"
      firstSendVersionIndex: hasAnySend(data, dmrl.id) ? VERSION_INDEX_LOCKED : null,
    },
    deleteBlocked: used
      ? "Die DMRL ist an Workflows beteiligt und kann nicht gelöscht werden."
      : lockOwner
        ? `Die DMRL ist ausgecheckt von ${lockOwner} und kann derzeit nicht gelöscht werden.`
        : null,
  }
}

/** „DML anlegen" ist nur möglich, wenn es ein System ohne DMRL gibt */
export function createBlocked(data: Dataset): string | null {
  return systemsWithoutDmrl(data).length === 0
    ? "Kein System ohne DMRL vorhanden — legen Sie zuerst ein System an."
    : null
}

export type SaveResult = { ok: true; data: Dataset } | { ok: false; message: string }
const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Ungültige Eingabe."

export function createDmrl(data: Dataset, values: DmrlFormInput, id: string, now: string = new Date().toISOString()): SaveResult {
  const check = dmrlFormSchema(data, undefined, now).safeParse(values)
  if (!check.success) return { ok: false, message: firstIssue(check.error) }
  const dmrl: Dmrl = {
    id,
    ...check.data,
    editorUserIds: [],
    status: "in_bearbeitung",
    partnerRemarks: "",
    release: null,
    lock: null,
  }
  return { ok: true, data: { ...data, dmrls: [...data.dmrls, dmrl] } }
}

const FIELD_LABEL = {
  originatorOrganisationId: "Originator",
  dmlType: "DML-Typ",
  security: "Sicherheitseinstufung",
  firstSendVersionIndex: "Versionsindex erster SEND",
} as const

/**
 * Kopfdaten ändern. Gesperrte Felder dürfen sich nicht ändern.
 * Jede Änderung erzeugt einen Verlaufseintrag „Kopfdaten geändert" (PROJ-15) in derselben Speicherung.
 */
export function updateDmrl(
  data: Dataset,
  id: string,
  values: DmrlFormInput,
  userId: string,
  now: string = new Date().toISOString()
): SaveResult {
  const dmrl = data.dmrls.find((item) => item.id === id)
  if (!dmrl) return { ok: false, message: "DMRL nicht gefunden." }
  const check = dmrlFormSchema(data, id, now).safeParse(values)
  if (!check.success) return { ok: false, message: firstIssue(check.error) }
  const { fieldBlocked } = dmrlRights(data, dmrl)
  const current = dmrlFormValuesOf(data, dmrl, now)

  const orgLabel = (orgId: string) => data.organisations.find((o) => o.id === orgId)?.code ?? orgId
  const changes: string[] = []
  for (const field of ["originatorOrganisationId", "dmlType", "security", "firstSendVersionIndex"] as const) {
    if (check.data[field] === current[field]) continue
    if (fieldBlocked[field]) return { ok: false, message: fieldBlocked[field]! }
    const [before, after] =
      field === "originatorOrganisationId"
        ? [orgLabel(dmrl[field]), orgLabel(check.data[field])]
        : [current[field], check.data[field]]
    changes.push(`${FIELD_LABEL[field]} ${before} → ${after}`)
  }
  if (changes.length === 0) return { ok: true, data }

  const history: HistoryEntry = {
    id: newId("history"),
    dmrlId: id,
    at: now,
    userId,
    action: "kopfdaten_geaendert",
    details: `Kopfdaten geändert: ${changes.join(", ")}`,
  }
  return {
    ok: true,
    data: {
      ...data,
      dmrls: data.dmrls.map((item) =>
        item.id === id
          ? {
              ...item,
              originatorOrganisationId: check.data.originatorOrganisationId,
              dmlType: check.data.dmlType,
              security: check.data.security,
              ...(check.data.firstSendVersionIndex !== current.firstSendVersionIndex && {
                firstSendVersionIndex: check.data.firstSendVersionIndex,
              }),
            }
          : item
      ),
      history: [...data.history, history],
    },
  }
}

/** Löschen in einem Schritt: DMRL, Einträge, Berechtigungen (an der DMRL) und Verlauf */
export function deleteDmrl(data: Dataset, id: string): SaveResult {
  const dmrl = data.dmrls.find((item) => item.id === id)
  if (!dmrl) return { ok: false, message: "DMRL nicht gefunden." }
  const { deleteBlocked } = dmrlRights(data, dmrl)
  if (deleteBlocked) return { ok: false, message: deleteBlocked }
  return {
    ok: true,
    data: {
      ...data,
      dmrls: data.dmrls.filter((item) => item.id !== id),
      entries: data.entries.filter((entry) => entry.dmrlId !== id),
      history: data.history.filter((entry) => entry.dmrlId !== id),
    },
  }
}
