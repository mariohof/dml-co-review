"use client"

import { useMemo, useState } from "react"
import { Building2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { AdminPage } from "@/components/admin/admin-page"
import { BlockedAction } from "@/components/admin/blocked-action"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { SearchField } from "@/components/admin/search-field"
import { useDataStore } from "@/components/data/data-store-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Organisation } from "@/lib/data/schema"
import { newId } from "@/lib/ids"
import {
  createOrganisation,
  deleteOrganisation,
  organisationRights,
  updateOrganisation,
  type OrganisationFormValues,
} from "@/lib/rules/organisations"
import { OrganisationFormDialog } from "./organisation-form-dialog"

type FormState = { open: false } | { open: true; organisation: Organisation | null }

/** Organisationsverwaltung (PROJ-4) */
export function OrganisationManagement() {
  const { data, update } = useDataStore()
  const [search, setSearch] = useState("")
  const [formState, setFormState] = useState<FormState>({ open: false })
  const [toDelete, setToDelete] = useState<Organisation | null>(null)

  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("de")
    return [...data.organisations]
      .filter((org) => !term || org.code.toLocaleLowerCase("de").includes(term) || org.name.toLocaleLowerCase("de").includes(term))
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((org) => ({ org, rights: organisationRights(data, org) }))
  }, [data, search])

  const editing = formState.open ? formState.organisation : null

  const handleSubmit = (values: OrganisationFormValues): boolean => {
    const result = editing ? updateOrganisation(data, editing.id, values) : createOrganisation(data, values, newId("org"))
    if (!result.ok) {
      toast.error(result.message)
      return false
    }
    if (!update(() => result.data)) return false
    toast.success(editing ? `Organisation „${values.name.trim()}" gespeichert.` : `Organisation „${values.name.trim()}" angelegt.`)
    return true
  }

  const confirmDelete = () => {
    if (!toDelete) return
    const result = deleteOrganisation(data, toDelete.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    if (update(() => result.data)) toast.success(`Organisation ${toDelete.code} gelöscht.`)
  }

  const createButton = (
    <Button onClick={() => setFormState({ open: true, organisation: null })}>
      <Plus className="mr-2 h-4 w-4" aria-hidden />
      Organisation anlegen
    </Button>
  )

  return (
    <AdminPage
      title="Organisationen"
      description="Organisationen sind Originator einer DMRL oder Empfänger beim Austausch. Identifiziert werden sie über den CAGE-Code."
      action={createButton}
      toolbar={
        data.organisations.length > 0 && (
          <SearchField value={search} onChange={setSearch} label="Organisationen nach CAGE-Code oder Name suchen" placeholder="CAGE-Code oder Name …" />
        )
      }
    >
      {data.organisations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <Building2 className="h-10 w-10" aria-hidden />
          <p>Noch keine Organisationen angelegt</p>
          {createButton}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CAGE-Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Zugeordnete DMRLs</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Keine Organisationen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ org, rights }) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-mono font-medium">{org.code}</TableCell>
                    <TableCell>{org.name}</TableCell>
                    <TableCell className="text-right">{rights.assignedCount}</TableCell>
                    <TableCell>
                      {rights.used ? (
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">im Workflow benutzt</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFormState({ open: true, organisation: org })}
                          aria-label={`${org.code} bearbeiten`}
                        >
                          <Pencil className="h-4 w-4 sm:mr-2" aria-hidden />
                          <span className="hidden sm:inline">Bearbeiten</span>
                        </Button>
                        <BlockedAction reason={rights.deleteBlocked}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!!rights.deleteBlocked}
                            onClick={() => setToDelete(org)}
                            aria-label={`${org.code} löschen`}
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

      <OrganisationFormDialog
        open={formState.open}
        onOpenChange={(open) => !open && setFormState({ open: false })}
        data={data}
        organisation={editing}
        codeBlocked={editing ? organisationRights(data, editing).codeBlocked : null}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Organisation ${toDelete?.code ?? ""} löschen?`}
        description={`„${toDelete?.name ?? ""}" wird endgültig entfernt.`}
        confirmLabel="Löschen"
        destructive
        onConfirm={confirmDelete}
      />
    </AdminPage>
  )
}
