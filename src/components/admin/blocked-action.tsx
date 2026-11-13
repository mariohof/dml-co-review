"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface BlockedActionProps {
  /** Begründung, warum die Aktion gesperrt ist; leer = nicht gesperrt */
  reason?: string | null
  children: React.ReactElement
}

/**
 * Zeigt bei gesperrten Aktionen/Feldern einen Tooltip mit Begründung (auch per Tastaturfokus erreichbar).
 * Das Kind muss bereits deaktiviert sein; es wird in ein fokussierbares Element gehüllt.
 */
export function BlockedAction({ reason, children }: BlockedActionProps) {
  if (!reason) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={reason}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{reason}</TooltipContent>
    </Tooltip>
  )
}
