import { Badge } from "@/components/ui/badge"
import type { DmrlStatus } from "@/lib/data/schema"
import { cn } from "@/lib/utils"

export const DMRL_STATUS_LABEL: Record<DmrlStatus, string> = {
  in_bearbeitung: "In Bearbeitung",
  gesendet: "Gesendet",
  freigegeben: "Freigegeben",
}

const DMRL_STATUS_CLASS: Record<DmrlStatus, string> = {
  in_bearbeitung: "bg-slate-100 text-slate-800 hover:bg-slate-100",
  gesendet: "bg-primary/10 text-primary hover:bg-primary/10",
  freigegeben: "bg-green-100 text-green-800 hover:bg-green-100",
}

/** Status-Kennzeichen einer DMRL (gemeinsam für Dashboard, Ansicht, Verwaltung) */
export function DmrlStatusBadge({ status, className }: { status: DmrlStatus; className?: string }) {
  return <Badge className={cn("font-medium", DMRL_STATUS_CLASS[status], className)}>{DMRL_STATUS_LABEL[status]}</Badge>
}
