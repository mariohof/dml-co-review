"use client"

import { useState } from "react"
import { TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { XsdCheckPanel } from "@/components/check/xsd-check-panel"
import { useDataStore } from "@/components/data/data-store-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Dmrl } from "@/lib/data/schema"
import { downloadBytes, downloadTextFile } from "@/lib/files/download"
import { XLSX_MIME_TYPE } from "@/lib/files/xlsx-writer"
import { exportCsv, exportXlsx, exportXml } from "@/lib/workflows/export"
import { unavailableDetail, validateXml, XSD_UNAVAILABLE_MESSAGE } from "@/lib/xsd/client"
import type { XsdResult } from "@/lib/xsd/types"

export type ExportFormat = "csv" | "xml" | "xlsx"

/**
 * Export des aktuellen Stands (PROJ-18) — schreibt nichts in den Datenbestand.
 * CSV und Excel sofort; XML nur nach bestandener XSD-Prüfung; Schemafehler als Anwendungsfehler mit Bericht, sonst Meldung.
 */
export function useDmrlExport(dmrl: Dmrl) {
  const { data } = useDataStore()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<XsdResult | null>(null)
  const system = data.systems.find((s) => s.id === dmrl.systemId)

  const run = async (format: ExportFormat) => {
    if (format === "csv") {
      const file = exportCsv(data, dmrl)
      downloadTextFile(file.fileName, file.content, "text/csv;charset=utf-8")
      toast.success(`Als CSV exportiert (${file.fileName}).`)
      return
    }
    if (format === "xlsx") {
      try {
        const file = exportXlsx(data, dmrl)
        downloadBytes(file.fileName, file.bytes, XLSX_MIME_TYPE)
        toast.success(`Als Excel exportiert (${file.fileName}).`)
      } catch (error) {
        toast.error(`Excel-Export nicht möglich: ${(error as Error).message}`)
      }
      return
    }
    let file
    try {
      file = exportXml(data, dmrl)
    } catch (error) {
      toast.error((error as Error).message)
      return
    }
    setBusy(true)
    const toastId = toast.loading("XML wird erzeugt und geprüft …")
    const result = await validateXml(file.content, file.issue)
    setBusy(false)
    if (result.state === "gueltig") {
      downloadTextFile(file.fileName, file.content, "application/xml;charset=utf-8")
      toast.success(`Als XML exportiert (${file.fileName}).`, { id: toastId })
    } else if (result.state === "nicht_verfuegbar") {
      toast.error(XSD_UNAVAILABLE_MESSAGE, { id: toastId, description: unavailableDetail(result.reason) })
    } else {
      toast.dismiss(toastId)
      setFailed(result)
    }
  }

  const dialog = (
    <Dialog open={failed !== null} onOpenChange={(open) => !open && setFailed(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>XML-Export nicht möglich</DialogTitle>
          <DialogDescription>Die Datei wurde nicht heruntergeladen.</DialogDescription>
        </DialogHeader>
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" aria-hidden />
          <AlertTitle>Anwendungsfehler</AlertTitle>
          <AlertDescription>Die erzeugte Datei entspricht nicht dem Schema. Bitte Administrator informieren.</AlertDescription>
        </Alert>
        {failed && <XsdCheckPanel state={{ kind: "ergebnis", result: failed }} subject={system?.modelic ?? "DMRL"} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => setFailed(null)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { run, busy, dialog }
}
