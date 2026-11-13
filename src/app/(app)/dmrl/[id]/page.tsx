"use client"

import { useParams } from "next/navigation"

import { RequireDmrl } from "@/components/auth/guards"
import { DmrlView } from "@/components/dmrl/dmrl-view"

/** DMRL-Ansicht (PROJ-7) mit Zugriffsschutz (PROJ-2) */
export default function DmrlPage() {
  const { id } = useParams<{ id: string }>()
  return <RequireDmrl dmrlId={decodeURIComponent(id)}>{(dmrl) => <DmrlView dmrl={dmrl} />}</RequireDmrl>
}
