"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, FileCode2, History, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { NoPermission } from "@/components/auth/no-permission"
import { XsdCheckPanel, type XsdCheckState } from "@/components/check/xsd-check-panel"
import { useDataStore } from "@/components/data/data-store-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDateTime } from "@/lib/data/queries"
import type { Dmrl } from "@/lib/data/schema"
import { downloadTextFile } from "@/lib/files/download"
import { latestRelease, releaseCsv, releaseInfo, releaseXml } from "@/lib/workflows/release"
import { validateXml } from "@/lib/xsd/client"
import { EntryTable } from "./entry-table"

/** Seite „Freigabestand" (PROJ-14): nur lesend, deutlich gekennzeichnet, Export als CSV und XML */
export function ReleaseSnapshotView({ dmrl, snapshotId }: { dmrl: Dmrl; snapshotId: string }) {
  const { data } = useDataStore()
  const [xsd, setXsd] = useState<XsdCheckState | null>(null)
  const snapshot = data.releases.find((r) => r.id === snapshotId && r.dmrlId === dmrl.id)
  const system = data.systems.find((s) => s.id === dmrl.systemId)

  if (!snapshot) {
    return <NoPermission title="Freigabestand nicht gefunden" description="Der aufgerufene Freigabestand existiert für diese DMRL nicht." />
  }

  const info = releaseInfo(data, snapshot)
  const isLatest = latestRelease(data, dmrl.id)?.id === snapshot.id
  const busy = xsd?.kind === "laeuft"

  const exportCsv = () => {
    const { fileName, content } = releaseCsv(data, dmrl, snapshot)
    downloadTextFile(fileName, content, "text/csv;charset=utf-8")
    toast.success(`Freigabestand als CSV exportiert (${fileName}).`)
  }

  const exportXml = async () => {
    let file
    try {
      file = releaseXml(data, dmrl, snapshot)
    } catch (error) {
      toast.error((error as Error).message)
      return
    }
    setXsd({ kind: "laeuft", issue: file.issue })
    const result = await validateXml(file.content, file.issue)
    if (result.state !== "gueltig") {
      setXsd({ kind: "ergebnis", result })
      return
    }
    setXsd(null)
    downloadTextFile(file.fileName, file.content, "application/xml;charset=utf-8")
    toast.success(`Freigabestand als XML exportiert (${file.fileName}).`)
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/dmrl/${encodeURIComponent(dmrl.id)}`}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Zurück zur DMRL {system?.name}
        </Link>
      </Button>

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
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Als CSV exportieren
          </Button>
          <Button variant="outline" onClick={() => void exportXml()} disabled={busy}>
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

      <Dialog open={xsd?.kind === "ergebnis"} onOpenChange={(open) => !open && setXsd(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>XML-Export nicht möglich</DialogTitle>
            <DialogDescription>Die Datei wurde nicht heruntergeladen.</DialogDescription>
          </DialogHeader>
          {xsd && <XsdCheckPanel state={xsd} subject={system?.modelic ?? "DMRL"} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setXsd(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
