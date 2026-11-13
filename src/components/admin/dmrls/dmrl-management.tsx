"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FileStack, Pencil, Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { AdminPage } from "@/components/admin/admin-page"
import { BlockedAction } from "@/components/admin/blocked-action"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { SearchField } from "@/components/admin/search-field"
import { useSession } from "@/components/auth/session-provider"
import { useDataStore } from "@/components/data/data-store-provider"
import { DmrlStatusBadge } from "@/components/dmrl/dmrl-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Dmrl } from "@/lib/data/schema"
import { newId } from "@/lib/ids"
import { createBlocked, createDmrl, deleteDmrl, dmrlRights, updateDmrl, type DmrlFormInput } from "@/lib/rules/dmrls"
import { permittedEditors, setDmrlEditors } from "@/lib/rules/permissions-admin"
import { DmrlFormDialog } from "./dmrl-form-dialog"
import { DmrlPermissionsDialog } from "./dmrl-permissions-dialog"

type FormState = { open: false } | { open: true; dmrl: Dmrl | null }

/** DMRL-Verwaltung (PROJ-6) mit Berechtigungen (PROJ-17) */
export function DmrlManagement() {
  const { data, update } = useDataStore()
  const { currentUser } = useSession()
  const [search, setSearch] = useState("")
  const [formState, setFormState] = useState<FormState>({ open: false })
  const [toDelete, setToDelete] = useState<Dmrl | null>(null)
  const [permissionsFor, setPermissionsFor] = useState<Dmrl | null>(null)

  const systemName = (dmrl: Dmrl) => data.systems.find((s) => s.id === dmrl.systemId)?.name ?? "—"

  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("de")
    return data.dmrls
      .map((dmrl) => ({
        dmrl,
        system: data.systems.find((s) => s.id === dmrl.systemId),
        originator: data.organisations.find((o) => o.id === dmrl.originatorOrganisationId),
        entryCount: data.entries.filter((e) => e.dmrlId === dmrl.id).length,
        rights: dmrlRights(data, dmrl),
        editors: permittedEditors(data, dmrl),
      }))
      .filter(({ system, originator }) => {
        if (!term) return true
        return [system?.name, system?.modelic, originator?.code, originator?.name].some((v) =>
          v?.toLocaleLowerCase("de").includes(term)
        )
      })
      .sort((a, b) => (a.system?.name ?? "").localeCompare(b.system?.name ?? "", "de", { sensitivity: "base" }))
  }, [data, search])

  const editing = formState.open ? formState.dmrl : null
  const createReason = createBlocked(data)

  const handleSubmit = (values: DmrlFormInput): boolean => {
    if (!currentUser) return false
    const result = editing
      ? updateDmrl(data, editing.id, values, currentUser.id)
      : createDmrl(data, values, newId("dmrl"))
    if (!result.ok) {
      toast.error(result.message)
      return false
    }
    if (result.data !== data && !update(() => result.data)) return false
    const name = data.systems.find((s) => s.id === values.systemId)?.name ?? ""
    toast.success(editing ? `DMRL „${name}" gespeichert.` : `DMRL „${name}" angelegt.`)
    return true
  }

  const savePermissions = (selectedIds: string[]): boolean => {
    if (!permissionsFor) return false
    const result = setDmrlEditors(data, permissionsFor.id, selectedIds)
    if (!result.ok) {
      toast.error(result.message)
      return false
    }
    if (!update(() => result.data)) return false
    toast.success(`Berechtigungen für „${systemName(permissionsFor)}" gespeichert.`)
    return true
  }

  const confirmDelete = () => {
    if (!toDelete) return
    const name = systemName(toDelete)
    const result = deleteDmrl(data, toDelete.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    if (update(() => result.data)) toast.success(`DMRL „${name}" gelöscht.`)
  }

  const createButton = (
    <BlockedAction reason={createReason}>
      <Button onClick={() => setFormState({ open: true, dmrl: null })} disabled={!!createReason}>
        <Plus className="mr-2 h-4 w-4" aria-hidden />
        DMRL anlegen
      </Button>
    </BlockedAction>
  )

  return (
    <AdminPage
      title="DMRLs & Berechtigungen"
      description="DMRLs zu Systemen anlegen, Kopfangaben pflegen und Bearbeiter berechtigen. Eine DMRL hat keine eigene Bezeichnung — angezeigt wird ihr System."
      action={createButton}
      toolbar={
        data.dmrls.length > 0 && (
          <SearchField value={search} onChange={setSearch} label="DMRLs nach System, Model Ident Code oder Originator suchen" placeholder="System, MI oder Originator …" />
        )
      }
    >
      {data.dmrls.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <FileStack className="h-10 w-10" aria-hidden />
          <p>Noch keine DMRLs angelegt</p>
          {createButton}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>System</TableHead>
                <TableHead>MI</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Originator</TableHead>
                <TableHead>DML-Typ</TableHead>
                <TableHead>Sicherheit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bearbeiter</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Keine DMRLs gefunden
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ dmrl, system, originator, entryCount, rights, editors }) => (
                  <TableRow key={dmrl.id}>
                    <TableCell>
                      <div className="font-medium">{system?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{entryCount} Einträge</div>
                    </TableCell>
                    <TableCell className="font-mono">{system?.modelic ?? "—"}</TableCell>
                    <TableCell>{system?.s1000dIssue ?? "—"}</TableCell>
                    <TableCell className="font-mono" title={originator?.name}>
                      {originator?.code ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono">{dmrl.dmlType}</TableCell>
                    <TableCell className="font-mono">{dmrl.security}</TableCell>
                    <TableCell>
                      <DmrlStatusBadge status={dmrl.status} />
                    </TableCell>
                    <TableCell>
                      {editors.length === 0 ? (
                        <span className="text-muted-foreground">— keine —</span>
                      ) : (
                        <ul className="space-y-0.5 text-sm">
                          {editors.map((editor) => (
                            <li key={editor.id} className="flex items-center gap-1.5 whitespace-nowrap">
                              {editor.name}
                              {!editor.active && (
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                                  inaktiv
                                </Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dmrl/${encodeURIComponent(dmrl.id)}`} aria-label={`DMRL ${system?.name ?? ""} öffnen`}>
                            Öffnen
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFormState({ open: true, dmrl })}
                          aria-label={`DMRL ${system?.name ?? ""} bearbeiten`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPermissionsFor(dmrl)}
                          aria-label={`Berechtigungen für ${system?.name ?? ""}`}
                        >
                          <Users className="h-4 w-4" aria-hidden />
                        </Button>
                        <BlockedAction reason={rights.deleteBlocked}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!!rights.deleteBlocked}
                            onClick={() => setToDelete(dmrl)}
                            aria-label={`DMRL ${system?.name ?? ""} löschen`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </BlockedAction>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <DmrlFormDialog
        open={formState.open}
        onOpenChange={(open) => !open && setFormState({ open: false })}
        data={data}
        dmrl={editing}
        fieldBlocked={editing ? dmrlRights(data, editing).fieldBlocked : null}
        onSubmit={handleSubmit}
      />

      <DmrlPermissionsDialog
        data={data}
        dmrl={permissionsFor}
        systemName={permissionsFor ? systemName(permissionsFor) : ""}
        onClose={() => setPermissionsFor(null)}
        onSubmit={savePermissions}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`DMRL „${toDelete ? systemName(toDelete) : ""}" löschen?`}
        description="Die DMRL wird mit allen Einträgen und Berechtigungen endgültig gelöscht. Das System erscheint danach wieder als „ohne DMRL“."
        confirmLabel="Löschen"
        destructive
        onConfirm={confirmDelete}
      />
    </AdminPage>
  )
}
