import { RequireAdministrator } from "@/components/auth/guards"

/** Verwaltungsbereich: nur Administratoren (PROJ-2) */
export default function VerwaltungLayout({ children }: { children: React.ReactNode }) {
  return <RequireAdministrator>{children}</RequireAdministrator>
}
