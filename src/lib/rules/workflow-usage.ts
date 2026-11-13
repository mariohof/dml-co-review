import type { Dataset } from "@/lib/data/schema"

/**
 * Gemeinsame Regel „im Workflow benutzt" (PROJ-4 Tech Design C; genutzt von PROJ-4/5/6).
 * Abgeleitet aus Verlauf und Archiv — nicht gespeichert (PROJ-1).
 */

/** DMRL hat einen abgeschlossenen Check-in oder einen Archivstand (SEND/REPLY) */
export function isDmrlUsedInWorkflow(data: Dataset, dmrlId: string): boolean {
  return (
    data.history.some((entry) => entry.dmrlId === dmrlId && entry.action === "check_in") ||
    data.archive.some((item) => item.dmrlId === dmrlId)
  )
}

/**
 * Organisation ist Originator einer im Workflow benutzten DMRL oder Partner eines Archivstands.
 * Der aktuelle Originator genügt, da er nach dem ersten Workflow nicht mehr geändert werden kann (PROJ-6).
 */
export function isOrganisationUsedInWorkflow(data: Dataset, organisationId: string): boolean {
  return (
    data.dmrls.some(
      (dmrl) => dmrl.originatorOrganisationId === organisationId && isDmrlUsedInWorkflow(data, dmrl.id)
    ) || data.archive.some((item) => item.partnerOrganisationId === organisationId)
  )
}

/** System: seine DMRL ist im Workflow benutzt */
export function isSystemUsedInWorkflow(data: Dataset, systemId: string): boolean {
  return data.dmrls.some((dmrl) => dmrl.systemId === systemId && isDmrlUsedInWorkflow(data, dmrl.id))
}
