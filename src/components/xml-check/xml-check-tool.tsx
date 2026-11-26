"use client"

import { useEffect, useRef, useState } from "react"
import { Download, FileUp, Info, Loader2, RotateCw, SearchCheck, ShieldAlert, TriangleAlert } from "lucide-react"

import { CheckReportView } from "@/components/check/check-report-view"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { S1000D_ISSUES, type S1000dIssue } from "@/lib/data/schema"
import { downloadBytes, downloadTextFile } from "@/lib/files/download"
import { XLSX_MIME_TYPE } from "@/lib/files/xlsx-writer"
import { reportFileName, reportToCsv } from "@/lib/rules/check/report"
import { errorCount, hintCount } from "@/lib/rules/check/types"
import {
  formatDmlCode,
  runXmlCheck,
  XLSX_HAS_ERRORS,
  XLSX_INFO_FIELDS_EMPTY,
  XLSX_WITHOUT_XSD,
  XSD_NOT_PERFORMED,
  xmlReportSubject,
  xmlXlsxFileName,
  type XmlCheckResult,
} from "@/lib/workflows/xml-check"
import { acceptXmlUpload } from "@/lib/xsd/client"

type State = { kind: "leer" } | { kind: "laeuft" } | { kind: "fehler"; message: string } | { kind: "ergebnis"; result: XmlCheckResult }

/** Werkzeug „XML prüfen" (PROJ-20): beliebige DMRL-XML prüfen und als MS-Excel-Datei im Check-out-Format (37 Spalten) herunterladen — speichert nichts */
export function XmlCheckTool() {
  const [issue, setIssue] = useState<S1000dIssue | "">("")
  const [file, setFile] = useState<File | null>(null)
  const [fileMessage, setFileMessage] = useState<string | null>(null)
  const [state, setState] = useState<State>({ kind: "leer" })
  /** „Erneut prüfen" läuft: bisheriges Ergebnis bleibt sichtbar */
  const [retrying, setRetrying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  /** fortlaufende Prüfnummer: verwirft Ergebnisse veralteter Prüfungen */
  const runRef = useRef(0)

  // Seite verlassen → laufende Prüfung verwerfen
  useEffect(() => () => void (runRef.current += 1), [])

  const reset = () => {
    runRef.current += 1
    setRetrying(false)
    setState({ kind: "leer" })
  }

  const chooseFile = (selected: File | undefined) => {
    reset()
    if (!selected) return
    const accepted = acceptXmlUpload(selected)
    if (!accepted.ok) {
      setFile(null)
      setFileMessage(accepted.message)
      return
    }
    setFileMessage(null)
    setFile(selected)
  }

  /** `retry`: „Erneut prüfen" — das bisherige Ergebnis bleibt sichtbar, bis das neue vorliegt */
  const check = async (retry = false) => {
    if (!issue || !file) return
    const run = ++runRef.current
    if (retry) setRetrying(true)
    else setState({ kind: "laeuft" })
    const outcome = await runXmlCheck(file, issue)
    if (run !== runRef.current) return
    setRetrying(false)
    setState(outcome.ok ? { kind: "ergebnis", result: outcome.result } : { kind: "fehler", message: outcome.message })
  }

  const running = state.kind === "laeuft"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datei und Issue</CardTitle>
          <CardDescription>
            Prüfung gegen das Schema (dml.xsd) und das Regelwerk des Check-ins. Es wird nichts gespeichert — keine DMRL, kein Archiv, kein Verlauf.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <div className="space-y-2">
              <Label htmlFor="xml-check-issue">S1000D-Issue</Label>
              <Select
                value={issue}
                onValueChange={(value) => {
                  reset()
                  setIssue(value as S1000dIssue)
                }}
              >
                <SelectTrigger id="xml-check-issue" aria-label="S1000D-Issue">
                  <SelectValue placeholder="Issue wählen" />
                </SelectTrigger>
                <SelectContent>
                  {S1000D_ISSUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      Issue {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="xml-check-file">XML-Datei (höchstens 5 MB)</Label>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                  <FileUp className="mr-2 h-4 w-4" aria-hidden />
                  Datei auswählen
                </Button>
                <span className="min-w-0 break-all text-sm text-muted-foreground">{file ? file.name : "Keine Datei ausgewählt"}</span>
                <input
                  ref={inputRef}
                  id="xml-check-file"
                  type="file"
                  accept=".xml,.XML,application/xml,text/xml"
                  className="sr-only"
                  aria-label="XML-Datei zur Prüfung"
                  onChange={(event) => {
                    chooseFile(event.target.files?.[0])
                    event.target.value = ""
                  }}
                />
              </div>
            </div>
          </div>

          {fileMessage && (
            <Alert variant="destructive">
              <AlertDescription>{fileMessage}</AlertDescription>
            </Alert>
          )}
          {!issue && <p className="text-sm text-muted-foreground">Bitte zuerst die S1000D-Issue der Datei wählen.</p>}

          <Button onClick={() => void check()} disabled={!issue || !file || running || retrying}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <SearchCheck className="mr-2 h-4 w-4" aria-hidden />}
            Prüfen
          </Button>
        </CardContent>
      </Card>

      {running && (
        <div className="flex items-center gap-3 text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Prüfe Schema (S1000D Issue {issue}) und Regelwerk — „{file?.name}“ …
        </div>
      )}

      {state.kind === "fehler" && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" aria-hidden />
          <AlertTitle>Die Datei kann nicht geprüft werden</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state.kind === "ergebnis" && <XmlCheckResultView result={state.result} onRetry={() => void check(true)} retrying={retrying} />}
    </div>
  )
}

function Item({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {/* Umbruch bevorzugt nach Bindestrichen (Browser-Standard), nur notfalls mitten im Wort */}
      <dd className={mono ? "font-mono text-sm [overflow-wrap:anywhere]" : "break-words text-sm"}>{children || "—"}</dd>
    </div>
  )
}

const DIRECTION_LABEL = { send: "SEND", reply: "REPLY" } as const

interface XmlCheckResultViewProps {
  result: XmlCheckResult
  /** XSD-Prüfung wiederholen (nur angeboten, wenn sie nicht durchgeführt wurde) */
  onRetry: () => void
  retrying: boolean
}

function XmlCheckResultView({ result, onRetry, retrying }: XmlCheckResultViewProps) {
  const errors = errorCount(result.report)
  const hints = hintCount(result.report)
  const header = result.parsed?.header
  const subject = xmlReportSubject(result.fileName)
  const overall =
    errors === 0 && hints === 0 ? "Keine Fehler" : `${errors} Fehler, ${hints} ${hints === 1 ? "Hinweis" : "Hinweise"}`
  const issueNumber = header ? `${header.issno.issno}-${header.issno.inwork}` : ""
  const date = header ? [header.issdate.year, header.issdate.month, header.issdate.day].filter(Boolean).join("-") : ""
  const reference = header?.dmlref ? `${formatDmlCode(header.dmlref.dmlc)}${header.dmlref.issno ? ` (${header.dmlref.issno.issno}-${header.dmlref.issno.inwork})` : ""}` : ""
  const xlsxWarning = errors > 0 ? XLSX_HAS_ERRORS : result.xsd === "nicht_durchgefuehrt" ? XLSX_WITHOUT_XSD : null
  const xlsx = result.xlsx

  return (
    <section aria-label="Prüfergebnis" className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            Zusammenfassung
            <Badge variant={errors > 0 ? "destructive" : "secondary"} className={errors === 0 ? "bg-green-100 text-green-900" : undefined}>
              {overall}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl aria-label="Zusammenfassung" className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <Item label="Datei" mono>{result.fileName}</Item>
            <Item label="S1000D-Issue">{result.issue}</Item>
            <Item label="Richtung">{header ? DIRECTION_LABEL[header.direction] : ""}</Item>
            <Item label="DML-Code" mono>{header ? formatDmlCode(header.dmlc) : ""}</Item>
            <Item label="Ausgabestand" mono>{issueNumber}</Item>
            <Item label="Datum" mono>{date}</Item>
            <Item label="Sicherheitseinstufung" mono>{header?.security}</Item>
            <Item label="Bezugs-DMRL" mono>{reference}</Item>
            <Item label="MI" mono>{result.summary.modelic}</Item>
            <Item label="Einträge">{String(result.summary.entries)}</Item>
            <Item label="Antworten">
              {`${result.summary.freigegeben} freigegeben · ${result.summary.zuUeberarbeiten} zu überarbeiten · ${result.summary.ohneAntwort} ohne Antwort`}
            </Item>
          </dl>
        </CardContent>
      </Card>

      {result.xsd === "nicht_durchgefuehrt" && (
        <Alert variant="destructive" role="alert">
          <ShieldAlert className="h-4 w-4" aria-hidden />
          <AlertTitle>{XSD_NOT_PERFORMED}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{result.xsdUnavailableDetail} Die Einträge wurden nur nach dem Regelwerk geprüft.</p>
            <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
              {retrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <RotateCw className="mr-2 h-4 w-4" aria-hidden />}
              Erneut prüfen
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Herunterladen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {xlsx === null ? (
            <p className="text-sm text-muted-foreground">Keine Excel-Datei — die Datei kann nicht gelesen werden.</p>
          ) : (
            <>
              {xlsxWarning && (
                <Alert className="border-amber-300 bg-amber-50 text-amber-950 [&>svg]:text-amber-700">
                  <TriangleAlert className="h-4 w-4" aria-hidden />
                  <AlertDescription>{xlsxWarning}</AlertDescription>
                </Alert>
              )}
              <Alert>
                <Info className="h-4 w-4" aria-hidden />
                <AlertDescription>{XLSX_INFO_FIELDS_EMPTY}</AlertDescription>
              </Alert>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {xlsx !== null && (
              <Button onClick={() => downloadBytes(xmlXlsxFileName(result.fileName), xlsx, XLSX_MIME_TYPE)}>
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Excel-Datei herunterladen
              </Button>
            )}
            <Button variant="outline" onClick={() => downloadTextFile(reportFileName(subject), reportToCsv(result.report), "text/csv;charset=utf-8")}>
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Prüfbericht herunterladen
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Prüfbericht</h2>
        <CheckReportView
          report={result.report}
          subject={subject}
          defaultOrder="regel"
          failTitle="Die Datei enthält Fehler"
          failNote={xlsx === null ? "Es wird keine Excel-Datei erzeugt." : "Die Excel-Datei kann mit Warnung heruntergeladen werden."}
        />
      </div>
    </section>
  )
}
