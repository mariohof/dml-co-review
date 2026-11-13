"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Boxes, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { AdminPage } from "@/components/admin/admin-page"
import { BlockedAction } from "@/components/admin/blocked-action"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { SearchField } from "@/components/admin/search-field"
import { useDataStore } from "@/components/data/data-store-provider"
import { DmrlStatusBadge } from "@/components/dmrl/dmrl-status-badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DmrlSystem } from "@/lib/data/schema"
import { newId } from "@/lib/ids"
import { createSystem, deleteSystem, systemRights, updateSystem, type SystemFormInput } from "@/lib/rules/systems"
import { SystemFormDialog } from "./system-form-dialog"

type FormState = { open: false } | { open: true; system: DmrlSystem | null }

const NO_LOCKS = { name: null, s1000dIssue: null, modelic: null, description: null }

/** Systemverwaltung (PROJ-5) */
export function SystemManagement() {
  const { data, update } = useDataStore()
  const [search, setSearch] = useState("")
  const [formState, setFormState] = useState<FormState>({ open: false })
  const [toDelete, setToDelete] = useState<DmrlSystem | null>(null)

  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("de")
    return [...data.systems]
      .filter(
        (system) =>
          !term || system.name.toLocaleLowerCase("de").includes(term) || system.modelic.toLocaleLowerCase("de").includes(term)
      )
      .sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))
      .map((system) => ({
        system,
        dmrl: data.dmrls.find((dmrl) => dmrl.systemId === system.id) ?? null,
        rights: systemRights(data, system),
      }))
  }, [data, search])

  const editing = formState.open ? formState.system : null

  const handleSubmit = (values: SystemFormInput): boolean => {
    const result = editing ? updateSystem(data, editing.id, values) : createSystem(data, values, newId("sys"))
    if (!result.ok) {
      toast.error(result.message)
      return false
    }
    if (!update(() => result.data)) return false
    toast.success(editing ? `System „${values.name.trim()}" gespeichert.` : `System „${values.name.trim()}" angelegt.`)
    return true
  }

  const confirmDelete = () => {
    if (!toDelete) return
    const result = deleteSystem(data, toDelete.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    if (update(() => result.data)) toast.success(`System „${toDelete.name}" gelöscht.`)
  }

  const createButton = (
    <Button onClick={() => setFormState({ open: true, system: null })}>
      <Plus className="mr-2 h-4 w-4" aria-hidden />
      System anlegen
    </Button>
  )

  return (
    <AdminPage
      title="Systeme"
      description="Systeme legen die S1000D-Issue und den Model Ident Code ihrer DMRL fest. Jedes System hat höchstens eine DMRL."
      action={createButton}
      toolbar={
        data.systems.length > 0 && (
          <SearchField value={search} onChange={setSearch} label="Systeme nach Bezeichnung oder Model Ident Code suchen" placeholder="Bezeichnung oder MI …" />
        )
      }
    >
      {data.systems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <Boxes className="h-10 w-10" aria-hidden />
          <p>Noch keine Systeme angelegt</p>
          {createButton}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bezeichnung</TableHead>
                <TableHead>Model Ident Code</TableHead>
                <TableHead>S1000D-Issue</TableHead>
                <TableHead>DMRL</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Keine Systeme gefunden
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ system, dmrl, rights }) => (
                  <TableRow key={system.id}>
                    <TableCell>
                      <div className="font-medium">{system.name}</div>
                      {system.description && (
                        <div className="max-w-xs truncate text-xs text-muted-foreground" title={system.description}>
                          {system.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{system.modelic}</TableCell>
                    <TableCell>{system.s1000dIssue}</TableCell>
                    <TableCell>
                      {dmrl ? (
                        <Link
                          href={`/dmrl/${encodeURIComponent(dmrl.id)}`}
                          className="inline-flex items-center gap-2 rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          vorhanden
                          <DmrlStatusBadge status={dmrl.status} />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">— keine —</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFormState({ open: true, system })}
                          aria-label={`${system.name} bearbeiten`}
                        >
                          <Pencil className="h-4 w-4 sm:mr-2" aria-hidden />
                          <span className="hidden sm:inline">Bearbeiten</span>
                        </Button>
                        <BlockedAction reason={rights.deleteBlocked}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!!rights.deleteBlocked}
                            onClick={() => setToDelete(system)}
                            aria-label={`${system.name} löschen`}
                          >
                            <Trash2 className="h-4 w-4 sm:mr-2" aria-hidden />
                            <span className="hidden sm:inline">Löschen</span>
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

      <SystemFormDialog
        open={formState.open}
        onOpenChange={(open) => !open && setFormState({ open: false })}
        data={data}
        system={editing}
        fieldBlocked={editing ? systemRights(data, editing).fieldBlocked : NO_LOCKS}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`System „${toDelete?.name ?? ""}" löschen?`}
        description="Das System wird endgültig entfernt."
        confirmLabel="Löschen"
        destructive
        onConfirm={confirmDelete}
      />
    </AdminPage>
  )
}
