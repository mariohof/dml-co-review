/** Menüpunkte der Verwaltung (PROJ-2) — gemeinsam für Kopfzeile und Verwaltungsübersicht */
export const ADMIN_LINKS = [
  { href: "/verwaltung/benutzer", label: "Benutzer", description: "Benutzer anlegen, bearbeiten, aktivieren und deaktivieren" },
  { href: "/verwaltung/organisationen", label: "Organisationen", description: "Organisationen mit CAGE-Code verwalten" },
  { href: "/verwaltung/systeme", label: "Systeme", description: "Systeme mit S1000D-Issue und Model Ident Code verwalten" },
  { href: "/verwaltung/dmrl", label: "DMRLs & Berechtigungen", description: "DMRLs anlegen und Bearbeiter berechtigen" },
] as const
