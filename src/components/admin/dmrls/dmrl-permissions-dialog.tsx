"use client"

import { useState } from "react"
import Link from "next/link"
import { Info, Lock } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Dataset, Dmrl } from "@/lib/data/schema"
import { editorOptions, hasActiveEditors } from "@/lib/rules/permissions-admin"

interface DmrlPermissionsDialogProps {
  data: Dataset
  /** DMRL, deren Berechtigungen bearbeitet werden; null = Dialog geschlossen */
  dmrl: Dmrl | null
  systemName: string
  onClose: () => void
  onSubmit: (selectedIds: string[]) => boolean
}

/** Dialog „Berechtigungen" (PROJ-17): Mehrfachauswahl der Bearbeiter je DMRL */
export function DmrlPermissionsDialog({ data, dmrl, systemName, onClose, onSubmit }: DmrlPermissionsDialogProps) {
  return (
    <Dialog open={dmrl !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {dmrl && (
          // Neu einbinden je DMRL, damit die Auswahl beim Öffnen frisch aus dem Datenbestand kommt
          <PermissionsForm key={dmrl.id} data={data} dmrl={dmrl} systemName={systemName} onClose={onClose} onSubmit={onSubmit} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PermissionsForm({ data, dmrl, systemName, onClose, onSubmit }: DmrlPermissionsDialogProps & { dmrl: Dmrl }) {
  const options = editorOptions(data, dmrl)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(options.filter((o) => o.checked).map((o) => o.user.id)))

  const toggle = (id: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  return (
    <>
      <DialogHeader>
        <DialogTitle>Berechtigungen — {systemName}</DialogTitle>
        <DialogDescription>
          Berechtigte Bearbeiter sehen die DMRL im Dashboard und dürfen alle Workflows ausführen. Administratoren haben immer Zugriff.
        </DialogDescription>
      </DialogHeader>

      {!hasActiveEditors(data) && (
        <Alert>
          <Info className="h-4 w-4" aria-hidden />
          <AlertDescription>
            Keine aktiven Bearbeiter vorhanden — legen Sie zuerst Bearbeiter an (
            <Link href="/verwaltung/benutzer" className="text-primary underline-offset-4 hover:underline">
              Verwaltung → Benutzer
            </Link>
            ).
          </AlertDescription>
        </Alert>
      )}

      {options.length > 0 && (
        <fieldset className="space-y-1">
          <legend className="sr-only">Bearbeiter</legend>
          <ul className="divide-y rounded-md border">
            {options.map(({ user, inactive, locked }) => {
              const isChecked = selected.has(user.id)
              // inaktiv: nur abwählbar; Sperrinhaber: nicht abwählbar
              const disabled = !!locked || (inactive && !isChecked)
              const inputId = `editor-${user.id}`
              return (
                <li key={user.id} className="flex items-start gap-3 px-3 py-2.5">
                  <Checkbox
                    id={inputId}
                    checked={isChecked}
                    disabled={disabled}
                    onCheckedChange={(value) => toggle(user.id, value === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor={inputId} className="flex-1 space-y-1 text-sm">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {user.name}
                      {inactive && <Badge variant="outline">inaktiv</Badge>}
                    </span>
                    {locked && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3 shrink-0" aria-hidden />
                        {locked}
                      </span>
                    )}
                    {inactive && !locked && (
                      <span className="block text-xs text-muted-foreground">Inaktive Bearbeiter können entfernt, aber nicht neu berechtigt werden.</span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onClose}>
          Abbrechen
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (onSubmit(Array.from(selected))) onClose()
          }}
        >
          Speichern
        </Button>
      </DialogFooter>
    </>
  )
}
