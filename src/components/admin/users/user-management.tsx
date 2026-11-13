"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Power, PowerOff } from "lucide-react"
import { toast } from "sonner"

import { AdminPage } from "@/components/admin/admin-page"
import { BlockedAction } from "@/components/admin/blocked-action"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { SearchField } from "@/components/admin/search-field"
import { useSession } from "@/components/auth/session-provider"
import { useDataStore } from "@/components/data/data-store-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ROLE_LABEL } from "@/lib/auth/permissions"
import type { User } from "@/lib/data/schema"
import { newId } from "@/lib/ids"
import {
  canEditUser,
  createUser,
  deactivationBlockers,
  setUserActive,
  updateUser,
  type UserFormValues,
} from "@/lib/rules/users"
import { UserFormDialog } from "./user-form-dialog"

type FormState = { open: false } | { open: true; user: User | null }
type ToggleState = { user: User; reasons: string[] } | null

const SYSTEM_ACCOUNT_REASON = "Das Systemkonto „Administrator\" ist geschützt und kann nicht geändert werden."

/** Benutzerverwaltung (PROJ-3) */
export function UserManagement() {
  const { data, update } = useDataStore()
  const { currentUser } = useSession()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [formState, setFormState] = useState<FormState>({ open: false })
  const [toggle, setToggle] = useState<ToggleState>(null)

  const users = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("de")
    return [...data.users]
      .filter((user) => !term || user.name.toLocaleLowerCase("de").includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))
  }, [data.users, search])

  const handleSubmit = (values: UserFormValues): boolean => {
    const editing = formState.open ? formState.user : null
    const result = editing ? updateUser(data, editing.id, values) : createUser(data, values, newId("user"))
    if (!result.ok) {
      toast.error(result.message)
      return false
    }
    if (!update(() => result.data)) return false
    toast.success(editing ? `Benutzer „${values.name}" gespeichert.` : `Benutzer „${values.name}" angelegt.`)
    // Eigene Rolle auf Bearbeiter geändert → Verwaltung nicht mehr erlaubt (PROJ-2: wirkt sofort)
    if (editing && editing.id === currentUser?.id && values.role !== "administrator") {
      router.push("/")
      toast.info("Sie haben jetzt die Rolle Bearbeiter und keinen Zugriff mehr auf die Verwaltung.")
    }
    return true
  }

  const openToggle = (user: User) => {
    setToggle({ user, reasons: user.active ? deactivationBlockers(data, user, currentUser?.id ?? null) : [] })
  }

  const confirmToggle = () => {
    if (!toggle) return
    const { user } = toggle
    const result = setUserActive(data, user.id, !user.active, currentUser?.id ?? null)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    if (update(() => result.data)) {
      toast.success(user.active ? `„${user.name}" wurde deaktiviert.` : `„${user.name}" wurde aktiviert.`)
    }
  }

  return (
    <AdminPage
      title="Benutzer"
      description="Benutzer anlegen, Name und Rolle ändern, aktivieren und deaktivieren. Benutzer werden nie gelöscht."
      action={
        <Button onClick={() => setFormState({ open: true, user: null })}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Benutzer anlegen
        </Button>
      }
      toolbar={<SearchField value={search} onChange={setSearch} label="Benutzer nach Name suchen" placeholder="Name suchen …" />}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Keine Benutzer gefunden
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const editable = canEditUser(user)
                return (
                  <TableRow key={user.id} className={user.active ? undefined : "text-muted-foreground"}>
                    <TableCell className="font-medium">
                      <span>{user.name}</span>
                      {user.isSystemAccount && (
                        <Badge variant="outline" className="ml-2 border-primary/40 text-primary">
                          Systemkonto
                        </Badge>
                      )}
                      {user.id === currentUser?.id && <span className="ml-2 text-xs text-muted-foreground">(Sie)</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "administrator" ? "default" : "secondary"}>{ROLE_LABEL[user.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">aktiv</Badge>
                      ) : (
                        <Badge variant="outline">inaktiv</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <BlockedAction reason={editable ? null : SYSTEM_ACCOUNT_REASON}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!editable}
                            onClick={() => setFormState({ open: true, user })}
                            aria-label={`${user.name} bearbeiten`}
                          >
                            <Pencil className="h-4 w-4 sm:mr-2" aria-hidden />
                            <span className="hidden sm:inline">Bearbeiten</span>
                          </Button>
                        </BlockedAction>
                        <BlockedAction reason={editable ? null : SYSTEM_ACCOUNT_REASON}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!editable}
                            onClick={() => openToggle(user)}
                            aria-label={`${user.name} ${user.active ? "deaktivieren" : "aktivieren"}`}
                          >
                            {user.active ? (
                              <PowerOff className="h-4 w-4 sm:mr-2" aria-hidden />
                            ) : (
                              <Power className="h-4 w-4 sm:mr-2" aria-hidden />
                            )}
                            <span className="hidden sm:inline">{user.active ? "Deaktivieren" : "Aktivieren"}</span>
                          </Button>
                        </BlockedAction>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog
        open={formState.open}
        onOpenChange={(open) => !open && setFormState({ open: false })}
        data={data}
        user={formState.open ? formState.user : null}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={toggle !== null}
        onOpenChange={(open) => !open && setToggle(null)}
        title={toggle?.user.active ? `„${toggle.user.name}" deaktivieren?` : `„${toggle?.user.name ?? ""}" aktivieren?`}
        blockedTitle="Deaktivieren nicht möglich"
        description={
          toggle?.user.active
            ? "Der Benutzer erscheint nicht mehr in der Anmeldeliste und kann nicht mehr arbeiten. Seine Historie und DMRL-Berechtigungen bleiben erhalten."
            : "Der Benutzer erscheint wieder in der Anmeldeliste; seine bisherigen DMRL-Berechtigungen gelten wieder."
        }
        confirmLabel={toggle?.user.active ? "Deaktivieren" : "Aktivieren"}
        destructive={toggle?.user.active}
        reasons={toggle?.reasons}
        onConfirm={confirmToggle}
      />
    </AdminPage>
  )
}
