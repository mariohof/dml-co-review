"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Info, RotateCw, Send, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { useSession } from "@/components/auth/session-provider"
import { XsdCheckPanel, type XsdCheckState } from "@/components/check/xsd-check-panel"
import { useDataStore } from "@/components/data/data-store-provider"
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { currentVersionIndex } from "@/lib/data/queries"
import type { Dmrl } from "@/lib/data/schema"
import { downloadTextFile } from "@/lib/files/download"
import { errorCount } from "@/lib/rules/check/types"
import {
  executeSend,
  executeWithdrawSend,
  lastSendPartner,
  MAX_SEND_REMARKS,
  organisationLabel,
  prepareSend,
  recordFailedSend,
  sendPartners,
  sendPreview,
} from "@/lib/workflows/send"
import { validateXml, xsdResultToReport } from "@/lib/xsd/client"

const XML_MIME = "application/xml;charset=utf-8"

const sendFormSchema = z.object({
  partnerId: z.string().min(1, "Bitte einen Partner auswählen."),
  remarks: z.string().max(MAX_SEND_REMARKS, `Höchstens ${MAX_SEND_REMARKS} Zeichen.`),
})
type SendFormValues = z.infer<typeof sendFormSchema>

interface DialogProps {
  dmrl: Dmrl
  open: boolean
  onClose: () => void
}

/** SEND-Dialog (PROJ-12): Partner, Bemerkung, Vorschau → erzeugen → XSD-Prüfung (PROJ-11) → speichern → Download */
export function SendDialog({ dmrl, open, onClose }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      {/* Breit genug für die komplette Prüfbericht-Tabelle (6 Spalten) ohne horizontales Scrollen; min-w-0 verhindert, dass breite Tabellen das Grid aufweiten */}
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-6xl [&>*]:min-w-0">{open && <SendFlow dmrl={dmrl} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

type Step = { kind: "formular" } | { kind: "pruefung"; check: XsdCheckState; values: SendFormValues }

function SendFlow({ dmrl, onClose }: { dmrl: Dmrl; onClose: () => void }) {
  const { data, update } = useDataStore()
  const { currentUser } = useSession()
  const [step, setStep] = useState<Step>({ kind: "formular" })
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  const partners = sendPartners(data, dmrl)
  const lastPartner = lastSendPartner(data, dmrl)
  const preview = sendPreview(data, dmrl, new Date().toISOString())

  const form = useForm<SendFormValues>({
    resolver: zodResolver(sendFormSchema),
    defaultValues: { partnerId: lastPartner && partners.some((p) => p.id === lastPartner.id) ? lastPartner.id : "", remarks: "" },
  })
  const partnerId = useWatch({ control: form.control, name: "partnerId" })
  const remarks = useWatch({ control: form.control, name: "remarks" }) ?? ""

  const run = async (values: SendFormValues) => {
    if (!system || !currentUser) return
    const at = new Date().toISOString()
    let prepared
    try {
      prepared = prepareSend(data, dmrl, values.partnerId, values.remarks, at)
    } catch (error) {
      toast.error((error as Error).message)
      return
    }
    setStep({ kind: "pruefung", check: { kind: "laeuft", issue: system.s1000dIssue }, values })
    const result = await validateXml(prepared.xml, system.s1000dIssue)
    if (result.state !== "gueltig") {
      // Schemafehler in einer erzeugten Datei = Anwendungsfehler; „nicht verfügbar" wird nicht protokolliert
      if (result.state !== "nicht_verfuegbar") {
        update((current) => recordFailedSend(current, dmrl.id, currentUser, errorCount(xsdResultToReport(result)), at))
      }
      setStep({ kind: "pruefung", check: { kind: "ergebnis", result }, values })
      return
    }
    const outcome = executeSend(data, dmrl.id, currentUser, prepared)
    if (!outcome.ok) {
      toast.error(outcome.message)
      setStep({ kind: "formular" })
      return
    }
    // Erst speichern, dann herunterladen: kein Download ohne Archiv
    if (!update(() => outcome.data)) {
      setStep({ kind: "formular" })
      return
    }
    downloadTextFile(prepared.fileName, prepared.xml, XML_MIME)
    const partner = partners.find((p) => p.id === values.partnerId)
    toast.success(`SEND ${prepared.versionIndex} an ${partner ? organisationLabel(partner) : "Partner"} erstellt. Die Datei wurde heruntergeladen und archiviert.`)
    onClose()
  }

  const submit = form.handleSubmit((values) => void run(values))

  const header = (
    <DialogHeader>
      <DialogTitle>SEND — {system?.name ?? "DMRL"}</DialogTitle>
      <DialogDescription>
        Die DMRL wird als S1000D-XML (Issue {system?.s1000dIssue}) erzeugt, gegen das Schema geprüft, archiviert und heruntergeladen. Den Versand an den
        Partner erledigen Sie außerhalb der Anwendung.
      </DialogDescription>
    </DialogHeader>
  )

  if (step.kind === "pruefung") {
    const { check } = step
    const failed = check.kind === "ergebnis"
    const unavailable = failed && check.result.state === "nicht_verfuegbar"
    return (
      <>
        {header}
        {check.kind === "laeuft" && <p className="text-sm text-muted-foreground">XML wird erzeugt und geprüft …</p>}
        {failed && !unavailable && (
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" aria-hidden />
            <AlertTitle>Anwendungsfehler — SEND abgebrochen</AlertTitle>
            <AlertDescription>
              Die erzeugte Datei entspricht nicht dem Schema. Es wurde nichts heruntergeladen, kein Versionsindex vergeben und nichts archiviert. Bitte
              Administrator informieren.
            </AlertDescription>
          </Alert>
        )}
        <XsdCheckPanel state={check} subject={system?.modelic ?? "DMRL"} />
        {failed && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose}>
              Schließen
            </Button>
            {unavailable && (
              <Button onClick={() => void run(step.values)}>
                <RotateCw className="mr-2 h-4 w-4" aria-hidden />
                Erneut versuchen
              </Button>
            )}
          </DialogFooter>
        )}
      </>
    )
  }

  const deviates = !!lastPartner && !!partnerId && partnerId !== lastPartner.id

  return (
    <>
      {header}
      {partners.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" aria-hidden />
          <AlertDescription>
            Keine Partner-Organisation vorhanden — bitte zuerst anlegen (
            <Link href="/verwaltung/organisationen" className="text-primary underline-offset-4 hover:underline">
              Verwaltung → Organisationen
            </Link>
            ).
          </AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="partnerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Partner</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={partners.length === 0}>
                  <FormControl>
                    <SelectTrigger aria-label="Partner">
                      <SelectValue placeholder="Partner wählen" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {partners.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.code} · {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {deviates && (
                  <p className="text-sm text-amber-700" role="status">
                    Abweichend vom letzten Partner {organisationLabel(lastPartner)}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="remarks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bemerkung (optional)</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Begleittext für den Partner" {...field} />
                </FormControl>
                <FormDescription>
                  Wird als Bemerkung zur DMRL in die Datei geschrieben · {remarks.length}/{MAX_SEND_REMARKS}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <dl className="grid gap-x-4 gap-y-2 rounded-md border bg-muted/40 p-4 text-sm sm:grid-cols-[auto_1fr]" aria-label="Vorschau">
            <dt className="text-muted-foreground">Neuer Versionsindex</dt>
            <dd className="font-mono font-semibold">{preview.versionIndex}</dd>
            <dt className="text-muted-foreground">Dateiname</dt>
            <dd className="break-all font-mono">{preview.fileName}</dd>
            <dt className="text-muted-foreground">Einträge</dt>
            <dd>
              {preview.counts.gesamt} gesamt · {preview.counts.n} neu (n) · {preview.counts.c} geändert (c) · {preview.counts.d} Löschung (d)
            </dd>
          </dl>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={partners.length === 0}>
              <Send className="mr-2 h-4 w-4" aria-hidden />
              Senden
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  )
}

const withdrawSchema = z.object({ reason: z.string().trim().min(1, "Bitte eine Begründung angeben.").max(MAX_SEND_REMARKS) })
type WithdrawValues = z.infer<typeof withdrawSchema>

/** „SEND zurückziehen" (PROJ-12): nur Administrator, Pflicht-Begründung */
export function WithdrawSendDialog({ dmrl, open, onClose }: DialogProps) {
  const { data, update } = useDataStore()
  const { currentUser } = useSession()
  const versionIndex = currentVersionIndex(data, dmrl.id)
  const form = useForm<WithdrawValues>({ resolver: zodResolver(withdrawSchema), defaultValues: { reason: "" } })

  const close = () => {
    form.reset({ reason: "" })
    onClose()
  }

  const submit = form.handleSubmit(({ reason }) => {
    const result = executeWithdrawSend(data, dmrl.id, currentUser, reason)
    if (!result.ok) return void toast.error(result.message)
    if (update(() => result.data)) {
      toast.success(`SEND ${versionIndex ?? ""} zurückgezogen. Die DMRL ist wieder in Bearbeitung.`)
      close()
    }
  })

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>SEND {versionIndex} zurückziehen?</DialogTitle>
          <DialogDescription>
            Die DMRL und die gesendeten Einträge gehen zurück in Bearbeitung. Der Archivstand bleibt erhalten und wird als „zurückgezogen“ markiert; eine
            spätere Antwort des Partners auf diesen SEND wird abgelehnt. Der nächste SEND erhält einen neuen Versionsindex.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Begründung</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="z. B. Partner antwortet nicht, falscher Partner gewählt" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={close}>
                Abbrechen
              </Button>
              <Button type="submit" variant="destructive">
                Zurückziehen
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
