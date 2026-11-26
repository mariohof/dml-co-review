"use client"

import { useRef, useState } from "react"
import { CircleCheck, FileUp, Info, Loader2, MessageSquareQuote, RotateCw, Upload } from "lucide-react"
import { toast } from "sonner"

import { useSession } from "@/components/auth/session-provider"
import { CheckReportView } from "@/components/check/check-report-view"
import { XsdCheckPanel } from "@/components/check/xsd-check-panel"
import { useDataStore } from "@/components/data/data-store-provider"
import { DmrlStatusBadge } from "@/components/dmrl/dmrl-status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { latestSend } from "@/lib/data/queries"
import { versionIndexOf, type Dmrl, type S1000dIssue } from "@/lib/data/schema"
import type { ReplyResult } from "@/lib/rules/check/reply"
import { errorCount } from "@/lib/rules/check/types"
import { cn } from "@/lib/utils"
import {
  checkReplyFile,
  executeReplyImport,
  readReplyFile,
  recordRejectedReply,
  replyOutcome,
  type ReplyImport,
} from "@/lib/workflows/reply"
import { acceptXmlUpload, validateXml, xsdResultToReport } from "@/lib/xsd/client"
import type { XsdResult } from "@/lib/xsd/types"

type Step =
  | { kind: "auswahl"; message?: string }
  | { kind: "pruefung"; fileName: string; phase: "xsd" | "regelwerk"; issue: S1000dIssue }
  | { kind: "xsd_fehler"; file: File; result: XsdResult }
  | { kind: "regel_fehler"; fileName: string; result: ReplyResult; issue: S1000dIssue }
  | { kind: "zusammenfassung"; input: ReplyImport; issue: S1000dIssue }

interface ReplyImportDialogProps {
  dmrl: Dmrl
  open: boolean
  onClose: () => void
}

/** REPLY-Dialog (PROJ-13): Datei → XSD-Prüfung (PROJ-11) → Regelwerk (PROJ-8) → Zusammenfassung → Übernehmen */
export function ReplyImportDialog({ dmrl, open, onClose }: ReplyImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      {/* Breit genug für die komplette Prüfbericht-Tabelle (6 Spalten) ohne horizontales Scrollen; min-w-0 verhindert, dass breite Tabellen das Grid aufweiten */}
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-6xl [&>*]:min-w-0">{open && <ReplyFlow dmrl={dmrl} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function ReplyFlow({ dmrl, onClose }: { dmrl: Dmrl; onClose: () => void }) {
  const { data, update } = useDataStore()
  const { currentUser } = useSession()
  const [step, setStep] = useState<Step>({ kind: "auswahl" })
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  const send = latestSend(data, dmrl.id)
  const subject = system?.modelic ?? "DMRL"

  const handleFile = async (file: File | undefined) => {
    if (!file || !system || !send) return
    const accepted = acceptXmlUpload(file)
    if (!accepted.ok) return setStep({ kind: "auswahl", message: accepted.message })
    const issue = system.s1000dIssue

    // 1. Schemaprüfung (Server)
    setStep({ kind: "pruefung", fileName: file.name, phase: "xsd", issue })
    const xsd = await validateXml(file, issue)
    if (xsd.state !== "gueltig") {
      if (xsd.state !== "nicht_verfuegbar" && currentUser) {
        update((current) => recordRejectedReply(current, dmrl.id, currentUser, file.name, "XSD-Prüfung", errorCount(xsdResultToReport(xsd))))
      }
      return setStep({ kind: "xsd_fehler", file, result: xsd })
    }

    // 2. Lesen (unverändert) und fachliche Prüfung (Browser)
    setStep({ kind: "pruefung", fileName: file.name, phase: "regelwerk", issue })
    const read = await readReplyFile(file)
    if (!read.ok) return setStep({ kind: "auswahl", message: read.message })
    const result = checkReplyFile(data, dmrl, read.text)
    if (errorCount(result.report) > 0) {
      if (currentUser) update((current) => recordRejectedReply(current, dmrl.id, currentUser, file.name, "Regelwerk", errorCount(result.report)))
      return setStep({ kind: "regel_fehler", fileName: file.name, result, issue })
    }
    setStep({ kind: "zusammenfassung", issue, input: { fileName: file.name, text: read.text, result, sendArchiveId: send.id } })
  }

  const takeOver = (input: ReplyImport) => {
    const outcome = executeReplyImport(data, dmrl.id, currentUser, input)
    if (!outcome.ok) {
      toast.error(outcome.message)
      return
    }
    if (!update(() => outcome.data)) return
    const status = outcome.data.dmrls.find((d) => d.id === dmrl.id)?.status
    toast.success(status === "freigegeben" ? "REPLY übernommen — die DMRL ist freigegeben." : "REPLY übernommen. Die DMRL ist wieder in Bearbeitung.")
    onClose()
  }

  const chooseOther = (
    <Button onClick={() => setStep({ kind: "auswahl" })}>
      <FileUp className="mr-2 h-4 w-4" aria-hidden />
      Andere Datei wählen
    </Button>
  )
  const closeButton = (
    <Button variant="outline" onClick={onClose}>
      Schließen
    </Button>
  )

  return (
    <>
      <DialogHeader>
        <DialogTitle>REPLY — {system?.name ?? "DMRL"}</DialogTitle>
        <DialogDescription>
          Antwort des Empfängers auf SEND {send ? versionIndexOf(send.dmlc) : "—"}. Die Datei wird gegen das Schema (S1000D Issue {system?.s1000dIssue}) und
          das Regelwerk geprüft; übernommen wird erst nach Ihrer Bestätigung.
        </DialogDescription>
      </DialogHeader>

      {step.kind === "auswahl" && (
        <div className="space-y-3">
          {step.message && (
            <Alert variant="destructive">
              <AlertDescription>{step.message}</AlertDescription>
            </Alert>
          )}
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragOver(false)
              void handleFile(event.dataTransfer.files[0])
            }}
            className={cn(
              "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground transition-colors",
              dragOver && "border-primary bg-primary/5"
            )}
          >
            <Upload className="h-8 w-8" aria-hidden />
            <p>REPLY-Datei (XML) hierher ziehen oder auswählen (höchstens 5 MB)</p>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              <FileUp className="mr-2 h-4 w-4" aria-hidden />
              Datei auswählen
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xml,.XML,application/xml,text/xml"
              className="sr-only"
              aria-label="XML-Datei für den REPLY-Import"
              onChange={(event) => {
                void handleFile(event.target.files?.[0])
                event.target.value = ""
              }}
            />
          </div>
          <DialogFooter>{closeButton}</DialogFooter>
        </div>
      )}

      {step.kind === "pruefung" && (
        <div className="flex items-center gap-3 py-10 text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          {step.phase === "xsd" ? `Schemaprüfung (S1000D Issue ${step.issue}) …` : "Fachliche Prüfung …"} — „{step.fileName}“
        </div>
      )}

      {step.kind === "xsd_fehler" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Datei: {step.file.name}</p>
          <XsdCheckPanel state={{ kind: "ergebnis", result: step.result }} subject={subject} />
          {step.result.state !== "nicht_verfuegbar" && (
            <p className="text-sm text-muted-foreground">Die DMRL wartet weiter auf eine gültige Antwort. Das Regelwerk wurde nicht ausgeführt.</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {closeButton}
            {step.result.state === "nicht_verfuegbar" ? (
              <Button onClick={() => void handleFile(step.file)}>
                <RotateCw className="mr-2 h-4 w-4" aria-hidden />
                Erneut versuchen
              </Button>
            ) : (
              chooseOther
            )}
          </DialogFooter>
        </div>
      )}

      {step.kind === "regel_fehler" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Datei: {step.fileName}</p>
          <XsdPassed issue={step.issue} />
          <CheckReportView report={step.result.report} subject={subject} failTitle="REPLY kann nicht übernommen werden" />
          <DialogFooter className="gap-2 sm:gap-0">
            {closeButton}
            {chooseOther}
          </DialogFooter>
        </div>
      )}

      {step.kind === "zusammenfassung" && (
        <ReplySummary dmrl={dmrl} issue={step.issue} input={step.input} onCancel={onClose} onConfirm={() => takeOver(step.input)} />
      )}
    </>
  )
}

function XsdPassed({ issue }: { issue: S1000dIssue }) {
  return (
    <p className="flex items-center gap-2 text-sm text-green-800">
      <CircleCheck className="h-4 w-4" aria-hidden />
      XSD-Prüfung bestanden (S1000D Issue {issue})
    </p>
  )
}

function ReplySummary({
  dmrl,
  issue,
  input,
  onCancel,
  onConfirm,
}: {
  dmrl: Dmrl
  issue: S1000dIssue
  input: ReplyImport
  onCancel: () => void
  onConfirm: () => void
}) {
  const { data } = useDataStore()
  const outcome = replyOutcome(data, dmrl.id, input.result)
  const header = input.result.parsed!.header
  const sender = data.organisations.find((o) => o.code === header.dmlc.sendid)
  const send = data.archive.find((a) => a.id === input.sendArchiveId)
  // Hinweise blockieren nicht, müssen aber sichtbar sein — z. B. abweichende Schema-Angabe (PROJ-22 E, BUG-QA22-1)
  const hints = input.result.report.findings.filter((f) => f.severity === "hinweis")
  const tiles = [
    { label: "freigegeben", value: outcome.approved },
    { label: "zu überarbeiten", value: outcome.rework },
  ]

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Datei: {input.fileName}</p>
      <div className="space-y-1">
        <XsdPassed issue={issue} />
        <p className="flex items-center gap-2 text-sm text-green-800">
          <CircleCheck className="h-4 w-4" aria-hidden />
          Fachliche Prüfung bestanden
        </p>
      </div>

      {hints.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950 [&>svg]:text-amber-700">
          <Info className="h-4 w-4" aria-hidden />
          <AlertTitle>{hints.length === 1 ? "Hinweis" : `${hints.length} Hinweise`} — die Übernahme ist trotzdem möglich</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {hints.map((hint, index) => (
                <li key={index}>{hint.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <dl className="grid gap-x-4 gap-y-2 rounded-md border bg-muted/40 p-4 text-sm sm:grid-cols-[auto_1fr]" aria-label="REPLY">
        <dt className="text-muted-foreground">Absender</dt>
        <dd className="font-medium">
          <span className="font-mono">{header.dmlc.sendid}</span> {sender?.name}
        </dd>
        <dt className="text-muted-foreground">Bezug</dt>
        <dd>
          REPLY {header.dmlc.sendid} <span className="font-mono">{versionIndexOf(header.dmlc)}</span> auf SEND{" "}
          <span className="font-mono">{send ? versionIndexOf(send.dmlc) : "—"}</span>
        </dd>
        <dt className="text-muted-foreground">DMRL danach</dt>
        <dd>
          <DmrlStatusBadge status={outcome.futureStatus} />
          {outcome.futureStatus === "freigegeben" && <span className="ml-2 text-muted-foreground">Alle Einträge sind freigegeben.</span>}
        </dd>
      </dl>

      <dl className="grid grid-cols-2 gap-2" aria-label="Zusammenfassung">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-md border px-3 py-2">
            <dt className="text-xs text-muted-foreground">{tile.label}</dt>
            <dd className="text-xl font-semibold">{tile.value}</dd>
          </div>
        ))}
      </dl>

      {outcome.rejected.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Abgelehnte Einträge ({outcome.rejected.length})</h3>
          <div className="max-h-56 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DMC</TableHead>
                  <TableHead>Tech Name</TableHead>
                  <TableHead>Begründung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outcome.rejected.map((entry) => (
                  <TableRow key={entry.dmc}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{entry.dmc}</TableCell>
                    <TableCell>{entry.techname}</TableCell>
                    <TableCell className="min-w-[12rem]">{entry.comment}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {header.remarks && (
        <Alert>
          <MessageSquareQuote className="h-4 w-4" aria-hidden />
          <AlertTitle>Bemerkung des Empfängers</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{header.remarks}</AlertDescription>
        </Alert>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={onConfirm}>Übernehmen</Button>
      </DialogFooter>
    </div>
  )
}
