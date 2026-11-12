import { RequireLogin } from "@/components/auth/guards"
import { AppHeader } from "@/components/layout/app-header"

/** Geschützter Bereich: alle Seiten außer der Anmeldeseite (PROJ-2) */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireLogin>
      <div className="min-h-screen bg-muted/30">
        <AppHeader />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </RequireLogin>
  )
}
