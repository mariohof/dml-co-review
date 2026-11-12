"use client"

import Link from "next/link"
import { Inbox } from "lucide-react"

import { useSession } from "@/components/auth/session-provider"
import { useDataStore } from "@/components/data/data-store-provider"
import { DmrlStatusBadge } from "@/components/dmrl/dmrl-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { canAccessAdministration, visibleDmrls } from "@/lib/auth/permissions"
import { currentVersionIndex } from "@/lib/data/queries"

/**
 * DMRL-Liste des Dashboards (PROJ-2): Administratoren sehen alle, Bearbeiter nur berechtigte DMRLs.
 * Kennzahlen, Filter und „Meine Aufgaben" folgen mit PROJ-16.
 */
export function DashboardDmrlList() {
  const { data } = useDataStore()
  const { currentUser } = useSession()
  const isAdmin = canAccessAdministration(currentUser)

  const rows = visibleDmrls(data, currentUser)
    .map((dmrl) => {
      const system = data.systems.find((item) => item.id === dmrl.systemId)
      const originator = data.organisations.find((item) => item.id === dmrl.originatorOrganisationId)
      const entryCount = data.entries.filter((entry) => entry.dmrlId === dmrl.id).length
      return { dmrl, system, originator, entryCount, version: currentVersionIndex(data, dmrl.id) }
    })
    .sort((a, b) => (a.system?.name ?? "").localeCompare(b.system?.name ?? "", "de"))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-xl">DMRL-Bestände</CardTitle>
        <Badge variant="secondary" className="uppercase tracking-wide">
          {rows.length} sichtbare Bestände
        </Badge>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Inbox className="h-10 w-10" aria-hidden />
            {isAdmin ? (
              <p>
                Noch keine DMRL angelegt.{" "}
                <Link href="/verwaltung/dmrl" className="text-primary underline-offset-4 hover:underline">
                  Zur DMRL-Verwaltung
                </Link>
              </p>
            ) : (
              <p>Ihnen sind noch keine DMRLs zugeordnet. Bitte wenden Sie sich an einen Administrator.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>System / DMRL</TableHead>
                  <TableHead>S1000D</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">DMRL-Einträge</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>
                    <span className="sr-only">Aktion</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ dmrl, system, originator, entryCount, version }) => (
                  <TableRow key={dmrl.id}>
                    <TableCell>
                      <div className="font-medium">{system?.name ?? "—"}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {[system?.modelic, originator?.code, dmrl.dmlType.toUpperCase()].join("–")}
                      </div>
                    </TableCell>
                    <TableCell>{system?.s1000dIssue ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{version ?? "—"}</TableCell>
                    <TableCell className="text-right">{entryCount}</TableCell>
                    <TableCell>
                      <DmrlStatusBadge status={dmrl.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dmrl/${encodeURIComponent(dmrl.id)}`}>Auswahl</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
