import type { Dataset, Dmrl, DmrlEntry, HistoryEntry, User } from "@/lib/data/schema"
import { newId } from "@/lib/ids"
import { runCheckinCheck, type CheckinResult } from "@/lib/rules/check/checkin"
import { errorCount } from "@/lib/rules/check/types"
import { isLockHolder, type WorkflowResult } from "./check-out"

/** Workflow „Check-in CSV" (PROJ-10): Verfügbarkeit, Dateiprüfung, Prüfung (PROJ-8) und atomare Übernahme */

export const MAX_CHECKIN_BYTES = 5 * 1024 * 1024

/** null = Check-in möglich; nur der Sperrinhaber (Bearbeiter oder Administrator) */
export function checkInBlocked(dmrl: Dmrl, user: User | null): string | null {
  if (!dmrl.lock) return "Die DMRL ist nicht ausgecheckt."
  if (!isLockHolder(dmrl, user)) return "Nur wer die DMRL ausgecheckt hat, kann sie einchecken."
  return null
}

export type FileReadResult = { ok: true; text: string } | { ok: false; message: string }

/** Dateityp (.csv), Größe (max. 5 MB) und Kodierung (UTF-8) prüfen */
export async function readCheckinFile(file: File): Promise<FileReadResult> {
  if (!file.name.toLowerCase().endsWith(".csv")) return { ok: false, message: "Bitte eine CSV-Datei auswählen." }
  if (file.size > MAX_CHECKIN_BYTES) return { ok: false, message: "Datei zu groß (höchstens 5 MB)." }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer())
    return { ok: true, text }
  } catch {
    return { ok: false, message: "Datei ist nicht UTF-8-kodiert." }
  }
}

/** Prüfung gegen den Stand beim Check-out (Kopie in der Sperre) */
export function checkCheckinFile(data: Dataset, dmrl: Dmrl, csvText: string): CheckinResult {
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  return runCheckinCheck(csvText, { systemModelic: system?.modelic ?? "", snapshot: dmrl.lock?.entries ?? [] })
}

const historyEntry = (dmrlId: string, userId: string, at: string, action: HistoryEntry["action"], details: string): HistoryEntry => ({
  id: newId("history"),
  dmrlId,
  at,
  userId,
  action,
  details,
})

/** Abgelehnter Check-in: nur Verlaufseintrag (PROJ-15) */
export function recordRejectedCheckIn(data: Dataset, dmrlId: string, user: User, result: CheckinResult, at = new Date().toISOString()): Dataset {
  return {
    ...data,
    history: [...data.history, historyEntry(dmrlId, user.id, at, "check_in_abgelehnt", `Check-in abgelehnt — ${errorCount(result.report)} Fehler`)],
  }
}

/**
 * Übernahme in einer Speicherung (PROJ-10 Tech Design B):
 * Einträge durch Dateiinhalt ersetzen (IDs per DMC erhalten), Status laut Spec, DMRL-Status, Sperre aufheben, Verlauf.
 */
export function executeCheckIn(
  data: Dataset,
  dmrlId: string,
  user: User | null,
  result: CheckinResult,
  at: string = new Date().toISOString()
): WorkflowResult {
  const dmrl = data.dmrls.find((d) => d.id === dmrlId)
  if (!dmrl || !user) return { ok: false, message: "DMRL oder Benutzer nicht gefunden." }
  // Verfügbarkeit erneut prüfen (Sperre könnte inzwischen aufgehoben sein)
  if (!dmrl.lock) return { ok: false, message: "Die Sperre wurde aufgehoben — Check-in nicht möglich." }
  const blocked = checkInBlocked(dmrl, user)
  if (blocked) return { ok: false, message: blocked }
  if (!result.comparison || errorCount(result.report) > 0) return { ok: false, message: "Die Datei enthält Fehler und kann nicht übernommen werden." }

  const currentStatus = new Map(data.entries.filter((e) => e.dmrlId === dmrlId).map((e) => [e.id, e.status]))
  const entries: DmrlEntry[] = result.comparison.entries.map(({ candidate, classification, previous }) => {
    if (classification === "neu" || !previous) {
      return { id: newId("entry"), dmrlId, status: "in_bearbeitung", fields: candidate.fields }
    }
    const status = classification === "geaendert" ? "in_bearbeitung" : (currentStatus.get(previous.id) ?? previous.status)
    return { id: previous.id, dmrlId, status, fields: candidate.fields }
  })

  const { neu, geaendert, unveraendert } = result.summary
  const changed = neu + geaendert > 0
  return {
    ok: true,
    data: {
      ...data,
      entries: [...data.entries.filter((e) => e.dmrlId !== dmrlId), ...entries],
      dmrls: data.dmrls.map((d) => (d.id === dmrlId ? { ...d, lock: null, status: changed ? "in_bearbeitung" : d.status } : d)),
      history: [
        ...data.history,
        historyEntry(dmrlId, user.id, at, "check_in", `Check-in — ${neu} neu, ${geaendert} geändert, ${unveraendert} unverändert`),
      ],
    },
  }
}
