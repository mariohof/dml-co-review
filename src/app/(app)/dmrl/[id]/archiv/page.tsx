"use client"

import { Suspense } from "react"
import { useParams } from "next/navigation"

import { ArchiveView } from "@/components/archive/archive-view"
import { RequireDmrl } from "@/components/auth/guards"

/** Archiv einer DMRL (PROJ-15) mit Zugriffsschutz (PROJ-2); Registerkarte über ?ansicht= */
export default function ArchivePage() {
  const { id } = useParams<{ id: string }>()
  return (
    <Suspense>
      <RequireDmrl dmrlId={decodeURIComponent(id)}>{(dmrl) => <ArchiveView dmrl={dmrl} />}</RequireDmrl>
    </Suspense>
  )
}
