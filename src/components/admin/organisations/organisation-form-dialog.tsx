"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock } from "lucide-react"

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
import type { Dataset, Organisation } from "@/lib/data/schema"
import {
  normalizeCage,
  ORG_NAME_MAX,
  organisationFormSchema,
  type OrganisationFormValues,
} from "@/lib/rules/organisations"

interface OrganisationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: Dataset
  /** Zu bearbeitende Organisation; null = neu anlegen */
  organisation: Organisation | null
  /** Begründung, falls der CAGE-Code gesperrt ist */
  codeBlocked: string | null
  onSubmit: (values: OrganisationFormValues) => boolean
}

/** Dialog „Organisation anlegen / bearbeiten" (PROJ-4) */
export function OrganisationFormDialog({
  open,
  onOpenChange,
  data,
  organisation,
  codeBlocked,
  onSubmit,
}: OrganisationFormDialogProps) {
  const form = useForm<OrganisationFormValues, unknown, OrganisationFormValues>({
    resolver: zodResolver(organisationFormSchema(data, organisation?.id)),
    defaultValues: { code: "", name: "" },
    mode: "onTouched",
  })

  useEffect(() => {
    if (open) form.reset({ code: organisation?.code ?? "", name: organisation?.name ?? "" })
  }, [open, organisation, form])

  const submit = form.handleSubmit((values) => {
    if (onSubmit(values)) onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{organisation ? "Organisation bearbeiten" : "Organisation anlegen"}</DialogTitle>
          <DialogDescription>
            Der CAGE-Code identifiziert die Organisation und erscheint im DML-Code als Absender („sendid“).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAGE-Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(event) => field.onChange(normalizeCage(event.target.value))}
                      disabled={!!codeBlocked}
                      autoComplete="off"
                      className="font-mono uppercase"
                      maxLength={10}
                      autoFocus={!codeBlocked}
                    />
                  </FormControl>
                  {codeBlocked ? (
                    <FormDescription className="flex items-center gap-1">
                      <Lock className="h-3 w-3" aria-hidden />
                      {codeBlocked}
                    </FormDescription>
                  ) : (
                    <FormDescription>Genau 5 Buchstaben oder Ziffern, z. B. C1234.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" maxLength={ORG_NAME_MAX + 20} autoFocus={!!codeBlocked} />
                  </FormControl>
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
