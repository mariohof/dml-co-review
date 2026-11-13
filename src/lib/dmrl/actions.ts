import { canAccessAdministration } from "@/lib/auth/permissions"
import type { Dataset, Dmrl, User } from "@/lib/data/schema"

/**
 * Verfügbarkeit der Aktionen in der DMRL-Ansicht (PROJ-7 Tech Design C).
 * Die Ansicht enthält keine eigene Workflow-Logik — jede Aktion liefert sichtbar / erlaubt / Grund.
 * Die Workflow-Features (PROJ-9, 10, 12, 13, 15, 18) ersetzen die Platzhalter durch ihre Regeln.
 */

export type DmrlActionId =
  | "check_out"
  | "check_in"
  | "send"
  | "reply_import"
  | "export"
  | "archive"
  | "check_out_zuruecknehmen"
  | "csv_erneut_herunterladen"
  | "sperre_aufheben"
  | "send_zurueckziehen"

export interface DmrlActionState {
  id: DmrlActionId
  label: string
  visible: boolean
  /** null = ausführbar; sonst Begründung für den Tooltip */
  blocked: string | null
}

const notYet = (feature: string) => `Diese Funktion folgt mit ${feature}.`

export function dmrlActions(data: Dataset, dmrl: Dmrl, user: User | null): DmrlActionState[] {
  const isAdmin = canAccessAdministration(user)
  const isLockHolder = !!user && dmrl.lock?.userId === user.id
  return [
    { id: "check_out", label: "Check-out", visible: true, blocked: notYet("PROJ-9 (Check-out CSV)") },
    { id: "check_in", label: "Check-in", visible: true, blocked: notYet("PROJ-10 (Check-in CSV)") },
    { id: "send", label: "SEND", visible: true, blocked: notYet("PROJ-12 (SEND-Export)") },
    { id: "reply_import", label: "REPLY importieren", visible: true, blocked: notYet("PROJ-13 (REPLY-Import)") },
    { id: "export", label: "Exportieren", visible: true, blocked: notYet("PROJ-18 (DMRL-Export)") },
    { id: "archive", label: "Archiv", visible: true, blocked: notYet("PROJ-15 (Archiv)") },
    { id: "check_out_zuruecknehmen", label: "Check-out zurücknehmen", visible: isLockHolder, blocked: notYet("PROJ-9 (Check-out CSV)") },
    { id: "csv_erneut_herunterladen", label: "CSV erneut herunterladen", visible: isLockHolder, blocked: notYet("PROJ-9 (Check-out CSV)") },
    { id: "sperre_aufheben", label: "Sperre aufheben", visible: isAdmin && !!dmrl.lock && !isLockHolder, blocked: notYet("PROJ-9 (Check-out CSV)") },
    { id: "send_zurueckziehen", label: "SEND zurückziehen", visible: isAdmin && dmrl.status === "gesendet", blocked: notYet("PROJ-12 (SEND-Export)") },
  ]
}
