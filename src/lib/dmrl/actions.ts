import { canAccessAdministration, canAccessDmrl } from "@/lib/auth/permissions"
import type { Dataset, Dmrl, User } from "@/lib/data/schema"
import { checkInBlocked } from "@/lib/workflows/check-in"
import { checkOutBlocked, isLockHolder, releaseLockBlocked } from "@/lib/workflows/check-out"
import { exportBlocked } from "@/lib/workflows/export"
import { replyBlocked } from "@/lib/workflows/reply"
import { sendBlocked, withdrawSendBlocked } from "@/lib/workflows/send"

/**
 * Verfügbarkeit der Aktionen in der DMRL-Ansicht (PROJ-7 Tech Design C).
 * Die Ansicht enthält keine eigene Workflow-Logik — jede Aktion liefert sichtbar / erlaubt / Grund.
 * Die Regeln stammen aus den Workflow-Features (PROJ-9, 10, 12, 13, 15, 18).
 */

export type DmrlActionId =
  | "check_out"
  | "check_in"
  | "send"
  | "reply_import"
  | "export"
  | "archive"
  | "check_out_zuruecknehmen"
  | "datei_erneut_herunterladen"
  | "sperre_aufheben"
  | "send_zurueckziehen"

export interface DmrlActionState {
  id: DmrlActionId
  label: string
  visible: boolean
  /** null = ausführbar; sonst Begründung für den Tooltip */
  blocked: string | null
}


export function dmrlActions(data: Dataset, dmrl: Dmrl, user: User | null): DmrlActionState[] {
  const isAdmin = canAccessAdministration(user)
  const holder = isLockHolder(dmrl, user)
  return [
    { id: "check_out", label: "Check-out", visible: !holder, blocked: checkOutBlocked(data, dmrl, user) },
    { id: "check_in", label: "Check-in", visible: holder, blocked: checkInBlocked(dmrl, user) },
    { id: "send", label: "SEND", visible: true, blocked: sendBlocked(data, dmrl, user) },
    { id: "reply_import", label: "REPLY", visible: true, blocked: replyBlocked(dmrl, user) },
    { id: "export", label: "Exportieren", visible: true, blocked: exportBlocked(dmrl, user) },
    { id: "archive", label: "Archiv", visible: true, blocked: canAccessDmrl(user, dmrl) ? null : "Keine Berechtigung für diese DMRL." },
    { id: "check_out_zuruecknehmen", label: "Check-out zurücknehmen", visible: holder, blocked: null },
    { id: "datei_erneut_herunterladen", label: "Excel-Datei erneut herunterladen", visible: holder, blocked: null },
    { id: "sperre_aufheben", label: "Sperre aufheben", visible: isAdmin && !!dmrl.lock && !holder, blocked: releaseLockBlocked(dmrl, user) },
    { id: "send_zurueckziehen", label: "SEND zurückziehen", visible: isAdmin && dmrl.status === "gesendet", blocked: withdrawSendBlocked(data, dmrl, user) },
  ]
}
