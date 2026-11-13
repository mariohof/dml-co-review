"use client"

import { TriangleAlert } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel: string
  onConfirm: () => void
  /** Sperrgründe: wenn vorhanden, wird statt der Bestätigung „nicht möglich, weil …" angezeigt */
  blockedTitle?: string
  reasons?: string[]
  destructive?: boolean
}

/** Bestätigungsdialog mit einheitlicher Anzeige von Sperrgründen (gemeinsames Verwaltungsmuster) */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  blockedTitle,
  reasons = [],
  destructive = false,
}: ConfirmDialogProps) {
  const blocked = reasons.length > 0
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{blocked ? (blockedTitle ?? `${title} nicht möglich`) : title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            {blocked ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Die Aktion ist derzeit nicht möglich:</p>
                <ul className="space-y-1">
                  {reasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{description}</div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{blocked ? "Schließen" : "Abbrechen"}</AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction
              onClick={onConfirm}
              className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            >
              {confirmLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
