"use client"

import { BadgeCheck, Lock, MessageSquareQuote, TriangleAlert } from "lucide-react"

import { useDataStore } from "@/components/data/data-store-provider"
import { DmrlStatusBadge } from "@/components/dmrl/dmrl-status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate, formatDateTime, latestSendInfo } from "@/lib/data/queries"
import { versionIndexOf, type Dmrl } from "@/lib/data/schema"

function Item({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground [hyphens:auto]" lang="de">{label}</dt>
      <dd className={mono ? "font-mono" : "font-medium"}>{children}</dd>
    </div>
  )
}

/** Kopfbereich der DMRL-Ansicht (PROJ-7) inkl. Freigabe-Nachweis (PROJ-14) und Partner-Bemerkung (PROJ-13) */
export function DmrlHeader({ dmrl }: { dmrl: Dmrl }) {
  const { data } = useDataStore()
  const system = data.systems.find((s) => s.id === dmrl.systemId)
  const originator = data.organisations.find((o) => o.id === dmrl.originatorOrganisationId)
  const send = latestSendInfo(data, dmrl.id)
  const lockUser = dmrl.lock ? data.users.find((u) => u.id === dmrl.lock?.userId) : null
  const release = dmrl.release
  const releaseReply = release ? data.archive.find((a) => a.id === release.replyArchiveId) : null
  const releasePartner = releaseReply ? data.organisations.find((o) => o.id === releaseReply.partnerOrganisationId) : null
  const releaseUser = release ? data.users.find((u) => u.id === release.userId) : null
  const releaseText = release && releaseReply
    ? `${formatDate(release.at)} durch REPLY ${releasePartner?.code ?? ""} ${versionIndexOf(releaseReply.dmlc)}`
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">DMRL</p>
          <h1 className="text-2xl font-semibold text-brand-darkest sm:text-3xl">{system?.name ?? "Unbekanntes System"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DmrlStatusBadge status={dmrl.status} className="text-sm" />
          {dmrl.lock && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-sm text-amber-900">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Ausgecheckt von {lockUser?.name ?? "unbekannt"} seit {formatDateTime(dmrl.lock.since)}
            </span>
          )}
        </div>
      </div>

      {dmrl.status !== "freigegeben" && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950 [&>svg]:text-amber-700">
          <TriangleAlert className="h-4 w-4" aria-hidden />
          <AlertTitle>Nicht freigegeben</AlertTitle>
          <AlertDescription>
            Darf nicht in einem Technische-Publikation-Projekt verwendet werden.
            {releaseText && (
              <span className="mt-1 block text-sm">
                Letzte Freigabe: {releaseText}. „Freigabestand anzeigen“ folgt mit PROJ-14.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {dmrl.status === "freigegeben" && releaseText && (
        <Alert className="border-green-300 bg-green-50 text-green-950 [&>svg]:text-green-700">
          <BadgeCheck className="h-4 w-4" aria-hidden />
          <AlertTitle>Freigegeben</AlertTitle>
          <AlertDescription>
            Freigegeben am {releaseText}
            {releaseUser && ` — übernommen von ${releaseUser.name}`}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
            <Item label="Model Ident Code" mono>{system?.modelic ?? "—"}</Item>
            <Item label="S1000D-Issue">{system?.s1000dIssue ?? "—"}</Item>
            <Item label="Originator">
              <span className="font-mono">{originator?.code ?? "—"}</span>
              {originator && <span className="block text-sm font-normal text-muted-foreground">{originator.name}</span>}
            </Item>
            <Item label="DML-Typ" mono>{dmrl.dmlType}</Item>
            <Item label="Sicherheitseinstufung" mono>{dmrl.security}</Item>
            <Item label="Versionsindex" mono>{send ? send.versionIndex : <span className="font-sans text-muted-foreground">— noch nicht gesendet —</span>}</Item>
          </dl>
          {send && (
            <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
              Letzter SEND {send.versionIndex} an{" "}
              <span className="font-medium text-foreground">
                {send.partner ? `${send.partner.code} ${send.partner.name}` : "unbekannt"}
              </span>{" "}
              am {formatDateTime(send.send.createdAt)} durch {send.user?.name ?? "unbekannt"}
            </p>
          )}
        </CardContent>
      </Card>

      {dmrl.partnerRemarks && (
        <Alert>
          <MessageSquareQuote className="h-4 w-4" aria-hidden />
          <AlertTitle>Bemerkung des Partners (letzter REPLY)</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{dmrl.partnerRemarks}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
