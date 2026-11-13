import { z } from "zod"

import { latestSend } from "@/lib/data/queries"
import { USER_ROLES, versionIndexOf, type Dataset, type User, type UserRole } from "@/lib/data/schema"

/** Fachregeln der Benutzerverwaltung (PROJ-3, Tech Design C) — ohne Oberflächenbezug */

export const NAME_MIN = 2
export const NAME_MAX = 80

export const normalizeName = (name: string) => name.trim()
const nameKey = (name: string) => normalizeName(name).toLocaleLowerCase("de")

/** Ist der Name bereits vergeben? (ohne Groß-/Kleinschreibung; eigener Benutzer ausgenommen) */
export function isNameTaken(data: Dataset, name: string, exceptUserId?: string): boolean {
  const key = nameKey(name)
  return data.users.some((user) => user.id !== exceptUserId && nameKey(user.name) === key)
}

/** Formular-/Speicherprüfung für Name und Rolle */
export function userFormSchema(data: Dataset, exceptUserId?: string) {
  return z.object({
    name: z
      .string()
      .transform(normalizeName)
      .pipe(
        z
          .string()
          .min(1, "Bitte einen Namen eingeben.")
          .min(NAME_MIN, `Der Name muss mindestens ${NAME_MIN} Zeichen lang sein.`)
          .max(NAME_MAX, `Der Name darf höchstens ${NAME_MAX} Zeichen lang sein.`)
          .refine((name) => !isNameTaken(data, name, exceptUserId), "Dieser Name ist bereits vergeben.")
      ),
    role: z
      .string()
      .refine((role): role is UserRole => (USER_ROLES as readonly string[]).includes(role), "Bitte eine Rolle wählen.")
      .transform((role) => role as UserRole),
  })
}
export type UserFormInput = { name: string; role: string }
export type UserFormValues = { name: string; role: UserRole }

/** Gründe, warum ein Benutzer nicht deaktiviert werden kann (leer = möglich) */
export function deactivationBlockers(data: Dataset, user: User, currentUserId: string | null): string[] {
  const reasons: string[] = []
  const systemName = (systemId: string) => data.systems.find((s) => s.id === systemId)?.name ?? "unbekanntes System"

  if (user.isSystemAccount) reasons.push("Das Systemkonto „Administrator\" kann nicht deaktiviert werden.")
  if (user.id === currentUserId) reasons.push("Sie können sich nicht selbst deaktivieren.")

  for (const dmrl of data.dmrls) {
    if (dmrl.lock?.userId === user.id) {
      reasons.push(`Hat die DMRL „${systemName(dmrl.systemId)}" ausgecheckt.`)
    }
    if (dmrl.status === "gesendet") {
      const send = latestSend(data, dmrl.id)
      if (send?.createdByUserId === user.id) {
        reasons.push(
          `Hat den letzten SEND der DMRL „${systemName(dmrl.systemId)}" ausgelöst — wartet auf REPLY zu SEND ${versionIndexOf(send.dmlc)}.`
        )
      }
    }
  }
  return reasons
}

/** Darf der Benutzer in der Oberfläche bearbeitet werden? (Systemkonto: nein) */
export const canEditUser = (user: User) => !user.isSystemAccount

export type SaveResult = { ok: true; data: Dataset } | { ok: false; message: string }

/** Neuen Benutzer anlegen (aktiv). Prüft erneut, damit UI und Datenbestand nicht abweichen. */
export function createUser(data: Dataset, values: UserFormValues, id: string): SaveResult {
  const check = userFormSchema(data).safeParse(values)
  if (!check.success) return { ok: false, message: check.error.issues[0]?.message ?? "Ungültige Eingabe." }
  const user: User = { id, name: check.data.name, role: check.data.role, active: true, isSystemAccount: false }
  return { ok: true, data: { ...data, users: [...data.users, user] } }
}

/** Name und Rolle ändern. Systemkonto ist geschützt. */
export function updateUser(data: Dataset, userId: string, values: UserFormValues): SaveResult {
  const user = data.users.find((u) => u.id === userId)
  if (!user) return { ok: false, message: "Benutzer nicht gefunden." }
  if (!canEditUser(user)) return { ok: false, message: "Das Systemkonto kann nicht geändert werden." }
  const check = userFormSchema(data, userId).safeParse(values)
  if (!check.success) return { ok: false, message: check.error.issues[0]?.message ?? "Ungültige Eingabe." }
  return {
    ok: true,
    data: {
      ...data,
      users: data.users.map((u) => (u.id === userId ? { ...u, name: check.data.name, role: check.data.role } : u)),
    },
  }
}

/** Aktivieren / Deaktivieren. Deaktivieren nur ohne Sperrgründe. */
export function setUserActive(
  data: Dataset,
  userId: string,
  active: boolean,
  currentUserId: string | null
): SaveResult {
  const user = data.users.find((u) => u.id === userId)
  if (!user) return { ok: false, message: "Benutzer nicht gefunden." }
  if (!active) {
    const reasons = deactivationBlockers(data, user, currentUserId)
    if (reasons.length > 0) return { ok: false, message: reasons.join(" ") }
  }
  return { ok: true, data: { ...data, users: data.users.map((u) => (u.id === userId ? { ...u, active } : u)) } }
}
