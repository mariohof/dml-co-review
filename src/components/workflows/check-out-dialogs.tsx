"use client"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { useSession } from "@/components/auth/session-provider"
import { useDataStore } from "@/components/data/data-store-provider"
import type { Dmrl } from "@/lib/data/schema"
import { downloadTextFile } from "@/lib/files/download"
import {
  checkOutFileName,
  executeCancelCheckOut,
  executeCheckOut,
  executeReleaseLock,
  lockCsv,
} from "@/lib/workflows/check-out"

export type CheckOutDialogKind = "check_out" | "check_out_zuruecknehmen" | "sperre_aufheben"

const CSV_MIME = "text/csv;charset=utf-8"

/** CSV aus der gespeicherten Kopie herunterladen (Check-out und „CSV erneut herunterladen") */
export function downloadLockCsv(dmrl: Dmrl, fileName: string) {
  const csv = lockCsv(dmrl)
  if (csv) downloadTextFile(fileName, csv, CSV_MIME)
}

interface CheckOutDialogsProps {
  dmrl: Dmrl
  open: CheckOutDialogKind | null
  onClose: () => void
}

/** Dialoge des Workflows „Check-out CSV" (PROJ-9) */
export function CheckOutDialogs({ dmrl, open, onClose }: CheckOutDialogsProps) {
  const { data, update } = useDataStore()
  const { currentUser } = useSession()
  const lockUser = dmrl.lock ? data.users.find((u) => u.id === dmrl.lock?.userId) : null
  const previewName = checkOutFileName(data, dmrl, new Date().toISOString())

  const checkOut = () => {
    const at = new Date().toISOString()
    const result = executeCheckOut(data, dmrl.id, currentUser, at)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    // Erst speichern, dann herunterladen: ohne gespeicherte Sperre keine Datei
    if (!update(() => result.data)) return
    const locked = result.data.dmrls.find((d) => d.id === dmrl.id)!
    downloadLockCsv(locked, checkOutFileName(result.data, locked, at))
    toast.success("Die DMRL ist ausgecheckt und für andere gesperrt.")
  }

  const cancel = () => {
    const result = executeCancelCheckOut(data, dmrl.id, currentUser)
    if (!result.ok) return void toast.error(result.message)
    if (update(() => result.data)) toast.success("Check-out zurückgenommen. Die DMRL ist wieder frei.")
  }

  const release = () => {
    const result = executeReleaseLock(data, dmrl.id, currentUser)
    if (!result.ok) return void toast.error(result.message)
    if (update(() => result.data)) toast.success("Die Sperre wurde aufgehoben.")
  }

  const onOpenChange = (value: boolean) => !value && onClose()

  return (
    <>
      <ConfirmDialog
        open={open === "check_out"}
        onOpenChange={onOpenChange}
        title="DMRL auschecken?"
        description={
          <div className="space-y-2">
            <p>
              Die Einträge werden als CSV-Datei <span className="font-mono text-foreground">{previewName}</span> heruntergeladen.
            </p>
            <p>Die DMRL wird für andere gesperrt, bis Sie sie wieder einchecken.</p>
          </div>
        }
        confirmLabel="Auschecken"
        onConfirm={checkOut}
      />
      <ConfirmDialog
        open={open === "check_out_zuruecknehmen"}
        onOpenChange={onOpenChange}
        title="Check-out zurücknehmen?"
        description="Die Sperre wird aufgehoben, die DMRL bleibt unverändert. Änderungen in der ausgecheckten CSV-Datei gehen verloren."
        confirmLabel="Zurücknehmen"
        destructive
        onConfirm={cancel}
      />
      <ConfirmDialog
        open={open === "sperre_aufheben"}
        onOpenChange={onOpenChange}
        title="Sperre aufheben?"
        description={`Die DMRL ist ausgecheckt von ${lockUser?.name ?? "unbekannt"}. Nach dem Aufheben kann ${lockUser?.name ?? "der Sperrinhaber"} die ausgecheckte Datei nicht mehr einchecken; die DMRL bleibt unverändert.`}
        confirmLabel="Sperre aufheben"
        destructive
        onConfirm={release}
      />
    </>
  )
}
