"use client"

import { useRef, useState } from "react"
import { FileUp, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { CheckReportView } from "@/components/check/check-report-view"
import { useSession } from "@/components/auth/session-provider"
import { useDataStore } from "@/components/data/data-store-provider"
import { EntryTypeLabel } from "@/components/dmrl/entry-badges"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import type { Dmrl } from "@/lib/data/schema"
import { FIELD_LABEL, formatDmc } from "@/lib/dmrl/entries"
import type { CheckinResult } from "@/lib/rules/check/checkin"
import { errorCount } from "@/lib/rules/check/types"
import { checkCheckinFile, executeCheckIn, readCheckinFile, recordRejectedCheckIn } from "@/lib/workflows/check-in"
import { cn } from "@/lib/utils"

type Step =
  | { kind: "auswahl"; message?: string }
  | { kind: "pruefung"; fileName: string }
  | { kind: "ergebnis"; fileName: string; result: CheckinResult }

interface CheckInDialogProps {
  dmrl: Dmrl
  open: boolean
  onClose: () => void
}

/** Check-in-Dialog (PROJ-10): Datei wählen → Prüfung (PROJ-8) → Prüfbericht oder Zusammenfassung → Übernehmen */
export function CheckInDialog({ dmrl, open, onClose }: CheckInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {open && <CheckInFlow dmrl={dmrl} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function CheckInFlow({ dmrl, onClose }: { dmrl: Dmrl; onClose: () => void }) {
  const { data, update } = useDataStore()
  const { currentUser } = useSession()
  const [step, setStep] = useState<Step>({ kind: "auswahl" })
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const systemName = data.systems.find((s) => s.id === dmrl.systemId)?.name ?? "DMRL"

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setStep({ kind: "pruefung", fileName: file.name })
    const read = await readCheckinFile(file)
    if (!read.ok) {
      setStep({ kind: "auswahl", message: read.message })
      return
    }
    const result = checkCheckinFile(data, dmrl, read.text)
    if (errorCount(result.report) > 0 && currentUser) {
      update((current) => recordRejectedCheckIn(current, dmrl.id, currentUser, result))
    }
    setStep({ kind: "ergebnis", fileName: file.name, result })
  }

  const takeOver = (result: CheckinResult) => {
    const outcome = executeCheckIn(data, dmrl.id, currentUser, result)
    if (!outcome.ok) {
      toast.error(outcome.message)
      return
    }
    if (!update(() => outcome.data)) return
    const { neu, geaendert, unveraendert } = result.summary
    toast.success(`Check-in übernommen — ${neu} neu, ${geaendert} geändert, ${unveraendert} unverändert. Die Sperre ist aufgehoben.`)
    onClose()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Check-in — {systemName}</DialogTitle>
        <DialogDescription>
          Die CSV-Datei wird gegen den Stand beim Check-out geprüft. Nur eine fehlerfreie Datei kann übernommen werden.
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
            <p>CSV-Datei hierher ziehen oder auswählen (UTF-8, Semikolon, höchstens 5 MB)</p>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              <FileUp className="mr-2 h-4 w-4" aria-hidden />
              Datei auswählen
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="CSV-Datei für den Check-in"
              onChange={(event) => {
                void handleFile(event.target.files?.[0])
                event.target.value = ""
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Schließen
            </Button>
          </DialogFooter>
        </div>
      )}

      {step.kind === "pruefung" && (
        <div className="flex items-center gap-3 py-10 text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Prüfe „{step.fileName}“ …
        </div>
      )}

      {step.kind === "ergebnis" && errorCount(step.result.report) > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Datei: {step.fileName}</p>
          <CheckReportView report={step.result.report} subject={systemName} failTitle="Check-in nicht möglich" />
          <p className="text-sm text-muted-foreground">Die DMRL bleibt ausgecheckt. Korrigieren Sie die Datei und laden Sie sie erneut hoch.</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose}>
              Schließen
            </Button>
            <Button onClick={() => setStep({ kind: "auswahl" })}>Andere Datei wählen</Button>
          </DialogFooter>
        </div>
      )}

      {step.kind === "ergebnis" && errorCount(step.result.report) === 0 && step.result.comparison && (
        <CheckInSummary
          fileName={step.fileName}
          systemName={systemName}
          result={step.result}
          onCancel={onClose}
          onConfirm={() => takeOver(step.result)}
        />
      )}
    </>
  )
}

function CheckInSummary({
  fileName,
  systemName,
  result,
  onCancel,
  onConfirm,
}: {
  fileName: string
  systemName: string
  result: CheckinResult
  onCancel: () => void
  onConfirm: () => void
}) {
  const entries = result.comparison?.entries ?? []
  const newEntries = entries.filter((e) => e.classification === "neu")
  const changedEntries = entries.filter((e) => e.classification === "geaendert")
  const { geprueft, neu, geaendert, unveraendert } = result.summary
  const tiles = [
    { label: "geprüft", value: geprueft },
    { label: "neu", value: neu },
    { label: "geändert", value: geaendert },
    { label: "unverändert", value: unveraendert },
  ]

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Datei: {fileName}</p>
      <CheckReportView report={result.report} subject={systemName} />
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Zusammenfassung">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-md border px-3 py-2">
            <dt className="text-xs text-muted-foreground">{tile.label}</dt>
            <dd className="text-xl font-semibold">{tile.value}</dd>
          </div>
        ))}
      </dl>

      {newEntries.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Neue Einträge ({newEntries.length})</h3>
          <div className="max-h-56 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DMC</TableHead>
                  <TableHead>Tech Name</TableHead>
                  <TableHead>Eintragstyp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newEntries.map(({ candidate }) => (
                  <TableRow key={candidate.line}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{formatDmc(candidate.fields)}</TableCell>
                    <TableCell>{candidate.fields.techname}</TableCell>
                    <TableCell>
                      <EntryTypeLabel type={candidate.fields.dmentryType} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {changedEntries.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Geänderte Einträge ({changedEntries.length})</h3>
          <Accordion type="multiple" className="rounded-md border px-3">
            {changedEntries.map(({ candidate, previous, changedFields }) => (
              <AccordionItem key={candidate.line} value={String(candidate.line)}>
                <AccordionTrigger className="text-left">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{formatDmc(candidate.fields)}</span>
                    <span className="text-xs text-muted-foreground">{changedFields.length} Feld(er)</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feld</TableHead>
                        <TableHead>alt</TableHead>
                        <TableHead>neu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changedFields.map((field) => (
                        <TableRow key={field}>
                          <TableCell className="text-muted-foreground">{FIELD_LABEL[field]}</TableCell>
                          <TableCell className="text-red-700 line-through decoration-red-300">{previous?.fields[field] || "—"}</TableCell>
                          <TableCell className="font-medium text-green-800">{candidate.fields[field] || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {neu + geaendert === 0 && (
        <p className="text-sm text-muted-foreground">Keine Änderungen. Beim Übernehmen wird nur die Sperre aufgehoben; der Status der DMRL bleibt unverändert.</p>
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
