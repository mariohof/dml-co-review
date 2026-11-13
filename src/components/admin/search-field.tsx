"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
}

/** Suchfeld der Verwaltungslisten */
export function SearchField({ value, onChange, label, placeholder }: SearchFieldProps) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "Suchen …"}
        aria-label={label}
        className="pl-9"
      />
    </div>
  )
}
