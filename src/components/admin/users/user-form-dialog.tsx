"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ROLE_LABEL } from "@/lib/auth/permissions"
import { USER_ROLES, type Dataset, type User } from "@/lib/data/schema"
import { NAME_MAX, userFormSchema, type UserFormInput, type UserFormValues } from "@/lib/rules/users"

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: Dataset
  /** Zu bearbeitender Benutzer; null = neu anlegen */
  user: User | null
  onSubmit: (values: UserFormValues) => boolean
}

/** Dialog „Benutzer anlegen / bearbeiten" (PROJ-3) */
export function UserFormDialog({ open, onOpenChange, data, user, onSubmit }: UserFormDialogProps) {
  const form = useForm<UserFormInput, unknown, UserFormValues>({
    resolver: zodResolver(userFormSchema(data, user?.id)),
    defaultValues: { name: "", role: "" },
    mode: "onTouched",
  })

  useEffect(() => {
    if (open) form.reset({ name: user?.name ?? "", role: user?.role ?? "" })
  }, [open, user, form])

  const submit = form.handleSubmit((values) => {
    if (onSubmit(values)) onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Benutzer bearbeiten" : "Benutzer anlegen"}</DialogTitle>
          <DialogDescription>
            {user ? "Name und Rolle ändern." : "Neue Benutzer sind sofort aktiv und erscheinen in der Anmeldeliste."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" maxLength={NAME_MAX + 20} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rolle</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Rolle wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
