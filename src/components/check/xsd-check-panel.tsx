"use client"

import { CircleCheck, Loader2, ShieldAlert } from "lucide-react"

import { CheckReportView } from "@/components/check/check-report-view"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { S1000dIssue } from "@/lib/data/schema"
import { unavailableDetail, XSD_UNAVAILABLE_MESSAGE, xsdFailTitle, xsdResultToReport } from "@/lib/xsd/client"
import type { XsdResult } from "@/lib/xsd/types"

export type XsdCheckState = { kind: "laeuft"; issue: S1000dIssue } | { kind: "ergebnis"; result: XsdResult }

interface XsdCheckPanelProps {
  state: XsdCheckState
  /** Gegenstand für den Dateinamen des Berichts, z. B. Systemname */
  subject: string
}

/** Anzeige der XSD-Prüfung in den Dialogen von SEND, REPLY und Export (PROJ-11 Tech Design B) */
export function XsdCheckPanel({ state, subject }: XsdCheckPanelProps) {
  if (state.kind === "laeuft") {
    return (
      <div className="flex items-center gap-3 py-6 text-muted-foreground" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Schemaprüfung läuft (S1000D Issue {state.issue}) …
      </div>
    )
  }

  const { result } = state
  if (result.state === "gueltig") {
    return (
      <Alert className="border-green-300 bg-green-50 text-green-950 [&>svg]:text-green-700" role="status">
        <CircleCheck className="h-4 w-4" aria-hidden />
        <AlertTitle>{xsdFailTitle(result)}</AlertTitle>
      </Alert>
    )
  }

  if (result.state === "nicht_verfuegbar") {
    return (
      <Alert variant="destructive" role="alert">
        <ShieldAlert className="h-4 w-4" aria-hidden />
        <AlertTitle>{XSD_UNAVAILABLE_MESSAGE}</AlertTitle>
        <AlertDescription>{unavailableDetail(result.reason)}</AlertDescription>
      </Alert>
    )
  }

  return <CheckReportView report={xsdResultToReport(result)} subject={subject} failTitle={xsdFailTitle(result)} />
}

/** true = Vorgang darf weiterlaufen */
export const xsdPassed = (state: XsdCheckState | null) => state?.kind === "ergebnis" && state.result.state === "gueltig"
