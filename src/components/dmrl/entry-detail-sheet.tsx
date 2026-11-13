"use client"

import { DmDeletedBadge, EntryStatusBadge, EntryTypeLabel } from "@/components/dmrl/entry-badges"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ENTRY_FIELD_NAMES, type EntrySnapshot } from "@/lib/data/schema"
import { FIELD_LABEL, formatDmc, isDmDeleted } from "@/lib/dmrl/entries"

const GROUPS: { title: string; fields: (typeof ENTRY_FIELD_NAMES)[number][] }[] = [
  { title: "Data Module Code", fields: ["modelic", "sdc", "chapnum", "section", "subsect", "subject", "discode", "discodev", "incode", "incodev", "itemloc"] },
  { title: "Titel & Sprache", fields: ["techname", "infoname", "language", "country"] },
  { title: "Ausgabe des Datenmoduls", fields: ["issno", "type", "day", "month", "year"] },
  { title: "Abstimmung", fields: ["dmentryType", "security", "rpc", "rpcname", "answer", "answer_comment", "remarks"] },
]

interface EntryDetailSheetProps {
  entry: EntrySnapshot | null
  onClose: () => void
}

/** Detailfenster: alle 27 Felder eines Eintrags, nur lesend (PROJ-7) */
export function EntryDetailSheet({ entry, onClose }: EntryDetailSheetProps) {
  return (
    <Sheet open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {entry && (
          <>
            <SheetHeader>
              <SheetTitle className="break-all font-mono text-base">{formatDmc(entry.fields)}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap items-center gap-2">
                  <EntryStatusBadge status={entry.status} />
                  <EntryTypeLabel type={entry.fields.dmentryType} />
                  {isDmDeleted(entry.fields) && <DmDeletedBadge />}
                </div>
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-5">
              {GROUPS.map((group, index) => (
                <section key={group.title} aria-label={group.title}>
                  {index > 0 && <Separator className="mb-4" />}
                  <h3 className="mb-2 text-sm font-semibold text-brand-darkest">{group.title}</h3>
                  <dl className="grid grid-cols-[minmax(0,11rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
                    {group.fields.map((name) => (
                      <div key={name} className="contents">
                        <dt className="text-muted-foreground">{FIELD_LABEL[name]}</dt>
                        <dd className="break-words font-medium">{entry.fields[name] || <span className="text-muted-foreground">—</span>}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
