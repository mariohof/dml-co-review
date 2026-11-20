"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Ban, Download, Eye, FileCode2, History, Inbox, Loader2 } from "lucide-react"

import { useDataStore } from "@/components/data/data-store-provider"
import { DmrlStatusBadge } from "@/components/dmrl/dmrl-status-badge"
import { useReleaseExport } from "@/components/dmrl/release-export"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateTime } from "@/lib/data/queries"
import { versionIndexOf, type ArchiveEntry, type Dmrl } from "@/lib/data/schema"
import {
  archiveChain,
  archiveEntries,
  archiveFileBytes,
  dmlRefLabel,
  HISTORY_ACTION_LABEL,
  HISTORY_FILTERS,
  historyEntries,
  organisationLabelById,
  readArchived,
  userLabel,
  type HistoryFilter,
} from "@/lib/dmrl/archive"
import { downloadBytes } from "@/lib/files/download"
import { CHECKIN_RELEASE_LABEL, isCheckinRelease, releaseInfo, releaseSnapshots } from "@/lib/workflows/release"

const TABS = ["austausch", "freigaben", "verlauf"] as const
type Tab = (typeof TABS)[number]
const HISTORY_PAGE = 50

/** Archiv je DMRL (PROJ-15): Austausch, Freigabestände, Verlauf — nur lesend */
export function ArchiveView({ dmrl }: { dmrl: Dmrl }) {
  const { data } = useDataStore()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const requested = params.get("ansicht")
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "austausch"
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  const dmrlHref = `/dmrl/${encodeURIComponent(dmrl.id)}`

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={dmrlHref}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Zurück zur DMRL
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Archiv</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">{system?.name ?? "DMRL"}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{system?.modelic}</span> · S1000D Issue {system?.s1000dIssue} · nur lesend
          </p>
        </div>
        <DmrlStatusBadge status={dmrl.status} className="text-sm" />
      </div>

      <Tabs value={tab} onValueChange={(value) => router.replace(`${pathname}?ansicht=${value}`, { scroll: false })}>
        <TabsList aria-label="Archiv">
          <TabsTrigger value="austausch">Austausch</TabsTrigger>
          <TabsTrigger value="freigaben">Freigabestände</TabsTrigger>
          <TabsTrigger value="verlauf">Verlauf</TabsTrigger>
        </TabsList>
        <TabsContent value="austausch">
          <ExchangeTab dmrl={dmrl} />
        </TabsContent>
        <TabsContent value="freigaben">
          <ReleasesTab dmrl={dmrl} />
        </TabsContent>
        <TabsContent value="verlauf">
          <HistoryTab dmrl={dmrl} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <Inbox className="h-10 w-10" aria-hidden />
        <p>{text}</p>
      </CardContent>
    </Card>
  )
}

function UserName({ userId }: { userId: string }) {
  const { data } = useDataStore()
  const user = userLabel(data, userId)
  return (
    <span>
      {user.name}
      {user.inactive && (
        <Badge variant="outline" className="ml-1.5 text-xs font-normal">
          inaktiv
        </Badge>
      )}
    </span>
  )
}

/** Byte-genauer Download mit Original-Dateiname */
export function downloadArchived(entry: ArchiveEntry) {
  downloadBytes(entry.fileName, archiveFileBytes(entry.content), "application/xml")
}

export function archivedEntryCount(entry: ArchiveEntry, count: number | null): string {
  if (entry.direction === "reply" && entry.replyCounts) {
    return `${entry.replyCounts.approved} freigegeben · ${entry.replyCounts.rework} zu überarbeiten`
  }
  return count === null ? "—" : `${count} Einträge`
}

function ExchangeTab({ dmrl }: { dmrl: Dmrl }) {
  const { data } = useDataStore()
  const entries = archiveEntries(data, dmrl.id)
  if (entries.length === 0) return <Empty text="Noch kein Austausch mit einem Empfänger" />

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground" aria-label="Austauschkette">
        {archiveChain(entries)}
      </p>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stand</TableHead>
              <TableHead>Empfänger</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Bearbeiter</TableHead>
              <TableHead>Bezug</TableHead>
              <TableHead>Einträge</TableHead>
              <TableHead>Datei</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const parsed = entry.direction === "send" ? readArchived(data, entry) : null
              return (
                <TableRow key={entry.id} className={entry.withdrawn ? "bg-muted/40" : undefined}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.direction === "send" ? "default" : "secondary"}>{entry.direction === "send" ? "SEND" : "REPLY"}</Badge>
                      <span className="font-mono">{versionIndexOf(entry.dmlc)}</span>
                    </div>
                    {entry.withdrawn && (
                      <div className="mt-1 flex items-start gap-1 text-xs text-amber-900">
                        <Ban className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                        <span>
                          zurückgezogen am {formatDateTime(entry.withdrawn.at)} von {userLabel(data, entry.withdrawn.userId).name} — {entry.withdrawn.reason}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{organisationLabelById(data, entry.partnerOrganisationId)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell>
                    <UserName userId={entry.createdByUserId} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{dmlRefLabel(entry)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{archivedEntryCount(entry, parsed ? parsed.entries.length : null)}</TableCell>
                  <TableCell className="max-w-[14rem] break-all font-mono text-xs">{entry.fileName}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm" aria-label={`${entry.direction === "send" ? "SEND" : "REPLY"} ${versionIndexOf(entry.dmlc)} anzeigen`}>
                        <Link href={`/dmrl/${encodeURIComponent(dmrl.id)}/archiv/${encodeURIComponent(entry.id)}`}>
                          <Eye className="mr-1.5 h-4 w-4" aria-hidden />
                          Anzeigen
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadArchived(entry)}
                        aria-label={`${entry.fileName} herunterladen`}
                      >
                        <Download className="mr-1.5 h-4 w-4" aria-hidden />
                        Herunterladen
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function ReleasesTab({ dmrl }: { dmrl: Dmrl }) {
  const { data } = useDataStore()
  const { exportCsv, exportXml, busyId, dialog } = useReleaseExport(dmrl)
  const snapshots = releaseSnapshots(data, dmrl.id)
  if (snapshots.length === 0) return <Empty text="Die DMRL wurde noch nie freigegeben" />

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Freigegeben am</TableHead>
            <TableHead>Herkunft</TableHead>
            <TableHead>Bearbeiter</TableHead>
            <TableHead>Einträge</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshots.map((snapshot) => {
            const info = releaseInfo(data, snapshot)
            return (
              <TableRow key={snapshot.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(snapshot.createdAt)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {isCheckinRelease(snapshot) ? (
                    CHECKIN_RELEASE_LABEL
                  ) : (
                    <>
                      REPLY {info.partner?.code} <span className="font-mono">{info.versionIndex}</span>
                    </>
                  )}
                </TableCell>
                <TableCell>
                  <UserName userId={snapshot.userId} />
                </TableCell>
                <TableCell>{snapshot.entries.length}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dmrl/${encodeURIComponent(dmrl.id)}/freigabestand/${encodeURIComponent(snapshot.id)}`}>
                        <Eye className="mr-1.5 h-4 w-4" aria-hidden />
                        Anzeigen
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => exportCsv(snapshot)}>
                      <Download className="mr-1.5 h-4 w-4" aria-hidden />
                      Als CSV exportieren
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void exportXml(snapshot)} disabled={busyId === snapshot.id}>
                      {busyId === snapshot.id ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <FileCode2 className="mr-1.5 h-4 w-4" aria-hidden />
                      )}
                      Als XML exportieren
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {dialog}
    </div>
  )
}

function HistoryTab({ dmrl }: { dmrl: Dmrl }) {
  const { data } = useDataStore()
  const [filter, setFilter] = useState<HistoryFilter>("alle")
  const [limit, setLimit] = useState(HISTORY_PAGE)
  const all = historyEntries(data, dmrl.id)
  if (all.length === 0) return <Empty text="Noch keine Workflow-Schritte" />
  const entries = historyEntries(data, dmrl.id, filter)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Select
          value={filter}
          onValueChange={(value) => {
            setFilter(value as HistoryFilter)
            setLimit(HISTORY_PAGE)
          }}
        >
          <SelectTrigger className="w-60" aria-label="Verlauf nach Aktionsart filtern">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(HISTORY_FILTERS).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                {value.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{entries.length} Einträge</span>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table aria-label="Verlauf">
          <TableHeader>
            <TableRow>
              <TableHead>Datum/Uhrzeit</TableHead>
              <TableHead>Benutzer</TableHead>
              <TableHead>Aktion</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Keine Einträge für diese Aktionsart
                </TableCell>
              </TableRow>
            ) : (
              entries.slice(0, limit).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(entry.at)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <UserName userId={entry.userId} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">{HISTORY_ACTION_LABEL[entry.action]}</TableCell>
                  <TableCell className="min-w-[16rem] text-sm">{entry.details}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {entries.length > limit && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + HISTORY_PAGE)}>
            Weitere {Math.min(HISTORY_PAGE, entries.length - limit)} anzeigen
          </Button>
        </div>
      )}
    </div>
  )
}
