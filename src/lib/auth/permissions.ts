import type { Dataset, Dmrl, User } from "@/lib/data/schema"

/**
 * Zentrale Rechte-Regel (PROJ-2, Tech Design D).
 * Alle Seiten, Aktionen und das Dashboard fragen ausschließlich diese Funktionen.
 */

export const ROLE_LABEL: Record<User["role"], string> = {
  administrator: "Administrator",
  bearbeiter: "Bearbeiter",
}

/** Darf der Benutzer überhaupt arbeiten? (existiert und ist aktiv) */
export function isActiveUser(user: User | null | undefined): user is User {
  return !!user && user.active
}

/** Verwaltungsbereich: nur aktive Administratoren */
export function canAccessAdministration(user: User | null | undefined): boolean {
  return isActiveUser(user) && user.role === "administrator"
}

/** DMRL sehen und alle Bearbeiter-Aktionen ausführen: Administrator immer, Bearbeiter nur wenn berechtigt (PROJ-17) */
export function canAccessDmrl(user: User | null | undefined, dmrl: Dmrl): boolean {
  if (!isActiveUser(user)) return false
  if (user.role === "administrator") return true
  return dmrl.editorUserIds.includes(user.id)
}

/** DMRLs, die der Benutzer im Dashboard sieht */
export function visibleDmrls(data: Dataset, user: User | null | undefined): Dmrl[] {
  return data.dmrls.filter((dmrl) => canAccessDmrl(user, dmrl))
}

/** Aktive Benutzer für Anmeldeliste und Benutzer-Auswahl, sortiert nach Name */
export function activeUsers(data: Dataset): User[] {
  return data.users
    .filter((user) => user.active)
    .sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))
}

export type RouteAccess = "allowed" | "forbidden" | "not_found"

/**
 * Darf der Benutzer die Seite unter `pathname` sehen?
 * Wird beim Benutzerwechsel genutzt, um zu entscheiden, ob die aktuelle Seite offen bleibt.
 */
export function routeAccess(pathname: string, data: Dataset, user: User | null | undefined): RouteAccess {
  if (!isActiveUser(user)) return "forbidden"
  if (pathname === "/verwaltung" || pathname.startsWith("/verwaltung/")) {
    return canAccessAdministration(user) ? "allowed" : "forbidden"
  }
  const dmrlMatch = pathname.match(/^\/dmrl\/([^/]+)/)
  if (dmrlMatch) {
    const dmrl = data.dmrls.find((item) => item.id === decodeURIComponent(dmrlMatch[1]))
    if (!dmrl) return "not_found"
    return canAccessDmrl(user, dmrl) ? "allowed" : "forbidden"
  }
  return "allowed"
}
