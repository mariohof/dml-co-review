"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { useDataStore } from "@/components/data/data-store-provider"
import { isActiveUser } from "@/lib/auth/permissions"
import type { User } from "@/lib/data/schema"
import { loadSessionUserId, saveSessionUserId } from "@/lib/data/storage"

interface SessionContextValue {
  /** Angemeldeter, aktiver Benutzer (immer aus dem aktuellen Datenstand — Rollenänderungen wirken sofort) */
  currentUser: User | null
  /** Hinweis für die Anmeldeseite (z. B. „Ihr Benutzer ist nicht mehr aktiv"), einmalig */
  loginNotice: string | null
  clearLoginNotice: () => void
  login: (userId: string) => boolean
  logout: (notice?: string) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

/** Anmelde-Bereitsteller (PROJ-2). Muss innerhalb von DataStoreProvider liegen. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data } = useDataStore()
  const [sessionUserId, setSessionUserId] = useState<string | null | undefined>(undefined)
  const [loginNotice, setLoginNotice] = useState<string | null>(null)

  // Gespeicherte Anmeldung erst nach dem Mounten lesbar (localStorage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Lesen aus dem Browser-Speicher
    setSessionUserId(loadSessionUserId())
  }, [])

  const storedUser = sessionUserId ? data.users.find((user) => user.id === sessionUserId) : undefined
  const currentUser = isActiveUser(storedUser) ? storedUser : null

  const logout = useCallback((notice?: string) => {
    saveSessionUserId(null)
    setSessionUserId(null)
    setLoginNotice(notice ?? null)
  }, [])

  // Benutzer gelöscht oder deaktiviert (z. B. in anderem Tab oder nach Zurücksetzen): gespeicherte Anmeldung
  // entfernen. currentUser ist dann null → RequireLogin leitet zur Anmeldeseite, der Hinweis wird abgeleitet.
  const lostSession = !!sessionUserId && !currentUser
  useEffect(() => {
    if (lostSession) saveSessionUserId(null)
  }, [lostSession])
  const lostSessionNotice = lostSession
    ? storedUser
      ? "Ihr Benutzer ist nicht mehr aktiv."
      : "Ihr Benutzer existiert nicht mehr."
    : null

  const login = useCallback(
    (userId: string): boolean => {
      const user = data.users.find((item) => item.id === userId)
      if (!isActiveUser(user)) {
        toast.error("Dieser Benutzer kann sich nicht anmelden.")
        return false
      }
      if (!saveSessionUserId(userId)) {
        toast.error("Die Anmeldung konnte nicht gespeichert werden.")
        return false
      }
      setSessionUserId(userId)
      setLoginNotice(null)
      return true
    },
    [data.users]
  )

  const value = useMemo<SessionContextValue>(
    () => ({
      currentUser,
      loginNotice: loginNotice ?? lostSessionNotice,
      clearLoginNotice: () => setLoginNotice(null),
      login,
      logout,
    }),
    [currentUser, loginNotice, lostSessionNotice, login, logout]
  )

  // Bis die gespeicherte Anmeldung gelesen ist, nichts anzeigen (verhindert Flackern der Anmeldeseite).
  if (sessionUserId === undefined) return null

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession muss innerhalb von SessionProvider verwendet werden")
  return ctx
}
