import { z } from "zod"

import type { Dataset, Organisation } from "@/lib/data/schema"
import { isOrganisationUsedInWorkflow } from "./workflow-usage"

/** Fachregeln der Organisationsverwaltung (PROJ-4, Tech Design C) — ohne Oberflächenbezug */

export const ORG_NAME_MIN = 2
export const ORG_NAME_MAX = 120
export const CAGE_PATTERN = /^[A-Z0-9]{5}$/

export const normalizeCage = (code: string) => code.toUpperCase()

export function isCageTaken(data: Dataset, code: string, exceptId?: string): boolean {
  const key = normalizeCage(code.trim())
  return data.organisations.some((org) => org.id !== exceptId && org.code === key)
}

export function organisationFormSchema(data: Dataset, exceptId?: string) {
  return z.object({
    code: z
      .string()
      .transform(normalizeCage)
      .pipe(
        z
          .string()
          .regex(CAGE_PATTERN, "CAGE-Code muss aus genau 5 Buchstaben/Ziffern bestehen.")
          .refine((code) => !isCageTaken(data, code, exceptId), "CAGE-Code bereits vergeben.")
      ),
    name: z
      .string()
      .transform((name) => name.trim())
      .pipe(
        z
          .string()
          .min(1, "Bitte einen Namen eingeben.")
          .min(ORG_NAME_MIN, `Der Name muss mindestens ${ORG_NAME_MIN} Zeichen lang sein.`)
          .max(ORG_NAME_MAX, `Der Name darf höchstens ${ORG_NAME_MAX} Zeichen lang sein.`)
      ),
  })
}
export type OrganisationFormValues = { code: string; name: string }

/** Systemnamen der DMRLs, denen die Organisation als Originator zugeordnet ist */
export function assignedDmrlNames(data: Dataset, organisationId: string): string[] {
  return data.dmrls
    .filter((dmrl) => dmrl.originatorOrganisationId === organisationId)
    .map((dmrl) => data.systems.find((s) => s.id === dmrl.systemId)?.name ?? "unbekanntes System")
}

export interface OrganisationRights {
  used: boolean
  assignedCount: number
  /** null = erlaubt; sonst Begründung */
  deleteBlocked: string | null
  codeBlocked: string | null
}

/** Rechte je Situation laut Regel-Tabelle der Spec */
export function organisationRights(data: Dataset, org: Organisation): OrganisationRights {
  const used = isOrganisationUsedInWorkflow(data, org.id)
  const assigned = assignedDmrlNames(data, org.id)
  if (used) {
    return {
      used,
      assignedCount: assigned.length,
      deleteBlocked: "Die Organisation ist an Workflows beteiligt und kann nicht gelöscht werden.",
      codeBlocked: "CAGE-Code wird in Workflows verwendet und kann nicht geändert werden.",
    }
  }
  return {
    used,
    assignedCount: assigned.length,
    deleteBlocked:
      assigned.length > 0
        ? `Die Organisation ist der DMRL ${assigned.map((n) => `„${n}"`).join(", ")} zugeordnet. Ändern Sie zuerst die Zuordnung in der DMRL.`
        : null,
    codeBlocked: null,
  }
}

export type SaveResult = { ok: true; data: Dataset } | { ok: false; message: string }

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Ungültige Eingabe."

export function createOrganisation(data: Dataset, values: OrganisationFormValues, id: string): SaveResult {
  const check = organisationFormSchema(data).safeParse(values)
  if (!check.success) return { ok: false, message: firstIssue(check.error) }
  return { ok: true, data: { ...data, organisations: [...data.organisations, { id, ...check.data }] } }
}

export function updateOrganisation(data: Dataset, id: string, values: OrganisationFormValues): SaveResult {
  const org = data.organisations.find((item) => item.id === id)
  if (!org) return { ok: false, message: "Organisation nicht gefunden." }
  const rights = organisationRights(data, org)
  const code = rights.codeBlocked ? org.code : values.code
  if (rights.codeBlocked && normalizeCage(values.code) !== org.code) return { ok: false, message: rights.codeBlocked }
  const check = organisationFormSchema(data, id).safeParse({ code, name: values.name })
  if (!check.success) return { ok: false, message: firstIssue(check.error) }
  return {
    ok: true,
    data: { ...data, organisations: data.organisations.map((item) => (item.id === id ? { id, ...check.data } : item)) },
  }
}

export function deleteOrganisation(data: Dataset, id: string): SaveResult {
  const org = data.organisations.find((item) => item.id === id)
  if (!org) return { ok: false, message: "Organisation nicht gefunden." }
  const { deleteBlocked } = organisationRights(data, org)
  if (deleteBlocked) return { ok: false, message: deleteBlocked }
  return { ok: true, data: { ...data, organisations: data.organisations.filter((item) => item.id !== id) } }
}
