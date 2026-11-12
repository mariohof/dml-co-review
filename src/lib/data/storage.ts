import { datasetSchema, type Dataset } from "./schema"

/** localStorage-Schlüssel für das gesamte Datenpaket */
export const STORAGE_KEY = "dmrl-ms:dataset"

export type LoadResult =
  | { kind: "empty" }
  | { kind: "ok"; data: Dataset }
  | { kind: "invalid"; reason: string }

export type SaveResult = { ok: true } | { ok: false; reason: "quota" | "unknown"; message: string }

/** Liest und prüft das Datenpaket. Wirft nie. */
export function loadDataset(storage: Storage = window.localStorage): LoadResult {
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { kind: "invalid", reason: "Der Browser-Speicher ist nicht lesbar." }
  }
  if (raw === null) return { kind: "empty" }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: "invalid", reason: "Die gespeicherten Daten sind kein gültiges JSON." }
  }

  const result = datasetSchema.safeParse(parsed)
  if (!result.success) {
    const isOldFormat =
      typeof parsed === "object" &&
      parsed !== null &&
      "formatVersion" in parsed &&
      result.error.issues.some((issue) => issue.path[0] === "formatVersion")
    return {
      kind: "invalid",
      reason: isOldFormat
        ? "Die gespeicherten Daten stammen aus einer älteren, inkompatiblen Version des Prototyps."
        : "Die gespeicherten Daten sind beschädigt oder unvollständig.",
    }
  }
  return { kind: "ok", data: result.data }
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  )
}

/**
 * Anmeldung (PROJ-2): eigener Schlüssel, getrennt vom Datenbestand,
 * damit sie beim Zurücksetzen der Demo-Daten erhalten bleibt.
 */
export const SESSION_KEY = "dmrl-ms:session"

/** ID des angemeldeten Benutzers oder null. Wirft nie. */
export function loadSessionUserId(storage: Storage = window.localStorage): string | null {
  try {
    const raw = storage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "userId" in parsed &&
      typeof parsed.userId === "string" &&
      parsed.userId.length > 0
    ) {
      return parsed.userId
    }
    return null
  } catch {
    return null
  }
}

/** Speichert die Anmeldung (oder entfernt sie bei null). Gibt false zurück, wenn das nicht möglich war. */
export function saveSessionUserId(userId: string | null, storage: Storage = window.localStorage): boolean {
  try {
    if (userId === null) storage.removeItem(SESSION_KEY)
    else storage.setItem(SESSION_KEY, JSON.stringify({ userId }))
    return true
  } catch {
    return false
  }
}

/** Schreibt das komplette Datenpaket in einem Schritt. Bei Fehler bleibt der alte Stand erhalten. */
export function saveDataset(data: Dataset, storage: Storage = window.localStorage): SaveResult {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
    return { ok: true }
  } catch (error) {
    if (isQuotaError(error)) {
      return {
        ok: false,
        reason: "quota",
        message: "Der Browser-Speicher ist voll. Die Änderung wurde nicht gespeichert.",
      }
    }
    return { ok: false, reason: "unknown", message: "Die Daten konnten nicht gespeichert werden." }
  }
}
