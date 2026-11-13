"use client"

import Link from "next/link"
import { ArrowLeft, Ban, Download, FileWarning, MessageSquareQuote } from "lucide-react"

import { NoPermission } from "@/components/auth/no-permission"
import { useDataStore } from "@/components/data/data-store-provider"
import { EntryTable } from "@/components/dmrl/entry-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/data/queries"
import type { Dmrl, EntrySnapshot } from "@/lib/data/schema"
import { archiveLabel, dmlRefLabel, organisationLabelById, readArchived, userLabel } from "@/lib/dmrl/archive"
import { archivedEntryCount, downloadArchived } from "./archive-view"

/** Archivierter SEND/REPLY als Tabelle (PROJ-15): Datei neu eingelesen, nur lesend */
export function ArchivedFileView({ dmrl, archiveId }: { dmrl: Dmrl; archiveId: string }) {
  const { data } = useDataStore()
  const entry = data.archive.find((a) => a.id === archiveId && a.dmrlId === dmrl.id)
  const archiveHref = `/dmrl/${encodeURIComponent(dmrl.id)}/archiv`

  if (!entry) return <NoPermission title="Archivstand nicht gefunden" description="Der aufgerufene Stand existiert im Archiv dieser DMRL nicht." />

  const parsed = readArchived(data, entry)
  // Einträge der Datei ohne Status — Anzeige in der Datei-Ansicht der Eintragstabelle
  const rows: EntrySnapshot[] = (parsed?.entries ?? []).map((fields, index) => ({ id: `${entry.id}-${index + 1}`, status: "in_bearbeitung", fields }))
  const user = userLabel(data, entry.createdByUserId)
  const isReply = entry.direction === "reply"

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={archiveHref}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Zurück zum Archiv
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Archivierter Stand</p>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {archiveLabel(entry)}
            {entry.withdrawn && <Badge variant="outline">zurückgezogen</Badge>}
          </h1>
          <p className="break-all font-mono text-xs text-muted-foreground">{entry.fileName}</p>
        </div>
        <Button variant="outline" onClick={() => downloadArchived(entry)}>
          <Download className="mr-2 h-4 w-4" aria-hidden />
          Herunterladen
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-6" aria-label="Kopfdaten">
            <Item label="Richtung">{isReply ? "REPLY (Antwort des Partners)" : "SEND (an den Partner)"}</Item>
            <Item label="Partner">{organisationLabelById(data, entry.partnerOrganisationId)}</Item>
            <Item label="Datum">{formatDateTime(entry.createdAt)}</Item>
            <Item label="Bearbeiter">
              {user.name}
              {user.inactive && " (inaktiv)"}
            </Item>
            <Item label="Bezug">
              <span className="font-mono">{dmlRefLabel(entry)}</span>
            </Item>
            <Item label="Einträge">{archivedEntryCount(entry, parsed ? parsed.entries.length : null)}</Item>
          </dl>
        </CardContent>
      </Card>

      {entry.withdrawn && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950 [&>svg]:text-amber-700">
          <Ban className="h-4 w-4" aria-hidden />
          <AlertTitle>SEND zurückgezogen</AlertTitle>
          <AlertDescription>
            am {formatDateTime(entry.withdrawn.at)} von {userLabel(data, entry.withdrawn.userId).name} — {entry.withdrawn.reason}
          </AlertDescription>
        </Alert>
      )}

      {parsed?.header.remarks && (
        <Alert>
          <MessageSquareQuote className="h-4 w-4" aria-hidden />
          <AlertTitle>{isReply ? "Bemerkung des Partners" : "Bemerkung zur DMRL"}</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{parsed.header.remarks}</AlertDescription>
        </Alert>
      )}

      {parsed ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inhalt der Datei</CardTitle>
          </CardHeader>
          <CardContent>
            <EntryTable entries={rows} fileView emptyMessage="Die Datei enthält keine Einträge." />
          </CardContent>
        </Card>
      ) : (
        <Alert variant="destructive">
          <FileWarning className="h-4 w-4" aria-hidden />
          <AlertTitle>Inhalt kann nicht angezeigt werden</AlertTitle>
          <AlertDescription>Die archivierte Datei konnte nicht gelesen werden. Der Download der Originaldatei ist weiterhin möglich.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}
