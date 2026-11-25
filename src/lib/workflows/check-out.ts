import { canAccessAdministration, canAccessDmrl } from "@/lib/auth/permissions"
import { formatDateTime } from "@/lib/data/queries"
import type { Dataset, Dmrl, HistoryEntry, User } from "@/lib/data/schema"
import { writeEntriesXlsx } from "@/lib/files/entries-xlsx"
import { newId } from "@/lib/ids"

/**
 * Workflow „Check-out" (PROJ-9; seit Refinement 2026-11-25 als MS-Excel): Verfügbarkeitsregel (Grund) + atomare Ausführung inkl. Verlauf.
 * Muster für alle Workflow-Aktionen (PROJ-9 Tech Design).
 */

export type WorkflowResult = { ok: true; data: Dataset } | { ok: false; message: string }

const userName = (data: Dataset, id: string) => data.users.find((u) => u.id === id)?.name ?? "unbekannt"

/** null = Check-out möglich; sonst Grund */
export function checkOutBlocked(data: Dataset, dmrl: Dmrl, user: User | null): string | null {
  if (!canAccessDmrl(user, dmrl)) return "Keine Berechtigung für diese DMRL."
  if (dmrl.lock) return `Ausgecheckt von ${userName(data, dmrl.lock.userId)} seit ${formatDateTime(dmrl.lock.since)}.`
  if (dmrl.status === "gesendet") {
    return "Die DMRL wartet auf die Antwort des Empfängers (REPLY). Ein neuer Bearbeitungszyklus ist erst danach möglich."
  }
  return null
}

export const isLockHolder = (dmrl: Dmrl, user: User | null) => !!user && dmrl.lock?.userId === user.id

/** Sperre aufheben (Administrator, fremde Sperre) */
export function releaseLockBlocked(dmrl: Dmrl, user: User | null): string | null {
  if (!canAccessAdministration(user)) return "Nur Administratoren können eine Sperre aufheben."
  if (!dmrl.lock) return "Die DMRL ist nicht gesperrt."
  if (dmrl.lock.userId === user?.id) return "Eigene Sperre bitte über „Check-out zurücknehmen\" aufheben."
  return null
}

/** Dateiname: DML-{MI}-{CAGE Originator}-{DML-Typ}-{Jahr}.xlsx (Jahr des Check-outs) */
export function checkOutFileName(data: Dataset, dmrl: Dmrl, at: string): string {
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  const originator = data.organisations.find((o) => o.id === dmrl.originatorOrganisationId)
  const year = new Date(at).getFullYear()
  return `DML-${system?.modelic ?? "DMRL"}-${originator?.code ?? "XXXXX"}-${dmrl.dmlType.toUpperCase()}-${year}.xlsx`
}

/** Excel-Datei aus der Kopie in der Sperre (inhaltlich identisch beim erneuten Download; auch für Check-outs aus der CSV-Zeit) */
export function lockXlsx(dmrl: Dmrl): Uint8Array | null {
  return dmrl.lock ? writeEntriesXlsx(dmrl.lock.entries) : null
}

const history = (dmrlId: string, userId: string, at: string, action: HistoryEntry["action"], details: string): HistoryEntry => ({
  id: newId("history"),
  dmrlId,
  at,
  userId,
  action,
  details,
})

/** Check-out: Sperre mit Kopie aller Einträge + Verlaufseintrag in einer Speicherung */
export function executeCheckOut(data: Dataset, dmrlId: string, user: User | null, at: string = new Date().toISOString()): WorkflowResult {
  const dmrl = data.dmrls.find((d) => d.id === dmrlId)
  if (!dmrl || !user) return { ok: false, message: "DMRL oder Benutzer nicht gefunden." }
  const blocked = checkOutBlocked(data, dmrl, user)
  if (blocked) return { ok: false, message: blocked }
  const entries = data.entries
    .filter((entry) => entry.dmrlId === dmrlId)
    .map(({ id, status, fields }) => ({ id, status, fields: { ...fields } }))
  return {
    ok: true,
    data: {
      ...data,
      dmrls: data.dmrls.map((d) => (d.id === dmrlId ? { ...d, lock: { userId: user.id, since: at, entries } } : d)),
      history: [...data.history, history(dmrlId, user.id, at, "check_out", `Check-out (${entries.length} Einträge)`)],
    },
  }
}

/** Check-out zurücknehmen (nur Sperrinhaber): Sperre entfernen, DMRL unverändert */
export function executeCancelCheckOut(data: Dataset, dmrlId: string, user: User | null, at: string = new Date().toISOString()): WorkflowResult {
  const dmrl = data.dmrls.find((d) => d.id === dmrlId)
  if (!dmrl || !user) return { ok: false, message: "DMRL oder Benutzer nicht gefunden." }
  if (!isLockHolder(dmrl, user)) return { ok: false, message: "Nur der Sperrinhaber kann den Check-out zurücknehmen." }
  return {
    ok: true,
    data: {
      ...data,
      dmrls: data.dmrls.map((d) => (d.id === dmrlId ? { ...d, lock: null } : d)),
      history: [...data.history, history(dmrlId, user.id, at, "check_out_zurueckgenommen", "Check-out zurückgenommen")],
    },
  }
}

/** Sperre aufheben (Administrator): Sperre entfernen, DMRL unverändert */
export function executeReleaseLock(data: Dataset, dmrlId: string, user: User | null, at: string = new Date().toISOString()): WorkflowResult {
  const dmrl = data.dmrls.find((d) => d.id === dmrlId)
  if (!dmrl || !user) return { ok: false, message: "DMRL oder Benutzer nicht gefunden." }
  const blocked = releaseLockBlocked(dmrl, user)
  if (blocked) return { ok: false, message: blocked }
  const holder = userName(data, dmrl.lock!.userId)
  return {
    ok: true,
    data: {
      ...data,
      dmrls: data.dmrls.map((d) => (d.id === dmrlId ? { ...d, lock: null } : d)),
      history: [...data.history, history(dmrlId, user.id, at, "sperre_aufgehoben", `Sperre aufgehoben durch Administrator (Sperrinhaber: ${holder})`)],
    },
  }
}
