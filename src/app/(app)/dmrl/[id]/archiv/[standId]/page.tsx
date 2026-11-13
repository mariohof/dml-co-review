"use client"

import { useParams } from "next/navigation"

import { ArchivedFileView } from "@/components/archive/archived-file-view"
import { RequireDmrl } from "@/components/auth/guards"

/** Archivierter SEND/REPLY als Tabelle (PROJ-15) mit Zugriffsschutz (PROJ-2) */
export default function ArchivedFilePage() {
  const { id, standId } = useParams<{ id: string; standId: string }>()
  return (
    <RequireDmrl dmrlId={decodeURIComponent(id)}>
      {(dmrl) => <ArchivedFileView dmrl={dmrl} archiveId={decodeURIComponent(standId)} />}
    </RequireDmrl>
  )
}
