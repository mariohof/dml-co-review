import { z } from "zod"

import { newId } from "@/lib/ids"
import {
  DML_TYPES,
  SECURITY_PATTERN,
  type Dataset,
  type Dmrl,
  type HistoryEntry,
} from "@/lib/data/schema"
import { isDmrlUsedInWorkflow } from "./workflow-usage"

/** Fachregeln „DMRL anlegen" (PROJ-6, Tech Design C) — ohne Oberflächenbezug */

export type DmlType = (typeof DML_TYPES)[number]

export const DML_TYPE_LABEL: Record<DmlType, string> = {
  c: "c – vollständig",
  p: "p – partiell",
  s: "s – Status",
}

export const SECURITY_ERROR = "Sicherheitseinstufung muss zweistellig sein (01–20)."

/** Systeme, zu denen noch keine DMRL existiert (1 System = 1 DMRL) */
export function systemsWithoutDmrl(data: Dataset) {
  return data.systems
    .filter((system) => !data.dmrls.some((dmrl) => dmrl.systemId === system.id))
    .sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))
}

export function dmrlFormSchema(data: Dataset, editingId?: string) {
  const freeSystems = new Set(systemsWithoutDmrl(data).map((s) => s.id))
  const editing = editingId ? data.dmrls.find((d) => d.id === editingId) : undefined
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
  })
}
export type DmrlFormInput = { systemId: string; originatorOrganisationId: string; dmlType: string; security: string }
export type DmrlFormValues = { systemId: string; originatorOrganisationId: string; dmlType: DmlType; security: string }

export const DMRL_FORM_DEFAULTS: DmrlFormInput = { systemId: "", originatorOrganisationId: "", dmlType: "c", security: "01" }

const FIXED_USED = "Wird in Workflows verwendet und kann nicht geändert werden."

export interface DmrlRights {
  used: boolean
  fieldBlocked: Record<"systemId" | "originatorOrganisationId" | "dmlType" | "security", string | null>
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

export function createDmrl(data: Dataset, values: DmrlFormInput, id: string): SaveResult {
  const check = dmrlFormSchema(data).safeParse(values)
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

const FIELD_LABEL = { originatorOrganisationId: "Originator", dmlType: "DML-Typ", security: "Sicherheitseinstufung" } as const

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
  const check = dmrlFormSchema(data, id).safeParse(values)
  if (!check.success) return { ok: false, message: firstIssue(check.error) }
  const { fieldBlocked } = dmrlRights(data, dmrl)

  const orgLabel = (orgId: string) => data.organisations.find((o) => o.id === orgId)?.code ?? orgId
  const changes: string[] = []
  for (const field of ["originatorOrganisationId", "dmlType", "security"] as const) {
    if (check.data[field] === dmrl[field]) continue
    if (fieldBlocked[field]) return { ok: false, message: fieldBlocked[field]! }
    const [before, after] =
      field === "originatorOrganisationId"
        ? [orgLabel(dmrl[field]), orgLabel(check.data[field])]
        : [dmrl[field], check.data[field]]
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
