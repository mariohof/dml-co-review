"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { FieldLockHint } from "@/components/admin/field-lock-hint"
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
import { Textarea } from "@/components/ui/textarea"
import { S1000D_ISSUES, type Dataset, type DmrlSystem } from "@/lib/data/schema"
import {
  DESCRIPTION_MAX,
  normalizeModelic,
  SYSTEM_NAME_MAX,
  systemFormSchema,
  type SystemFormInput,
  type SystemFormValues,
  type SystemRights,
} from "@/lib/rules/systems"

interface SystemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: Dataset
  /** Zu bearbeitendes System; null = neu anlegen */
  system: DmrlSystem | null
  fieldBlocked: SystemRights["fieldBlocked"]
  onSubmit: (values: SystemFormInput) => boolean
}

/** Dialog „System anlegen / bearbeiten" (PROJ-5) */
export function SystemFormDialog({ open, onOpenChange, data, system, fieldBlocked, onSubmit }: SystemFormDialogProps) {
  const form = useForm<SystemFormInput, unknown, SystemFormValues>({
    resolver: zodResolver(systemFormSchema(data, system?.id)),
    defaultValues: { name: "", s1000dIssue: "", modelic: "", description: "" },
    mode: "onTouched",
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: system?.name ?? "",
        s1000dIssue: system?.s1000dIssue ?? "",
        modelic: system?.modelic ?? "",
        description: system?.description ?? "",
      })
    }
  }, [open, system, form])

  const descriptionLength = (useWatch({ control: form.control, name: "description" }) ?? "").length

  const submit = form.handleSubmit((values) => {
    if (onSubmit(values)) onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{system ? "System bearbeiten" : "System anlegen"}</DialogTitle>
          <DialogDescription>
            Die S1000D-Issue bestimmt das XML-Format der DMRL; der Model Ident Code steht im DML-Code.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bezeichnung</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!!fieldBlocked.name} autoComplete="off" maxLength={SYSTEM_NAME_MAX + 20} />
                  </FormControl>
                  {fieldBlocked.name && <FieldLockHint reason={fieldBlocked.name} />}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="s1000dIssue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>S1000D-Issue</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!fieldBlocked.s1000dIssue}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Issue wählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {S1000D_ISSUES.map((issue) => (
                          <SelectItem key={issue} value={issue}>
                            {issue}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldBlocked.s1000dIssue && <FieldLockHint reason={fieldBlocked.s1000dIssue} />}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="modelic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Ident Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(event) => field.onChange(normalizeModelic(event.target.value))}
                        disabled={!!fieldBlocked.modelic}
                        autoComplete="off"
                        className="font-mono uppercase"
                        maxLength={20}
                      />
                    </FormControl>
                    {fieldBlocked.modelic ? (
                      <FieldLockHint reason={fieldBlocked.modelic} />
                    ) : (
                      <FormDescription>2–14 Buchstaben/Ziffern</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschreibung (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} maxLength={DESCRIPTION_MAX + 50} />
                  </FormControl>
                  <FormDescription className={descriptionLength > DESCRIPTION_MAX ? "text-destructive" : undefined}>
                    {descriptionLength} / {DESCRIPTION_MAX} Zeichen
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
