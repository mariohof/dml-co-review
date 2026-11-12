import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { ResetDemoDataButton } from "@/components/data/reset-demo-data-button"
import { ADMIN_LINKS } from "@/lib/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** Verwaltungsübersicht (nur Administrator, PROJ-2) */
export default function VerwaltungPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand-darkest">Verwaltung</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {ADMIN_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-colors group-hover:border-primary">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base">{link.label}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demo-Daten</CardTitle>
          <CardDescription>
            Stellt den Demo-Ausgangszustand wieder her. Alle Änderungen gehen verloren; Ihre Anmeldung bleibt erhalten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetDemoDataButton />
        </CardContent>
      </Card>
    </div>
  )
}
