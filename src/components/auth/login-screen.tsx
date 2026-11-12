"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Info, LogIn } from "lucide-react"

import { useDataStore } from "@/components/data/data-store-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { activeUsers, ROLE_LABEL } from "@/lib/auth/permissions"
import { useSession } from "./session-provider"

/** Nur interne Ziele zulassen (kein Weiterleiten auf fremde Adressen) */
function safeTarget(target: string | null): string {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/anmelden")) return "/"
  return target
}

/** Anmeldeseite (PROJ-2): Klick auf einen aktiven Benutzer meldet ohne Passwort an */
export function LoginScreen() {
  const { data } = useDataStore()
  const { currentUser, login, loginNotice } = useSession()
  const router = useRouter()
  const target = safeTarget(useSearchParams().get("ziel"))

  useEffect(() => {
    if (currentUser) router.replace(target)
  }, [currentUser, router, target])

  const users = activeUsers(data)

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Prototyp</p>
          <CardTitle className="text-2xl text-brand-darkest">DMRL Management System</CardTitle>
          <CardDescription>Wählen Sie einen Benutzer, um sich anzumelden. Ein Passwort ist nicht nötig.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loginNotice && (
            <Alert>
              <Info className="h-4 w-4" aria-hidden />
              <AlertDescription>{loginNotice}</AlertDescription>
            </Alert>
          )}
          <ul className="divide-y rounded-md border" aria-label="Benutzer">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => login(user.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-medium">{user.name}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={user.role === "administrator" ? "default" : "secondary"}>
                      {ROLE_LABEL[user.role]}
                    </Badge>
                    <LogIn className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  )
}
