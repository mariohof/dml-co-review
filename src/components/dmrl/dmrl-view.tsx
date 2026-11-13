"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { useDataStore } from "@/components/data/data-store-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckInDialog } from "@/components/workflows/check-in-dialog"
import { CheckOutDialogs, downloadLockCsv, type CheckOutDialogKind } from "@/components/workflows/check-out-dialogs"
import { useDmrlExport } from "@/components/workflows/dmrl-export"
import { ReplyImportDialog } from "@/components/workflows/reply-import-dialog"
import { SendDialog, WithdrawSendDialog } from "@/components/workflows/send-dialogs"
import type { Dmrl } from "@/lib/data/schema"
import type { DmrlActionId } from "@/lib/dmrl/actions"
import { checkOutFileName } from "@/lib/workflows/check-out"
import { DmrlActionBar } from "./dmrl-action-bar"
import { DmrlHeader } from "./dmrl-header"
import { EntryTable } from "./entry-table"

/** DMRL-Ansicht (PROJ-7): Kopfbereich, Aktionsleiste, Eintragstabelle — reine Anzeige; Workflows über Dialoge */
export function DmrlView({ dmrl }: { dmrl: Dmrl }) {
  const { data } = useDataStore()
  const router = useRouter()
  const entries = useMemo(() => data.entries.filter((entry) => entry.dmrlId === dmrl.id), [data.entries, dmrl.id])
  const [checkOutDialog, setCheckOutDialog] = useState<CheckOutDialogKind | null>(null)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const exporter = useDmrlExport(dmrl)

  const handleAction = (id: DmrlActionId) => {
    switch (id) {
      case "check_out":
      case "check_out_zuruecknehmen":
      case "sperre_aufheben":
        setCheckOutDialog(id)
        break
      case "check_in":
        setCheckInOpen(true)
        break
      case "send":
        setSendOpen(true)
        break
      case "send_zurueckziehen":
        setWithdrawOpen(true)
        break
      case "archive":
        router.push(`/dmrl/${encodeURIComponent(dmrl.id)}/archiv`)
        break
      case "reply_import":
        setReplyOpen(true)
        break
      case "csv_erneut_herunterladen":
        if (dmrl.lock) downloadLockCsv(dmrl, checkOutFileName(data, dmrl, dmrl.lock.since))
        break
    }
  }

  return (
    <div className="space-y-6">
      <DmrlHeader dmrl={dmrl} />
      <DmrlActionBar dmrl={dmrl} onAction={handleAction} onExport={(format) => void exporter.run(format)} exportBusy={exporter.busy} />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Einträge</CardTitle>
        </CardHeader>
        <CardContent>
          <EntryTable entries={entries} />
        </CardContent>
      </Card>
      <CheckOutDialogs dmrl={dmrl} open={checkOutDialog} onClose={() => setCheckOutDialog(null)} />
      <CheckInDialog dmrl={dmrl} open={checkInOpen} onClose={() => setCheckInOpen(false)} />
      <SendDialog dmrl={dmrl} open={sendOpen} onClose={() => setSendOpen(false)} />
      <WithdrawSendDialog dmrl={dmrl} open={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
      <ReplyImportDialog dmrl={dmrl} open={replyOpen} onClose={() => setReplyOpen(false)} />
      {exporter.dialog}
    </div>
  )
}
