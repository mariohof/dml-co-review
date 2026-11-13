"use client"

import { useMemo } from "react"

import { useDataStore } from "@/components/data/data-store-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Dmrl } from "@/lib/data/schema"
import { DmrlActionBar } from "./dmrl-action-bar"
import { DmrlHeader } from "./dmrl-header"
import { EntryTable } from "./entry-table"

/** DMRL-Ansicht (PROJ-7): Kopfbereich, Aktionsleiste, Eintragstabelle — reine Anzeige */
export function DmrlView({ dmrl }: { dmrl: Dmrl }) {
  const { data } = useDataStore()
  const entries = useMemo(() => data.entries.filter((entry) => entry.dmrlId === dmrl.id), [data.entries, dmrl.id])

  return (
    <div className="space-y-6">
      <DmrlHeader dmrl={dmrl} />
      <DmrlActionBar dmrl={dmrl} />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Einträge</CardTitle>
        </CardHeader>
        <CardContent>
          <EntryTable entries={entries} />
        </CardContent>
      </Card>
    </div>
  )
}
