"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { currentVersionIndex } from "@/lib/data/queries"
import type { Dmrl } from "@/lib/data/schema"
import { useDataStore } from "./data-store-provider"
import { ResetDemoDataButton } from "./reset-demo-data-button"

const STATUS_LABEL: Record<Dmrl["status"], string> = {
  in_bearbeitung: "in Bearbeitung",
  gesendet: "gesendet",
  freigegeben: "freigegeben",
}

const STATUS_CLASS: Record<Dmrl["status"], string> = {
  in_bearbeitung: "bg-slate-100 text-slate-800 hover:bg-slate-100",
  gesendet: "bg-primary/10 text-primary hover:bg-primary/10",
  freigegeben: "bg-green-100 text-green-800 hover:bg-green-100",
}

/**
 * Vorläufige Startseite (PROJ-1): Übersicht über den Datenbestand.
 * Der Reset-Button wird ab PROJ-2 nur für Administratoren im Admin-Bereich angezeigt.
 */
export function DataOverview() {
  const { data } = useDataStore()

  const counts = [
    { label: "Organisationen", value: data.organisations.length },
    { label: "Benutzer", value: data.users.length },
    { label: "Systeme", value: data.systems.length },
    { label: "DMRLs", value: data.dmrls.length },
    { label: "Einträge", value: data.entries.length },
    { label: "Archivstände", value: data.archive.length },
    { label: "Verlaufseinträge", value: data.history.length },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">DMRL Management System</h1>
          <p className="text-sm text-muted-foreground">Prototyp · Datenbestand im Browser</p>
        </div>
        <ResetDemoDataButton />
      </header>

      <section aria-label="Datenbestand" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {counts.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>DMRLs</CardTitle>
          <CardDescription>Alle DMRLs mit System, S1000D-Issue und aktuellem Stand</CardDescription>
        </CardHeader>
        <CardContent>
          {data.dmrls.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Noch keine DMRLs vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>System</TableHead>
                    <TableHead>MI</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Versionsindex</TableHead>
                    <TableHead className="text-right">Einträge</TableHead>
                    <TableHead className="text-right">Archiv</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dmrls.map((dmrl) => {
                    const system = data.systems.find((s) => s.id === dmrl.systemId)
                    const entryCount = data.entries.filter((e) => e.dmrlId === dmrl.id).length
                    const archiveCount = data.archive.filter((a) => a.dmrlId === dmrl.id).length
                    return (
                      <TableRow key={dmrl.id}>
                        <TableCell className="font-medium">{system?.name ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{system?.modelic ?? "—"}</TableCell>
                        <TableCell>{system?.s1000dIssue ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {currentVersionIndex(data, dmrl.id) ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">{entryCount}</TableCell>
                        <TableCell className="text-right">{archiveCount}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_CLASS[dmrl.status]}>{STATUS_LABEL[dmrl.status]}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
