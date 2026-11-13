"use client"

import Link from "next/link"
import { ArrowLeft, Download, FileCode2, History, Loader2 } from "lucide-react"

import { NoPermission } from "@/components/auth/no-permission"
import { useDataStore } from "@/components/data/data-store-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/data/queries"
import type { Dmrl } from "@/lib/data/schema"
import { latestRelease, releaseInfo } from "@/lib/workflows/release"
import { EntryTable } from "./entry-table"
import { useReleaseExport } from "./release-export"

/** Seite „Freigabestand" (PROJ-14): nur lesend, deutlich gekennzeichnet, Export als CSV und XML */
export function ReleaseSnapshotView({ dmrl, snapshotId }: { dmrl: Dmrl; snapshotId: string }) {
  const { data } = useDataStore()
  const { exportCsv, exportXml, busyId, dialog } = useReleaseExport(dmrl)
  const snapshot = data.releases.find((r) => r.id === snapshotId && r.dmrlId === dmrl.id)
  const system = data.systems.find((s) => s.id === dmrl.systemId)

  if (!snapshot) {
    return <NoPermission title="Freigabestand nicht gefunden" description="Der aufgerufene Freigabestand existiert für diese DMRL nicht." />
  }

  const info = releaseInfo(data, snapshot)
  const isLatest = latestRelease(data, dmrl.id)?.id === snapshot.id
  const busy = busyId === snapshot.id

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-x-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/dmrl/${encodeURIComponent(dmrl.id)}`}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Zurück zur DMRL {system?.name}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dmrl/${encodeURIComponent(dmrl.id)}/archiv?ansicht=freigaben`}>Alle Freigabestände</Link>
        </Button>
      </div>

      <Alert className="border-primary/40 bg-primary/5">
        <History className="h-4 w-4" aria-hidden />
        <AlertTitle>
          Freigabestand vom {formatDateTime(snapshot.createdAt)} (REPLY {info.partner?.code} {info.versionIndex})
        </AlertTitle>
        <AlertDescription>
          Stand der Einträge zum Zeitpunkt der Freigabe — nicht der aktuelle Stand der DMRL. Nur lesend.
          {!isLatest && " Es gibt einen neueren Freigabestand."}
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Freigabestand</p>
          <h1 className="text-2xl font-semibold">{system?.name ?? "DMRL"}</h1>
          <p className="text-sm text-muted-foreground">
            {snapshot.entries.length} Einträge · Partner {info.partner ? `${info.partner.code} ${info.partner.name}` : "—"} · übernommen von{" "}
            {info.user?.name ?? "unbekannt"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Export">
          <Button variant="outline" onClick={() => exportCsv(snapshot)}>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Als CSV exportieren
          </Button>
          <Button variant="outline" onClick={() => void exportXml(snapshot)} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <FileCode2 className="mr-2 h-4 w-4" aria-hidden />}
            Als XML exportieren
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Einträge des Freigabestands</CardTitle>
        </CardHeader>
        <CardContent>
          <EntryTable entries={snapshot.entries} emptyMessage="Der Freigabestand enthält keine Einträge." />
        </CardContent>
      </Card>

      {dialog}
    </div>
  )
}
