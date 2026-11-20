import type { Dataset, Dmrl, DmrlEntry, DmrlStatus, HistoryEntry, User } from "@/lib/data/schema"
import { newId } from "@/lib/ids"
import {
  ANSWER_TAKEOVER_BLOCKED,
  answerDeviations,
  answerTakeoverBlockers,
  checkinSummary,
  effectiveClassification,
  isReleasedOnTakeover,
  runCheckinCheck,
  type CheckinResult,
} from "@/lib/rules/check/checkin"
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
 *
 * Empfängerantworten (Tech Design I, Refinement 2026-11-14): Ohne `takeAnswers` behalten bestehende Einträge ihre bisherigen
 * Antwortfelder, neue erhalten leere. Mit `takeAnswers` gelten die Werte aus der Datei; eine reine Antwortabweichung zählt
 * als Änderung (*in Bearbeitung*). Übernommene Antworten setzen nie *freigegeben* oder *zu überarbeiten*.
 */
export function executeCheckIn(
  data: Dataset,
  dmrlId: string,
  user: User | null,
  result: CheckinResult,
  at: string = new Date().toISOString(),
  takeAnswers = false
): WorkflowResult {
  const dmrl = data.dmrls.find((d) => d.id === dmrlId)
  if (!dmrl || !user) return { ok: false, message: "DMRL oder Benutzer nicht gefunden." }
  // Verfügbarkeit erneut prüfen (Sperre könnte inzwischen aufgehoben sein)
  if (!dmrl.lock) return { ok: false, message: "Die Sperre wurde aufgehoben — Check-in nicht möglich." }
  const blocked = checkInBlocked(dmrl, user)
  if (blocked) return { ok: false, message: blocked }
  if (!result.comparison || errorCount(result.report) > 0) return { ok: false, message: "Die Datei enthält Fehler und kann nicht übernommen werden." }
  if (takeAnswers && answerTakeoverBlockers(result.comparison).length > 0) return { ok: false, message: ANSWER_TAKEOVER_BLOCKED }

  const currentStatus = new Map(data.entries.filter((e) => e.dmrlId === dmrlId).map((e) => [e.id, e.status]))
  const entries: DmrlEntry[] = result.comparison.entries.map((compared) => {
    const { candidate, previous } = compared
    const fields = takeAnswers
      ? candidate.fields
      : { ...candidate.fields, answer: previous?.fields.answer ?? "", answer_comment: previous?.fields.answer_comment ?? "" }
    const classification = effectiveClassification(compared, takeAnswers)
    if (classification === "neu" || !previous) {
      // Bestand übernehmen (Refinement 2026-11-18): neu ohne Eintragstyp → freigegeben
      return { id: newId("entry"), dmrlId, status: isReleasedOnTakeover(compared) ? "freigegeben" : "in_bearbeitung", fields }
    }
    const status = classification === "geaendert" ? "in_bearbeitung" : (currentStatus.get(previous.id) ?? previous.status)
    return { id: previous.id, dmrlId, status, fields }
  })

  const { neu, geaendert, unveraendert, alsFreigegeben } = checkinSummary(result.candidates, result.comparison, takeAnswers)
  const changed = neu + geaendert > 0
  // Grundregel PROJ-14: DMRL freigegeben ⇔ alle Einträge freigegeben. Durch einen Check-in entsteht eine Freigabe nur,
  // wenn dabei Einträge als freigegeben übernommen wurden (Refinement 2026-11-18).
  const released = alsFreigegeben > 0 && entries.length > 0 && entries.every((e) => e.status === "freigegeben")
  const status: DmrlStatus = released ? "freigegeben" : changed ? "in_bearbeitung" : dmrl.status
  const takenAnswers = takeAnswers ? answerDeviations(result.comparison).length : 0
  const answersNote = takenAnswers > 0 ? `; ${takenAnswers} Antworten aus der Datei übernommen` : ""
  const releasedNote = alsFreigegeben > 0 ? ` (davon ${alsFreigegeben} als freigegeben übernommen)` : ""
  const dmrlReleasedNote = released ? " — DMRL freigegeben (Übernahme Bestand)" : ""
  return {
    ok: true,
    data: {
      ...data,
      entries: [...data.entries.filter((e) => e.dmrlId !== dmrlId), ...entries],
      dmrls: data.dmrls.map((d) =>
        d.id === dmrlId
          ? { ...d, lock: null, status, release: released ? { at, replyArchiveId: null, userId: user.id } : d.release }
          : d
      ),
      releases: released
        ? [
            ...data.releases,
            {
              id: newId("release"),
              dmrlId,
              createdAt: at,
              replyArchiveId: null,
              userId: user.id,
              entries: entries.map(({ id, status, fields }) => ({ id, status, fields })),
            },
          ]
        : data.releases,
      history: [
        ...data.history,
        historyEntry(
          dmrlId,
          user.id,
          at,
          "check_in",
          `Check-in — ${neu} neu${releasedNote}, ${geaendert} geändert, ${unveraendert} unverändert${answersNote}${dmrlReleasedNote}`
        ),
      ],
    },
  }
}
