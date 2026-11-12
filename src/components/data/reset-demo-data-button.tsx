"use client"

import { RotateCcw } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useDataStore } from "./data-store-provider"

/** Setzt alle Daten auf den Demo-Ausgangszustand zurück. Sichtbarkeit (nur Administrator) regelt der Aufrufer. */
export function ResetDemoDataButton() {
  const { resetToDemo } = useDataStore()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
          Demo-Daten zurücksetzen
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Demo-Daten zurücksetzen?</AlertDialogTitle>
          <AlertDialogDescription>
            Alle Änderungen gehen verloren. Benutzer, Organisationen, Systeme, DMRLs, Einträge, Archiv,
            Freigabestände und Verlauf werden auf den Demo-Ausgangszustand zurückgesetzt. Bestehende Sperren werden
            aufgehoben. Ihre Anmeldung bleibt erhalten.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (resetToDemo()) toast.success("Demo-Daten wurden zurückgesetzt.")
            }}
          >
            Zurücksetzen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
