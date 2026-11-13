import type { Dataset, Dmrl, User } from "@/lib/data/schema"

/** Fachregeln „DMRL-Berechtigungen" (PROJ-17, Tech Design C) — ohne Oberflächenbezug */

export interface EditorOption {
  user: User
  checked: boolean
  /** null = frei wählbar; sonst Grund, warum die Auswahl nicht änderbar ist */
  locked: string | null
  /** inaktiv: nur abwählbar, nicht neu hinzufügbar */
  inactive: boolean
}

const byName = (a: User, b: User) => a.name.localeCompare(b.name, "de", { sensitivity: "base" })

/**
 * Auswahlliste für den Berechtigungsdialog:
 * aktive Bearbeiter + bereits berechtigte inaktive Bearbeiter. Administratoren werden nicht angeboten.
 */
export function editorOptions(data: Dataset, dmrl: Dmrl): EditorOption[] {
  return data.users
    .filter((user) => user.role === "bearbeiter" && (user.active || dmrl.editorUserIds.includes(user.id)))
    .sort(byName)
    .map((user) => {
      const checked = dmrl.editorUserIds.includes(user.id)
      const holdsLock = dmrl.lock?.userId === user.id
      return {
        user,
        checked,
        inactive: !user.active,
        locked: holdsLock
          ? `${user.name} hat die DMRL ausgecheckt und kann erst nach dem Check-in entfernt werden.`
          : null,
      }
    })
}

/** Berechtigte Bearbeiter für die Anzeige in der Liste (Rolle Bearbeiter, sortiert) */
export function permittedEditors(data: Dataset, dmrl: Dmrl): User[] {
  return data.users.filter((user) => user.role === "bearbeiter" && dmrl.editorUserIds.includes(user.id)).sort(byName)
}

export const hasActiveEditors = (data: Dataset) => data.users.some((user) => user.role === "bearbeiter" && user.active)

export type SaveResult = { ok: true; data: Dataset } | { ok: false; message: string }

/**
 * Berechtigungen speichern.
 * - nur aktive Bearbeiter dürfen neu hinzukommen
 * - der Sperrinhaber kann nicht entfernt werden
 * - gespeicherte Berechtigungen von Benutzern, die nicht (mehr) Bearbeiter sind, bleiben unverändert erhalten
 */
export function setDmrlEditors(data: Dataset, dmrlId: string, selectedIds: string[]): SaveResult {
  const dmrl = data.dmrls.find((item) => item.id === dmrlId)
  if (!dmrl) return { ok: false, message: "DMRL nicht gefunden." }
  const userById = new Map(data.users.map((user) => [user.id, user]))
  const selected = new Set(selectedIds)

  for (const id of selected) {
    const user = userById.get(id)
    if (!user || user.role !== "bearbeiter") return { ok: false, message: "Nur Bearbeiter können berechtigt werden." }
    if (!user.active && !dmrl.editorUserIds.includes(id)) {
      return { ok: false, message: `${user.name} ist inaktiv und kann nicht neu berechtigt werden.` }
    }
  }
  const lockHolder = dmrl.lock ? userById.get(dmrl.lock.userId) : undefined
  if (lockHolder && dmrl.editorUserIds.includes(lockHolder.id) && !selected.has(lockHolder.id)) {
    return { ok: false, message: `${lockHolder.name} hat die DMRL ausgecheckt und kann erst nach dem Check-in entfernt werden.` }
  }

  // Nicht angezeigte Berechtigungen (z. B. zum Administrator beförderte Benutzer) bleiben erhalten
  const kept = dmrl.editorUserIds.filter((id) => userById.get(id)?.role !== "bearbeiter")
  const editorUserIds = [...kept, ...data.users.filter((u) => selected.has(u.id)).map((u) => u.id)]
  return {
    ok: true,
    data: { ...data, dmrls: data.dmrls.map((item) => (item.id === dmrlId ? { ...item, editorUserIds } : item)) },
  }
}
