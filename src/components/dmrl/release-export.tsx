"use client"

import { useState } from "react"
import { toast } from "sonner"

import { XsdCheckPanel, type XsdCheckState } from "@/components/check/xsd-check-panel"
import { useDataStore } from "@/components/data/data-store-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Dmrl, ReleaseSnapshot } from "@/lib/data/schema"
import { downloadTextFile } from "@/lib/files/download"
import { releaseCsv, releaseXml } from "@/lib/workflows/release"
import { validateXml } from "@/lib/xsd/client"

/**
 * Export eines Freigabestands als CSV bzw. XML (PROJ-14) — gemeinsam für Freigabestand-Seite und Archiv (PROJ-15).
 * XML nur nach bestandener XSD-Prüfung; sonst Dialog mit Bericht, kein Download.
 */
export function useReleaseExport(dmrl: Dmrl) {
  const { data } = useDataStore()
  const [check, setCheck] = useState<{ snapshotId: string; state: XsdCheckState } | null>(null)
  const system = data.systems.find((s) => s.id === dmrl.systemId)

  const exportCsv = (snapshot: ReleaseSnapshot) => {
    const { fileName, content } = releaseCsv(data, dmrl, snapshot)
    downloadTextFile(fileName, content, "text/csv;charset=utf-8")
    toast.success(`Freigabestand als CSV exportiert (${fileName}).`)
  }

  const exportXml = async (snapshot: ReleaseSnapshot) => {
    let file
    try {
      file = releaseXml(data, dmrl, snapshot)
    } catch (error) {
      toast.error((error as Error).message)
      return
    }
    setCheck({ snapshotId: snapshot.id, state: { kind: "laeuft", issue: file.issue } })
    const result = await validateXml(file.content, file.issue)
    if (result.state !== "gueltig") {
      setCheck({ snapshotId: snapshot.id, state: { kind: "ergebnis", result } })
      return
    }
    setCheck(null)
    downloadTextFile(file.fileName, file.content, "application/xml;charset=utf-8")
    toast.success(`Freigabestand als XML exportiert (${file.fileName}).`)
  }

  /** Freigabestand, dessen XML gerade geprüft wird */
  const busyId = check?.state.kind === "laeuft" ? check.snapshotId : null

  const dialog = (
    <Dialog open={check?.state.kind === "ergebnis"} onOpenChange={(open) => !open && setCheck(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>XML-Export nicht möglich</DialogTitle>
          <DialogDescription>Die Datei wurde nicht heruntergeladen.</DialogDescription>
        </DialogHeader>
        {check && <XsdCheckPanel state={check.state} subject={system?.modelic ?? "DMRL"} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => setCheck(null)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { exportCsv, exportXml, busyId, dialog }
}
