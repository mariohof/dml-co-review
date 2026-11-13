"use client"

import { Archive, Download, FileDown, FileUp, LockOpen, RotateCcw, Send, Undo2, Upload } from "lucide-react"

import { BlockedAction } from "@/components/admin/blocked-action"
import { useSession } from "@/components/auth/session-provider"
import { useDataStore } from "@/components/data/data-store-provider"
import { Button } from "@/components/ui/button"
import type { Dmrl } from "@/lib/data/schema"
import { dmrlActions, type DmrlActionId } from "@/lib/dmrl/actions"

const ICONS: Record<DmrlActionId, React.ComponentType<{ className?: string }>> = {
  check_out: FileDown,
  check_in: FileUp,
  send: Send,
  reply_import: Upload,
  export: Download,
  archive: Archive,
  check_out_zuruecknehmen: Undo2,
  csv_erneut_herunterladen: RotateCcw,
  sperre_aufheben: LockOpen,
  send_zurueckziehen: Undo2,
}

interface DmrlActionBarProps {
  dmrl: Dmrl
  /** Aufruf einer erlaubten Aktion — die Workflow-Features hängen hier ihre Dialoge ein */
  onAction?: (id: DmrlActionId) => void
}

/** Aktionsleiste der DMRL-Ansicht (PROJ-7); Verfügbarkeit und Gründe aus den Workflow-Regeln */
export function DmrlActionBar({ dmrl, onAction }: DmrlActionBarProps) {
  const { data } = useDataStore()
  const { currentUser } = useSession()
  const actions = dmrlActions(data, dmrl, currentUser).filter((action) => action.visible)

  return (
    <div role="toolbar" aria-label="Aktionen" className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = ICONS[action.id]
        return (
          <BlockedAction key={action.id} reason={action.blocked}>
            <Button
              variant={action.id === "send" ? "default" : "outline"}
              size="sm"
              disabled={!!action.blocked}
              onClick={() => onAction?.(action.id)}
            >
              <Icon className="mr-2 h-4 w-4" aria-hidden />
              {action.label}
            </Button>
          </BlockedAction>
        )
      })}
    </div>
  )
}
