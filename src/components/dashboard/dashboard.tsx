"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardList, FileX, Inbox, Lock } from "lucide-react"

import { SearchField } from "@/components/admin/search-field"
import { useSession } from "@/components/auth/session-provider"
import { useDataStore } from "@/components/data/data-store-provider"
import { DMRL_STATUS_LABEL, DmrlStatusBadge } from "@/components/dmrl/dmrl-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { canAccessAdministration } from "@/lib/auth/permissions"
import {
  applyDashboardFilter,
  dashboardFilterQuery,
  dashboardRows,
  dashboardStats,
  EMPTY_DASHBOARD_FILTER,
  isDashboardFilterActive,
  myTasks,
  parseDashboardFilter,
  type DashboardFilter,
  type Tile,
} from "@/lib/dashboard"
import { DMRL_STATUSES, S1000D_ISSUES, type DmrlStatus, type S1000dIssue } from "@/lib/data/schema"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 25

/** Dashboard (PROJ-16): Kennzahlen, Meine Aufgaben, DMRL-Bestände — Filterzustand in der Adresse */
export function Dashboard() {
  const { data } = useDataStore()
  const { currentUser } = useSession()
  const pathname = usePathname()
  const params = useSearchParams()
  // Zustand im Speicher (sofort aktuell), zusätzlich in der Adresse (Zurück-Taste, Links)
  const [filter, setFilterState] = useState<DashboardFilter>(() => parseDashboardFilter(new URLSearchParams(params.toString())))
  const [page, setPage] = useState(1)

  const rows = useMemo(() => dashboardRows(data, currentUser), [data, currentUser])
  const stats = dashboardStats(rows)
  const tasks = myTasks(rows, currentUser)
  const filtered = applyDashboardFilter(rows, filter)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const setFilter = (change: Partial<DashboardFilter>) => {
    const next = { ...filter, ...change }
    setFilterState(next)
    setPage(1)
    // Natives replaceState (von Next.js unterstützt) statt router.replace: wirkt sofort, schnelle Änderungen können sich
    // nicht überholen — die Adresse entspricht immer dem angezeigten Filter (BUG-QA2-4)
    window.history.replaceState(null, "", `${pathname}${dashboardFilterQuery(next)}`)
  }

  const tiles: { key: Tile | null; label: string; value: number }[] = [
    { key: null, label: "Bestände", value: stats.bestaende },
    { key: "send", label: "Offene SEND", value: stats.offeneSend },
    { key: "aenderungen", label: "Offene Änderungen", value: stats.offeneAenderungen },
    { key: "freigegeben", label: "Freigegeben", value: stats.freigegeben },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Kennzahlen" role="group">
        {tiles.map((tile) => {
          const active = tile.key !== null && filter.kachel === tile.key
          return (
            <button
              key={tile.label}
              type="button"
              aria-pressed={tile.key === null ? undefined : active}
              onClick={() => (tile.key === null ? setFilter(EMPTY_DASHBOARD_FILTER) : setFilter({ kachel: active ? null : tile.key }))}
              className={cn(
                "rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6",
                active && "border-primary bg-primary/5 ring-1 ring-primary"
              )}
            >
              <span className="block text-sm text-muted-foreground">{tile.label}</span>
              <span className="mt-2 block text-3xl font-bold text-brand-darkest sm:text-4xl">{tile.value}</span>
            </button>
          )
        })}
      </div>

      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
              Meine Aufgaben
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y" aria-label="Meine Aufgaben">
              {tasks.map((task) => (
                <li key={task.key}>
                  <Link
                    href={`/dmrl/${encodeURIComponent(task.dmrlId)}`}
                    className="block rounded-sm py-2 text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {task.text}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-xl">DMRL-Bestände</CardTitle>
          <Badge variant="secondary" className="uppercase tracking-wide">
            {filtered.length} sichtbare Bestände
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <EmptyHint isAdmin={canAccessAdministration(currentUser)} />
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchField value={filter.suche} onChange={(suche) => setFilter({ suche })} label="DMRLs nach System oder MI suchen" placeholder="System oder MI …" />
                <StatusFilter value={filter.status} onChange={(status) => setFilter({ status })} />
                <Select value={filter.issue ?? "alle"} onValueChange={(value) => setFilter({ issue: value === "alle" ? null : (value as S1000dIssue) })}>
                  <SelectTrigger className="sm:w-40" aria-label="Filter S1000D-Issue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle Issues</SelectItem>
                    {S1000D_ISSUES.map((issue) => (
                      <SelectItem key={issue} value={issue}>
                        Issue {issue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isDashboardFilterActive(filter) && (
                  <Button variant="link" size="sm" onClick={() => setFilter(EMPTY_DASHBOARD_FILTER)}>
                    Filter zurücksetzen
                  </Button>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-md border py-10 text-center text-muted-foreground">
                  <FileX className="h-8 w-8" aria-hidden />
                  <p>Keine DMRL entspricht dem Filter</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>System / DMRL</TableHead>
                        <TableHead>S1000D</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead className="text-right">DMRL-Einträge</TableHead>
                        <TableHead>Fortschritt</TableHead>
                        <TableHead>Workflow</TableHead>
                        <TableHead className="sticky right-0 bg-background">
                          <span className="sr-only">Aktion</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((row) => {
                        const href = `/dmrl/${encodeURIComponent(row.dmrl.id)}`
                        const percent = row.entryCount ? Math.round((row.released / row.entryCount) * 100) : 0
                        return (
                          <TableRow key={row.dmrl.id}>
                            <TableCell>
                              <Link href={href} className="font-medium hover:text-primary hover:underline">
                                {row.system?.name ?? "—"}
                              </Link>
                              <div className="font-mono text-xs text-muted-foreground">{row.ident}</div>
                            </TableCell>
                            <TableCell>{row.system?.s1000dIssue ?? "—"}</TableCell>
                            <TableCell className="whitespace-nowrap font-mono text-sm">{row.version ?? "—"}</TableCell>
                            <TableCell className="text-right">{row.entryCount}</TableCell>
                            <TableCell className="min-w-[9rem]">
                              <div className="text-sm">
                                {row.released} / {row.entryCount} freigegeben
                              </div>
                              <Progress value={percent} className="mt-1 h-1.5" aria-label={`${row.released} von ${row.entryCount} Einträgen freigegeben`} />
                            </TableCell>
                            <TableCell className="min-w-[10rem]">
                              <DmrlStatusBadge status={row.dmrl.status} />
                              {row.lockUser && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-amber-900">
                                  <Lock className="h-3 w-3" aria-hidden />
                                  ausgecheckt von {row.lockUser.name}
                                  {row.lockUser.inactive && " (inaktiv)"}
                                </div>
                              )}
                              {row.rework > 0 && <div className="mt-1 text-xs font-medium text-amber-900">{row.rework} zu überarbeiten</div>}
                            </TableCell>
                            <TableCell className="sticky right-0 bg-background text-right">
                              <Button asChild variant="outline" size="sm">
                                <Link href={href} aria-label={`Auswahl ${row.system?.name ?? ""}`.trim()}>
                                  Auswahl
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {pageCount > 1 && (
                <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Vorherige Seite">
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Button>
                  <span>
                    Seite {currentPage} von {pageCount}
                  </span>
                  <Button variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Nächste Seite">
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusFilter({ value, onChange }: { value: DmrlStatus[]; onChange: (value: DmrlStatus[]) => void }) {
  const label = value.length === 0 ? "Alle Status" : value.map((s) => DMRL_STATUS_LABEL[s]).join(", ")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between font-normal sm:w-56" aria-label="Filter Workflow-Status">
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {DMRL_STATUSES.map((status) => (
          <DropdownMenuCheckboxItem
            key={status}
            checked={value.includes(status)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => onChange(checked ? [...value, status] : value.filter((s) => s !== status))}
          >
            {DMRL_STATUS_LABEL[status]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmptyHint({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
      <Inbox className="h-10 w-10" aria-hidden />
      {isAdmin ? (
        <p>
          Noch keine DMRL angelegt.{" "}
          <Link href="/verwaltung/dmrl" className="text-primary underline-offset-4 hover:underline">
            Zur DMRL-Verwaltung
          </Link>
        </p>
      ) : (
        <p>Ihnen sind noch keine DMRLs zugeordnet. Bitte wenden Sie sich an einen Administrator.</p>
      )}
    </div>
  )
}
