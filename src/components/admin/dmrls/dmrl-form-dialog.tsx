"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Info } from "lucide-react"

import { FieldLockHint } from "@/components/admin/field-lock-hint"
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DML_TYPES, type Dataset, type Dmrl } from "@/lib/data/schema"
import {
  DML_TYPE_LABEL,
  DMRL_FORM_DEFAULTS,
  dmrlFormSchema,
  systemsWithoutDmrl,
  type DmrlFormInput,
  type DmrlFormValues,
  type DmrlRights,
} from "@/lib/rules/dmrls"

interface DmrlFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: Dataset
  /** Zu bearbeitende DMRL; null = neu anlegen */
  dmrl: Dmrl | null
  fieldBlocked: DmrlRights["fieldBlocked"] | null
  onSubmit: (values: DmrlFormInput) => boolean
}

/** Dialog „DMRL anlegen / bearbeiten" (PROJ-6) */
export function DmrlFormDialog({ open, onOpenChange, data, dmrl, fieldBlocked, onSubmit }: DmrlFormDialogProps) {
  const form = useForm<DmrlFormInput, unknown, DmrlFormValues>({
    resolver: zodResolver(dmrlFormSchema(data, dmrl?.id)),
    defaultValues: DMRL_FORM_DEFAULTS,
    mode: "onTouched",
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      dmrl
        ? {
            systemId: dmrl.systemId,
            originatorOrganisationId: dmrl.originatorOrganisationId,
            dmlType: dmrl.dmlType,
            security: dmrl.security,
          }
        : DMRL_FORM_DEFAULTS
    )
  }, [open, dmrl, form])

  // Beim Bearbeiten das eigene System anzeigen, beim Anlegen nur freie Systeme
  const systems = dmrl ? data.systems.filter((s) => s.id === dmrl.systemId) : systemsWithoutDmrl(data)
  const organisations = [...data.organisations].sort((a, b) => a.code.localeCompare(b.code))

  const submit = form.handleSubmit((values) => {
    if (onSubmit(values)) onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dmrl ? "DMRL bearbeiten" : "DMRL anlegen"}</DialogTitle>
          <DialogDescription>
            Eine DMRL gehört zu genau einem System und wird über dessen Bezeichnung angezeigt. Der Partner wird erst beim SEND gewählt.
          </DialogDescription>
        </DialogHeader>
        {organisations.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" aria-hidden />
            <AlertDescription>
              Es gibt noch keine Organisation.{" "}
              <Link href="/verwaltung/organisationen" className="text-primary underline-offset-4 hover:underline">
                Legen Sie zuerst eine Organisation an
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="systemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!dmrl}>
                    <FormControl>
                      <SelectTrigger aria-label="System">
                        <SelectValue placeholder="System wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {systems.map((system) => (
                        <SelectItem key={system.id} value={system.id}>
                          {system.name} · {system.modelic} · S1000D {system.s1000dIssue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {dmrl && fieldBlocked?.systemId ? (
                    <FieldLockHint reason={fieldBlocked.systemId} />
                  ) : (
                    <FormDescription>Nur Systeme, die noch keine DMRL haben.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="originatorOrganisationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Originator (Sender-Organisation)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!fieldBlocked?.originatorOrganisationId}>
                    <FormControl>
                      <SelectTrigger aria-label="Originator">
                        <SelectValue placeholder="Organisation wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organisations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.code} · {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldBlocked?.originatorOrganisationId && <FieldLockHint reason={fieldBlocked.originatorOrganisationId} />}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dmlType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DML-Typ</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!fieldBlocked?.dmlType}>
                      <FormControl>
                        <SelectTrigger aria-label="DML-Typ">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DML_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {DML_TYPE_LABEL[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldBlocked?.dmlType && <FieldLockHint reason={fieldBlocked.dmlType} />}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="security"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sicherheitseinstufung</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" maxLength={3} className="font-mono" autoComplete="off" />
                    </FormControl>
                    <FormDescription>Zwei Ziffern, 01–20. Unabhängig von den Einträgen.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button type="submit">Speichern</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
