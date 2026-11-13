import { z } from "zod"

import { S1000D_ISSUES, type Dataset, type DmrlSystem, type S1000dIssue } from "@/lib/data/schema"
import { isSystemUsedInWorkflow } from "./workflow-usage"

/** Fachregeln der Systemverwaltung (PROJ-5, Tech Design C) — ohne Oberflächenbezug */

export const SYSTEM_NAME_MIN = 2
export const SYSTEM_NAME_MAX = 120
export const DESCRIPTION_MAX = 500
export const MODELIC_PATTERN = /^[A-Z0-9]{2,14}$/

export const normalizeModelic = (value: string) => value.toUpperCase()
const nameKey = (name: string) => name.trim().toLocaleLowerCase("de")

export function isSystemNameTaken(data: Dataset, name: string, exceptId?: string): boolean {
  return data.systems.some((system) => system.id !== exceptId && nameKey(system.name) === nameKey(name))
}

export function isModelicTaken(data: Dataset, modelic: string, exceptId?: string): boolean {
  const key = normalizeModelic(modelic.trim())
  return data.systems.some((system) => system.id !== exceptId && system.modelic === key)
}

export function systemFormSchema(data: Dataset, exceptId?: string) {
  return z.object({
    name: z
      .string()
      .transform((name) => name.trim())
      .pipe(
        z
          .string()
          .min(1, "Bitte eine Bezeichnung eingeben.")
          .min(SYSTEM_NAME_MIN, `Die Bezeichnung muss mindestens ${SYSTEM_NAME_MIN} Zeichen lang sein.`)
          .max(SYSTEM_NAME_MAX, `Die Bezeichnung darf höchstens ${SYSTEM_NAME_MAX} Zeichen lang sein.`)
          .refine((name) => !isSystemNameTaken(data, name, exceptId), "Bezeichnung bereits vergeben.")
      ),
    s1000dIssue: z
      .string()
      .refine((v): v is S1000dIssue => (S1000D_ISSUES as readonly string[]).includes(v), "Bitte eine S1000D-Issue wählen.")
      .transform((v) => v as S1000dIssue),
    modelic: z
      .string()
      .transform((v) => normalizeModelic(v.trim()))
      .pipe(
        z
          .string()
          .min(1, "Bitte einen Model Ident Code eingeben.")
          .regex(MODELIC_PATTERN, "Model Ident Code muss aus 2–14 Buchstaben/Ziffern bestehen.")
          .refine((v) => !isModelicTaken(data, v, exceptId), "Model Ident Code bereits vergeben.")
      ),
    description: z
      .string()
      .transform((v) => v.trim())
      .pipe(z.string().max(DESCRIPTION_MAX, `Die Beschreibung darf höchstens ${DESCRIPTION_MAX} Zeichen lang sein.`)),
  })
}
export type SystemFormInput = { name: string; s1000dIssue: string; modelic: string; description: string }
export type SystemFormValues = { name: string; s1000dIssue: S1000dIssue; modelic: string; description: string }

export type SystemState = "keine_dmrl" | "dmrl_ohne_workflow" | "benutzt"

export function systemState(data: Dataset, systemId: string): SystemState {
  if (isSystemUsedInWorkflow(data, systemId)) return "benutzt"
  return data.dmrls.some((dmrl) => dmrl.systemId === systemId) ? "dmrl_ohne_workflow" : "keine_dmrl"
}

const FIXED_DMRL = "Fest, da eine DMRL existiert."
const FIXED_USED = "Wird in Workflows verwendet und kann nicht geändert werden."

export interface SystemRights {
  state: SystemState
  /** je Feld: null = änderbar, sonst Begründung */
  fieldBlocked: Record<"name" | "s1000dIssue" | "modelic" | "description", string | null>
  deleteBlocked: string | null
}

/** Feldsperren und Löschrecht je Zustand laut Regel-Tabelle der Spec */
export function systemRights(data: Dataset, system: DmrlSystem): SystemRights {
  const state = systemState(data, system.id)
  if (state === "benutzt") {
    return {
      state,
      fieldBlocked: { name: FIXED_USED, s1000dIssue: FIXED_USED, modelic: FIXED_USED, description: null },
      deleteBlocked: "Das System ist an Workflows beteiligt und kann nicht gelöscht werden.",
    }
  }
  if (state === "dmrl_ohne_workflow") {
    return {
      state,
      fieldBlocked: { name: FIXED_DMRL, s1000dIssue: null, modelic: FIXED_DMRL, description: null },
      deleteBlocked: "Zum System existiert eine DMRL. Löschen Sie zuerst die DMRL.",
    }
  }
  return {
    state,
    fieldBlocked: { name: null, s1000dIssue: null, modelic: null, description: null },
    deleteBlocked: null,
  }
}

export type SaveResult = { ok: true; data: Dataset } | { ok: false; message: string }
const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Ungültige Eingabe."

export function createSystem(data: Dataset, values: SystemFormInput, id: string): SaveResult {
  const check = systemFormSchema(data).safeParse(values)
  if (!check.success) return { ok: false, message: firstIssue(check.error) }
  return { ok: true, data: { ...data, systems: [...data.systems, { id, ...check.data }] } }
}

export function updateSystem(data: Dataset, id: string, values: SystemFormInput): SaveResult {
  const system = data.systems.find((item) => item.id === id)
  if (!system) return { ok: false, message: "System nicht gefunden." }
  const { fieldBlocked } = systemRights(data, system)
  const check = systemFormSchema(data, id).safeParse(values)
  if (!check.success) return { ok: false, message: firstIssue(check.error) }
  // Gesperrte Felder dürfen sich nicht ändern (Schutz bei veralteter Anzeige)
  for (const field of ["name", "s1000dIssue", "modelic"] as const) {
    if (fieldBlocked[field] && check.data[field] !== system[field]) return { ok: false, message: fieldBlocked[field]! }
  }
  return { ok: true, data: { ...data, systems: data.systems.map((item) => (item.id === id ? { id, ...check.data } : item)) } }
}

export function deleteSystem(data: Dataset, id: string): SaveResult {
  const system = data.systems.find((item) => item.id === id)
  if (!system) return { ok: false, message: "System nicht gefunden." }
  const { deleteBlocked } = systemRights(data, system)
  if (deleteBlocked) return { ok: false, message: deleteBlocked }
  return { ok: true, data: { ...data, systems: data.systems.filter((item) => item.id !== id) } }
}
