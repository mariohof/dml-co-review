import { visibleDmrls } from "@/lib/auth/permissions"
import { formatDate, latestSend } from "@/lib/data/queries"
import {
  DMRL_STATUSES,
  S1000D_ISSUES,
  versionIndexOf,
  type Dataset,
  type DmrlStatus,
  type Dmrl,
  type DmrlSystem,
  type S1000dIssue,
  type User,
} from "@/lib/data/schema"

/** Dashboard (PROJ-16): eine Auswertung für Kennzahlen, Tabelle und Aufgaben — bei jeder Anzeige berechnet */

export interface DashboardRow {
  dmrl: Dmrl
  system: DmrlSystem | null
  /** Kennung MI–CAGE–Typ, z. B. PHUNGUN–D0815–C */
  ident: string
  /** Versionsindex des letzten nicht zurückgezogenen SEND */
  version: string | null
  entryCount: number
  released: number
  /** Einträge in Bearbeitung + zu überarbeiten */
  open: number
  rework: number
  lockUser: { id: string; name: string; inactive: boolean } | null
  lockSince: string | null
  /** Zeitpunkt des offenen SEND (nur bei Status gesendet) */
  sentAt: string | null
}

export function dashboardRows(data: Dataset, user: User | null): DashboardRow[] {
  return visibleDmrls(data, user)
    .map((dmrl): DashboardRow => {
      const system = data.systems.find((s) => s.id === dmrl.systemId) ?? null
      const originator = data.organisations.find((o) => o.id === dmrl.originatorOrganisationId)
      const entries = data.entries.filter((e) => e.dmrlId === dmrl.id)
      const send = latestSend(data, dmrl.id)
      const lockUser = dmrl.lock ? data.users.find((u) => u.id === dmrl.lock?.userId) : null
      return {
        dmrl,
        system,
        ident: [system?.modelic ?? "—", originator?.code ?? "—", dmrl.dmlType.toUpperCase()].join("–"),
        version: send ? versionIndexOf(send.dmlc) : null,
        entryCount: entries.length,
        released: entries.filter((e) => e.status === "freigegeben").length,
        open: entries.filter((e) => e.status === "in_bearbeitung" || e.status === "zu_ueberarbeiten").length,
        rework: entries.filter((e) => e.status === "zu_ueberarbeiten").length,
        lockUser: dmrl.lock ? { id: dmrl.lock.userId, name: lockUser?.name ?? "unbekannt", inactive: !!lockUser && !lockUser.active } : null,
        lockSince: dmrl.lock?.since ?? null,
        sentAt: dmrl.status === "gesendet" && send ? send.createdAt : null,
      }
    })
    .sort((a, b) => (a.system?.name ?? "").localeCompare(b.system?.name ?? "", "de"))
}

export interface DashboardStats {
  bestaende: number
  offeneSend: number
  offeneAenderungen: number
  freigegeben: number
}

/** Kennzahlen über alle sichtbaren DMRLs (unabhängig von Filter und Suche) */
export function dashboardStats(rows: DashboardRow[]): DashboardStats {
  return {
    bestaende: rows.length,
    offeneSend: rows.filter((r) => r.dmrl.status === "gesendet").length,
    offeneAenderungen: rows.reduce((sum, r) => sum + r.open, 0),
    freigegeben: rows.filter((r) => r.dmrl.status === "freigegeben").length,
  }
}

// ---------------------------------------------------------------- Meine Aufgaben

export interface DashboardTask {
  key: string
  dmrlId: string
  text: string
}

const DAY = 24 * 60 * 60 * 1000

export function myTasks(rows: DashboardRow[], user: User | null, now: Date = new Date()): DashboardTask[] {
  const tasks: DashboardTask[] = []
  for (const row of rows) {
    const name = row.system?.name ?? "DMRL"
    if (user && row.lockUser?.id === user.id && row.lockSince) {
      tasks.push({ key: `lock-${row.dmrl.id}`, dmrlId: row.dmrl.id, text: `Von Ihnen ausgecheckt: ${name} seit ${formatDate(row.lockSince)}` })
    }
    if (row.rework > 0) {
      tasks.push({
        key: `rework-${row.dmrl.id}`,
        dmrlId: row.dmrl.id,
        text: `${row.rework} ${row.rework === 1 ? "Eintrag" : "Einträge"} zu überarbeiten: ${name}`,
      })
    }
    if (row.sentAt) {
      const days = Math.floor((now.getTime() - new Date(row.sentAt).getTime()) / DAY)
      if (days >= 1) {
        tasks.push({ key: `wait-${row.dmrl.id}`, dmrlId: row.dmrl.id, text: `Wartet seit ${days} ${days === 1 ? "Tag" : "Tagen"} auf REPLY: ${name}` })
      }
    }
  }
  return tasks
}

// ---------------------------------------------------------------- Filter (Zustand in der Adresse)

export const TILES = ["send", "aenderungen", "freigegeben"] as const
export type Tile = (typeof TILES)[number]

export interface DashboardFilter {
  kachel: Tile | null
  status: DmrlStatus[]
  issue: S1000dIssue | null
  suche: string
}

export const EMPTY_DASHBOARD_FILTER: DashboardFilter = { kachel: null, status: [], issue: null, suche: "" }

export function parseDashboardFilter(params: URLSearchParams): DashboardFilter {
  const kachel = params.get("kachel")
  const issue = params.get("issue")
  return {
    kachel: TILES.includes(kachel as Tile) ? (kachel as Tile) : null,
    status: (params.get("status") ?? "").split(",").filter((s): s is DmrlStatus => DMRL_STATUSES.includes(s as DmrlStatus)),
    issue: S1000D_ISSUES.includes(issue as S1000dIssue) ? (issue as S1000dIssue) : null,
    suche: params.get("suche") ?? "",
  }
}

export function dashboardFilterQuery(filter: DashboardFilter): string {
  const params = new URLSearchParams()
  if (filter.kachel) params.set("kachel", filter.kachel)
  if (filter.status.length) params.set("status", filter.status.join(","))
  if (filter.issue) params.set("issue", filter.issue)
  if (filter.suche.trim()) params.set("suche", filter.suche)
  const query = params.toString()
  return query ? `?${query}` : ""
}

export const isDashboardFilterActive = (filter: DashboardFilter) =>
  !!filter.kachel || filter.status.length > 0 || !!filter.issue || filter.suche.trim() !== ""

export function applyDashboardFilter(rows: DashboardRow[], filter: DashboardFilter): DashboardRow[] {
  const term = filter.suche.trim().toLocaleLowerCase("de")
  return rows.filter((row) => {
    if (filter.kachel === "send" && row.dmrl.status !== "gesendet") return false
    if (filter.kachel === "freigegeben" && row.dmrl.status !== "freigegeben") return false
    if (filter.kachel === "aenderungen" && row.open === 0) return false
    if (filter.status.length && !filter.status.includes(row.dmrl.status)) return false
    if (filter.issue && row.system?.s1000dIssue !== filter.issue) return false
    if (term && ![row.system?.name ?? "", row.system?.modelic ?? ""].some((v) => v.toLocaleLowerCase("de").includes(term))) return false
    return true
  })
}
