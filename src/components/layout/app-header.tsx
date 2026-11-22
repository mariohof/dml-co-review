"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, LogOut, UserRound } from "lucide-react"
import { toast } from "sonner"

import { useSession } from "@/components/auth/session-provider"
import { useDataStore } from "@/components/data/data-store-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { activeUsers, canAccessAdministration, ROLE_LABEL, routeAccess } from "@/lib/auth/permissions"
import { ADMIN_LINKS } from "@/lib/navigation"
import { cn } from "@/lib/utils"

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white",
        active && "bg-white/15 text-white"
      )}
    >
      {children}
    </Link>
  )
}

/** Kopfzeile mit Navigation und Benutzer-Auswahlliste (PROJ-2) */
export function AppHeader() {
  const { data } = useDataStore()
  const { currentUser, login, logout } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  if (!currentUser) return null

  const isAdmin = canAccessAdministration(currentUser)
  const inAdministration = pathname === "/verwaltung" || pathname.startsWith("/verwaltung/")

  const switchUser = (userId: string) => {
    if (userId === currentUser.id) return
    const nextUser = data.users.find((user) => user.id === userId)
    if (!nextUser || !login(userId)) return
    // Seite bleibt offen, wenn der neue Benutzer sie sehen darf; sonst Dashboard mit Hinweis.
    if (routeAccess(pathname, data, nextUser) === "forbidden") {
      router.push("/")
      toast.info(`Die vorherige Seite ist für ${nextUser.name} nicht verfügbar.`)
    } else {
      toast.success(`Angemeldet als ${nextUser.name} (${ROLE_LABEL[nextUser.role]})`)
    }
  }

  return (
    <header className="bg-brand-dark text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="mr-2 text-base font-semibold tracking-tight text-white">
          DMRL Management System
        </Link>

        <nav aria-label="Hauptnavigation" className="flex flex-1 items-center gap-1">
          <NavLink href="/" active={pathname === "/"}>
            Dashboard
          </NavLink>
          <NavLink href="/xml-pruefung" active={pathname === "/xml-pruefung"}>
            Werkzeug
          </NavLink>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-9 px-3 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white",
                    inAdministration && "bg-white/15 text-white"
                  )}
                >
                  Verwaltung
                  <ChevronDown className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/verwaltung">Übersicht</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {ADMIN_LINKS.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href}>{link.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-white/70 sm:inline">Benutzer</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 max-w-[16rem] border-white/30 bg-white text-brand-darkest hover:bg-white/90 md:max-w-[24rem] lg:max-w-[32rem]"
                aria-label={`Benutzer: ${currentUser.name}, ${ROLE_LABEL[currentUser.role]}. Benutzer wechseln`}
                title={`${currentUser.name} · ${ROLE_LABEL[currentUser.role]}`}
              >
                <UserRound className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                {/* Name vorrangig; gekürzt wird nur ein sehr langer Name, die Rolle nie (BUG-QA1-1) */}
                <span className="min-w-0 truncate">{currentUser.name}</span>
                <span className="ml-1 hidden shrink-0 whitespace-nowrap text-muted-foreground md:inline">· {ROLE_LABEL[currentUser.role]}</span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Benutzer wechseln</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={currentUser.id} onValueChange={switchUser}>
                {activeUsers(data).map((user) => (
                  <DropdownMenuRadioItem key={user.id} value={user.id}>
                    <span className="truncate">{user.name}</span>
                    <span className="ml-auto pl-2 text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  logout()
                  router.push("/anmelden")
                }}
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
