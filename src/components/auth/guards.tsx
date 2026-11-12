"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useDataStore } from "@/components/data/data-store-provider"
import { canAccessAdministration, canAccessDmrl } from "@/lib/auth/permissions"
import type { Dmrl } from "@/lib/data/schema"
import { NoPermission } from "./no-permission"
import { useSession } from "./session-provider"

/** Nur angemeldete Benutzer; sonst Weiterleitung zur Anmeldeseite */
export function RequireLogin({ children }: { children: React.ReactNode }) {
  const { currentUser } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!currentUser) router.replace(`/anmelden?ziel=${encodeURIComponent(pathname)}`)
  }, [currentUser, router, pathname])

  if (!currentUser) return null
  return <>{children}</>
}

/** Nur Administratoren (Verwaltung) */
export function RequireAdministrator({ children }: { children: React.ReactNode }) {
  const { currentUser } = useSession()
  if (!canAccessAdministration(currentUser)) return <NoPermission />
  return <>{children}</>
}

/** Nur Administratoren oder für die DMRL berechtigte Bearbeiter; gibt die DMRL an die Kinder weiter */
export function RequireDmrl({ dmrlId, children }: { dmrlId: string; children: (dmrl: Dmrl) => React.ReactNode }) {
  const { currentUser } = useSession()
  const { data } = useDataStore()
  const dmrl = data.dmrls.find((item) => item.id === dmrlId)

  if (!dmrl) {
    return (
      <NoPermission title="DMRL nicht gefunden" description="Die aufgerufene DMRL existiert nicht (mehr)." />
    )
  }
  if (!canAccessDmrl(currentUser, dmrl)) return <NoPermission />
  return <>{children(dmrl)}</>
}
