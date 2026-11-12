"use client"

import { useParams } from "next/navigation"

import { RequireDmrl } from "@/components/auth/guards"
import { useDataStore } from "@/components/data/data-store-provider"
import { DmrlStatusBadge } from "@/components/dmrl/dmrl-status-badge"
import { PagePlaceholder } from "@/components/layout/page-placeholder"

/** DMRL-Ansicht — Zugriffsschutz (PROJ-2); Inhalt folgt mit PROJ-7 */
export default function DmrlPage() {
  const { id } = useParams<{ id: string }>()
  const { data } = useDataStore()

  return (
    <RequireDmrl dmrlId={decodeURIComponent(id)}>
      {(dmrl) => {
        const system = data.systems.find((item) => item.id === dmrl.systemId)
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <DmrlStatusBadge status={dmrl.status} />
              <span className="text-sm text-muted-foreground">
                {system?.modelic} · S1000D {system?.s1000dIssue}
              </span>
            </div>
            <PagePlaceholder title={system?.name ?? "DMRL"} feature="PROJ-7 (DMRL-Ansicht)" />
          </div>
        )
      }}
    </RequireDmrl>
  )
}
