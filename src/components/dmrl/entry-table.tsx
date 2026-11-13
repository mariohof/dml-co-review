"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, FileX, Inbox } from "lucide-react"

import { SearchField } from "@/components/admin/search-field"
import { DmDeletedBadge, EntryStatusBadge, EntryTypeLabel } from "@/components/dmrl/entry-badges"
import { Button } from "@/components/ui/button"
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ENTRY_STATUSES, type EntrySnapshot, type EntryStatus } from "@/lib/data/schema"
import {
  countByStatus,
  EMPTY_FILTER,
  ENTRY_STATUS_LABEL,
  ENTRY_TYPE_LABEL,
  ENTRY_TYPES,
  filterEntries,
  formatDmc,
  isDmDeleted,
  isFilterActive,
  type EntryFilter,
} from "@/lib/dmrl/entries"
import { cn } from "@/lib/utils"
import { EntryDetailSheet } from "./entry-detail-sheet"

export const PAGE_SIZE = 50

interface EntryTableProps {
  entries: EntrySnapshot[]
  /** Hinweis, wenn keine Einträge vorhanden sind */
  emptyMessage?: string
}

/**
 * Wiederverwendbare Eintragstabelle (nur lesend) mit Zählerleiste, Filter, Suche, Seiten und Detailfenster.
 * Genutzt von DMRL-Ansicht (PROJ-7), Freigabestand (PROJ-14) und Archiv (PROJ-15).
 */
export function EntryTable({ entries, emptyMessage = "Noch keine Einträge — Einträge werden über Check-out/Check-in erfasst." }: EntryTableProps) {
  const [filter, setFilter] = useState<EntryFilter>(EMPTY_FILTER)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<EntrySnapshot | null>(null)

  const counts = useMemo(() => countByStatus(entries), [entries])
  const filtered = useMemo(() => filterEntries(entries, filter), [entries, filter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const updateFilter = (change: Partial<EntryFilter>) => {
    setFilter((current) => ({ ...current, ...change }))
    setPage(1)
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <Inbox className="h-10 w-10" aria-hidden />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Zählerleiste */}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Einträge je Status">
        {[...ENTRY_STATUSES, "gesamt" as const].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => key !== "gesamt" && updateFilter({ status: filter.status === key ? "alle" : (key as EntryStatus) })}
            disabled={key === "gesamt"}
            aria-pressed={key !== "gesamt" ? filter.status === key : undefined}
            className={cn(
              "rounded-md border bg-card px-3 py-2 text-left transition-colors enabled:hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filter.status === key && "border-primary bg-primary/5",
              key === "zu_ueberarbeiten" && counts.zu_ueberarbeiten > 0 && "border-amber-300"
            )}
          >
            <dt className="text-xs text-muted-foreground">{key === "gesamt" ? "Gesamt" : ENTRY_STATUS_LABEL[key]}</dt>
            <dd className="text-xl font-semibold">{counts[key]}</dd>
          </button>
        ))}
      </dl>

      {/* Filter & Suche */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchField
          value={filter.search}
          onChange={(search) => updateFilter({ search })}
          label="Einträge nach DMC, Tech Name oder Info Name suchen"
          placeholder="DMC, Tech Name oder Info Name …"
        />
        <Select value={filter.status} onValueChange={(status) => updateFilter({ status: status as EntryFilter["status"] })}>
          <SelectTrigger className="sm:w-48" aria-label="Filter Eintragsstatus">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {ENTRY_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {ENTRY_STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filter.type} onValueChange={(type) => updateFilter({ type: type as EntryFilter["type"] })}>
          <SelectTrigger className="sm:w-44" aria-label="Filter Eintragstyp">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Eintragstypen</SelectItem>
            {ENTRY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {ENTRY_TYPE_LABEL[type]}
              </SelectItem>
            ))}
            <SelectItem value="ohne">ohne Typ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border py-10 text-center text-muted-foreground">
          <FileX className="h-8 w-8" aria-hidden />
          <p>Keine Einträge gefunden</p>
          <Button variant="outline" size="sm" onClick={() => updateFilter(EMPTY_FILTER)}>
            Filter zurücksetzen
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DMC</TableHead>
                  <TableHead>Tech Name</TableHead>
                  <TableHead>Info Name</TableHead>
                  <TableHead>Eintragstyp</TableHead>
                  <TableHead>Sicherheit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Partner-Kommentar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((entry) => {
                  const deletion = entry.fields.dmentryType === "d"
                  const rework = entry.status === "zu_ueberarbeiten"
                  return (
                    <TableRow
                      key={entry.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Eintrag ${formatDmc(entry.fields)} anzeigen`}
                      onClick={() => setSelected(entry)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          setSelected(entry)
                        }
                      }}
                      className={cn(
                        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        deletion && "text-muted-foreground",
                        rework && "bg-amber-50/70 hover:bg-amber-50"
                      )}
                    >
                      <TableCell className={cn("whitespace-nowrap font-mono text-xs", deletion && "line-through")}>
                        {formatDmc(entry.fields)}
                      </TableCell>
                      <TableCell className={cn("max-w-[16rem]", deletion && "line-through")}>
                        <span className="line-clamp-2" title={entry.fields.techname}>
                          {entry.fields.techname}
                        </span>
                      </TableCell>
                      <TableCell className={cn("max-w-[16rem]", deletion && "line-through")}>
                        <span className="line-clamp-2" title={entry.fields.infoname}>
                          {entry.fields.infoname}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <EntryTypeLabel type={entry.fields.dmentryType} />
                          {isDmDeleted(entry.fields) && <DmDeletedBadge />}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{entry.fields.security}</TableCell>
                      <TableCell>
                        <EntryStatusBadge status={entry.status} />
                      </TableCell>
                      <TableCell className="max-w-[18rem]">
                        <span className={cn("line-clamp-2", rework && "font-medium text-amber-900")} title={entry.fields.answer_comment}>
                          {entry.fields.answer_comment}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
            <span>
              {filtered.length === entries.length ? `${entries.length} Einträge` : `${filtered.length} von ${entries.length} Einträgen`}
              {isFilterActive(filter) && (
                <Button variant="link" size="sm" className="h-auto px-2" onClick={() => updateFilter(EMPTY_FILTER)}>
                  Filter zurücksetzen
                </Button>
              )}
            </span>
            {pageCount > 1 && (
              <Pagination className="mx-0 w-auto justify-end" aria-label="Seiten">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      size="default"
                      aria-label="Vorherige Seite"
                      aria-disabled={currentPage === 1}
                      className={cn("gap-1 pl-2.5", currentPage === 1 && "pointer-events-none opacity-50")}
                      onClick={(event) => {
                        event.preventDefault()
                        setPage(Math.max(1, currentPage - 1))
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                      <span>Zurück</span>
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-3">
                      Seite {currentPage} von {pageCount}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      size="default"
                      aria-label="Nächste Seite"
                      aria-disabled={currentPage === pageCount}
                      className={cn("gap-1 pr-2.5", currentPage === pageCount && "pointer-events-none opacity-50")}
                      onClick={(event) => {
                        event.preventDefault()
                        setPage(Math.min(pageCount, currentPage + 1))
                      }}
                    >
                      <span>Weiter</span>
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </>
      )}

      <EntryDetailSheet entry={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
