import { Badge } from "@/components/ui/badge"
import type { EntryStatus } from "@/lib/data/schema"
import { ENTRY_STATUS_LABEL, ENTRY_TYPE_LABEL } from "@/lib/dmrl/entries"
import { cn } from "@/lib/utils"

const STATUS_CLASS: Record<EntryStatus, string> = {
  in_bearbeitung: "bg-slate-100 text-slate-800 hover:bg-slate-100",
  gesendet: "bg-primary/10 text-primary hover:bg-primary/10",
  freigegeben: "bg-green-100 text-green-800 hover:bg-green-100",
  zu_ueberarbeiten: "bg-amber-100 text-amber-900 hover:bg-amber-100",
}

/** Eintragsstatus (gemeinsam für Ansicht, Freigabestand, Archiv) */
export function EntryStatusBadge({ status }: { status: EntryStatus }) {
  return <Badge className={cn("whitespace-nowrap font-medium", STATUS_CLASS[status])}>{ENTRY_STATUS_LABEL[status]}</Badge>
}

/** Eintragstyp n/c/d als Klartext; leer → nichts */
export function EntryTypeLabel({ type }: { type: string }) {
  if (type !== "n" && type !== "c" && type !== "d") return null
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap font-normal", type === "d" && "border-slate-400 text-slate-600")}>
      {ENTRY_TYPE_LABEL[type]}
    </Badge>
  )
}

/** Kennzeichen „DM gelöscht" (DM-Ausgabetyp deleted) */
export function DmDeletedBadge() {
  return (
    <Badge variant="outline" className="whitespace-nowrap border-red-300 bg-red-50 font-normal text-red-700">
      DM gelöscht
    </Badge>
  )
}
