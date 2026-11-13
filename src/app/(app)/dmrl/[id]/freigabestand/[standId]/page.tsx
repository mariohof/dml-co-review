"use client"

import { useParams } from "next/navigation"

import { RequireDmrl } from "@/components/auth/guards"
import { ReleaseSnapshotView } from "@/components/dmrl/release-snapshot-view"

/** Freigabestand einer DMRL (PROJ-14) mit Zugriffsschutz (PROJ-2) */
export default function ReleaseSnapshotPage() {
  const { id, standId } = useParams<{ id: string; standId: string }>()
  return (
    <RequireDmrl dmrlId={decodeURIComponent(id)}>
      {(dmrl) => <ReleaseSnapshotView dmrl={dmrl} snapshotId={decodeURIComponent(standId)} />}
    </RequireDmrl>
  )
}
