"use client"

import { useMemo, useState } from "react"
import { CircleCheck, Download, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { downloadTextFile } from "@/lib/files/download"
import { reportFileName, reportToCsv, sortFindings, type ReportOrder } from "@/lib/rules/check/report"
import { errorCount, hintCount, RULE_GROUP_LABEL, type Report } from "@/lib/rules/check/types"

export const FINDINGS_PAGE_SIZE = 100

interface CheckReportViewProps {
  report: Report
  /** Gegenstand für Dateiname, z. B. Systemname */
  subject: string
  /** Überschrift bei Fehlern (Standard: „Prüfung nicht bestanden") */
  failTitle?: string
  /** Satz nach der Fehlerzahl (Standard: „Die Datei wird nicht übernommen.") */
  failNote?: string
  /** Anfangssortierung (Standard: nach Zeile) */
  defaultOrder?: ReportOrder
}

/** Gemeinsame Prüfbericht-Anzeige (PROJ-8; genutzt von PROJ-10, 11, 13) */
export function CheckReportView({
  report,
  subject,
  failTitle = "Prüfung nicht bestanden",
  failNote = "Die Datei wird nicht übernommen.",
  defaultOrder = "zeile",
}: CheckReportViewProps) {
  const [order, setOrder] = useState<ReportOrder>(defaultOrder)
  const [limit, setLimit] = useState(FINDINGS_PAGE_SIZE)
  const errors = errorCount(report)
  const hints = hintCount(report)
  const sorted = useMemo(() => sortFindings(report.findings, order), [report, order])
  const visible = sorted.slice(0, limit)

  const summary = [errors > 0 && `${errors} Fehler`, hints > 0 && `${hints} ${hints === 1 ? "Hinweis" : "Hinweise"}`].filter(Boolean).join(" · ")

  return (
    <div className="space-y-4">
      {errors > 0 ? (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" aria-hidden />
          <AlertTitle>{failTitle}</AlertTitle>
          <AlertDescription>
            {summary}. {failNote}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-300 bg-green-50 text-green-950 [&>svg]:text-green-700">
          <CircleCheck className="h-4 w-4" aria-hidden />
          <AlertTitle>Prüfung bestanden</AlertTitle>
          <AlertDescription>{hints > 0 ? `${summary} — keine Fehler.` : "Keine Fehler und keine Hinweise."}</AlertDescription>
        </Alert>
      )}

      {report.findings.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs value={order} onValueChange={(value) => setOrder(value as ReportOrder)}>
              <TabsList aria-label="Sortierung des Prüfberichts">
                <TabsTrigger value="zeile">nach {report.lineLabel}</TabsTrigger>
                <TabsTrigger value="regel">nach Regel</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTextFile(reportFileName(subject), reportToCsv(report), "text/csv;charset=utf-8")}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Bericht herunterladen
            </Button>
          </div>
          <div className="max-h-[50vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Art</TableHead>
                  <TableHead>{report.lineLabel}</TableHead>
                  <TableHead>DMC</TableHead>
                  <TableHead>Feld</TableHead>
                  <TableHead>Regel</TableHead>
                  <TableHead>Meldung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((finding, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {finding.severity === "fehler" ? (
                        <Badge variant="destructive">Fehler</Badge>
                      ) : (
                        <Badge variant="secondary">Hinweis</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{finding.line ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{finding.dmc ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{finding.field ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{RULE_GROUP_LABEL[finding.group]}</TableCell>
                    <TableCell className="min-w-[16rem] text-sm">{finding.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {sorted.length > limit && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                … und {sorted.length - limit} weitere — der Download enthält alle {sorted.length} Meldungen.
              </span>
              <Button variant="link" size="sm" onClick={() => setLimit((l) => l + FINDINGS_PAGE_SIZE)}>
                Weitere anzeigen
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
