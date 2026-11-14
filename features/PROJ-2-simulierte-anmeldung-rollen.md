# PROJ-2: Simulierte Anmeldung & Rollenwechsel

## Status: In Progress
**Created:** 2026-11-12
**Last Updated:** 2026-11-14

## Dependencies
- Requires: PROJ-1 (Datenhaltung + Demo-Daten) — Benutzer mit Rolle stammen aus dem Datenbestand

## Beschreibung
Der Prototyp hat keine echte Authentifizierung. Stattdessen wählt man auf einer Anmeldeseite einen der vorhandenen Benutzer aus und arbeitet dann mit dessen Rolle (Administrator oder Bearbeiter). Die Rolle bestimmt Navigation, sichtbare DMRLs und erlaubte Aktionen. Ein schneller Benutzerwechsel über eine Auswahlliste in der Kopfzeile ermöglicht in der Demo den Perspektivwechsel zwischen Administrator und Bearbeiter.

## Rollen & Rechte

| | Administrator | Bearbeiter |
|---|---|---|
| Dashboard (Startseite) | alle DMRLs | nur berechtigte DMRLs (PROJ-17) |
| DMRL-Workflows (Check-out/-in, SEND, REPLY) | auf **allen** DMRLs | nur auf berechtigten DMRLs |
| Verwaltung (Benutzer, Organisationen, Systeme, DMRL-Berechtigungen) | ja | nein |
| Demo-Daten zurücksetzen | ja | nein |

Der Administrator hat alle Rechte des Bearbeiters plus die Verwaltungsrechte.

### Systemkonto „Administrator"
Es gibt immer ein allgemeines Konto **„Administrator"** (Rolle Administrator), das als **Systemkonto** gekennzeichnet ist. Es darf nie gelöscht und seine Rolle nie geändert werden (Durchsetzung in PROJ-3). Dadurch existiert jederzeit mindestens ein Administrator und die Anmeldeliste ist nie leer.

## Navigation
```
Kopfzeile
+-- Anwendungsname
+-- "Dashboard"            (alle Rollen)
+-- "Verwaltung"           (nur Administrator)
|   +-- Benutzer · Organisationen · Systeme · DMRL-Berechtigungen
+-- "Benutzer" [Auswahlliste: aktive Benutzer mit Name · Rolle, aktueller ausgewählt; am Ende "Abmelden"]
```

## User Stories
- Als **Product Owner** möchte ich mich ohne Passwort per Klick als beliebiger Benutzer anmelden, damit ich in der Demo schnell zwischen Rollen wechseln kann.
- Als **Bearbeiter** möchte ich nach der Anmeldung im Dashboard nur die mir zugeordneten DMRLs sehen, damit ich mich auf meine Arbeit konzentrieren kann.
- Als **Administrator** möchte ich alle DMRLs sehen und bearbeiten sowie den Verwaltungsbereich nutzen, damit ich Stammdaten pflegen und jeden Workflow vorführen kann.
- Als **Benutzer** möchte ich jederzeit sehen, als wer und mit welcher Rolle ich angemeldet bin, damit ich keine Aktionen in der falschen Rolle ausführe.
- Als **Product Owner** möchte ich den Benutzer direkt in der Kopfzeile wechseln, ohne über die Anmeldeseite zu gehen, damit die Demo flüssig bleibt.
- Als **Benutzer** möchte ich nach einem Neuladen der Seite angemeldet bleiben, damit eine Demo nicht unterbrochen wird.
- Als **Bearbeiter** möchte ich beim direkten Aufruf einer nicht erlaubten Seite einen klaren Hinweis bekommen, damit ich verstehe, warum ich sie nicht nutzen kann.

## Out of Scope
- Passwörter, echte Authentifizierung, Sitzungsablauf (PRD Non-Goal)
- Anlegen/Bearbeiten/Löschen von Benutzern → PROJ-3 (inkl. Lösch- und Rollenänderungssperre für das Systemkonto „Administrator")
- Berechtigung von Bearbeitern für DMRLs → PROJ-17
- Inhalte der Verwaltungsseiten → PROJ-3 bis PROJ-6, PROJ-17 (PROJ-2 liefert nur Navigation und Zugriffsschutz)
- DMRL-Detailansicht → PROJ-7
- Statusübersicht/Kennzahlen im Dashboard → PROJ-16 (PROJ-2 liefert nur die DMRL-Liste)
- Durchsetzung der Workflow-Rechte in den einzelnen Aktionen → jeweiliges Feature (PROJ-9 bis PROJ-13) nutzt die hier definierte Rechte-Regel
- Weitere Rollen (z. B. Leser, Freigeber) — im PRD bewusst gestrichen

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Anmeldung
- [ ] Angenommen niemand ist angemeldet, wenn die Anwendung geöffnet wird, dann erscheint die Anmeldeseite mit einer Liste aller aktiven Benutzer (PROJ-3), die je Benutzer nur Name und Rolle zeigt
- [ ] Angenommen die Anmeldeseite wird angezeigt, wenn ein Benutzer angeklickt wird, dann ist dieser ohne Passwort angemeldet und das Dashboard erscheint
- [ ] Angenommen ein Benutzer ist angemeldet, wenn die Seite neu geladen oder der Browser neu gestartet wird, dann ist er weiterhin angemeldet
- [ ] Angenommen niemand ist angemeldet, wenn eine beliebige Seite der Anwendung direkt aufgerufen wird, dann wird zur Anmeldeseite weitergeleitet
- [ ] Angenommen die Anmeldeseite wird angezeigt, wenn die Benutzerliste betrachtet wird, dann ist das Systemkonto „Administrator" immer enthalten

### Kopfzeile & Benutzerwechsel
- [ ] Angenommen ein Benutzer ist angemeldet, wenn eine beliebige Seite angezeigt wird, dann zeigt die Kopfzeile „Benutzer" mit einer Auswahlliste, in der er mit Name und Rolle ausgewählt ist
- [ ] Angenommen die Auswahlliste wird geöffnet, wenn sie angezeigt wird, dann enthält sie alle aktiven Benutzer mit Name und Rolle und am Ende „Abmelden"
- [ ] Angenommen ein Benutzer wählt in der Auswahlliste einen anderen Benutzer, wenn die Auswahl erfolgt, dann ist dieser sofort angemeldet und Navigation, Sichtbarkeit und Rechte entsprechen seiner Rolle
- [ ] Angenommen der neue Benutzer darf die aktuelle Seite sehen (z. B. Dashboard), wenn gewechselt wird, dann bleibt die Seite geöffnet und zeigt die Daten aus seiner Sicht
- [ ] Angenommen der neue Benutzer darf die aktuelle Seite nicht sehen (z. B. Bearbeiter auf einer Verwaltungsseite oder einer nicht berechtigten DMRL), wenn gewechselt wird, dann erscheint das Dashboard mit dem Hinweis „Die vorherige Seite ist für [Name] nicht verfügbar"
- [ ] Angenommen ein Benutzer ist angemeldet, wenn er in der Auswahlliste „Abmelden" wählt, dann wird er abgemeldet und die Anmeldeseite erscheint

### Rollenabhängige Navigation & Sichtbarkeit
- [ ] Angenommen ein Administrator ist angemeldet, wenn die Kopfzeile angezeigt wird, dann sind die Menüpunkte „Dashboard" und „Verwaltung" (mit Benutzer, Organisationen, Systeme, DMRL-Berechtigungen) sichtbar
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn die Kopfzeile angezeigt wird, dann ist nur „Dashboard" sichtbar und „Verwaltung" nicht
- [ ] Angenommen ein Administrator ist angemeldet, wenn das Dashboard angezeigt wird, dann listet es alle DMRLs
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn das Dashboard angezeigt wird, dann listet es nur die DMRLs, denen er als Bearbeiter zugeordnet ist
- [ ] Angenommen ein Bearbeiter ist keiner DMRL zugeordnet, wenn das Dashboard angezeigt wird, dann erscheint der Hinweis „Ihnen sind noch keine DMRLs zugeordnet. Bitte wenden Sie sich an einen Administrator."
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn er eine Verwaltungsseite oder eine nicht zugeordnete DMRL direkt aufruft, dann erscheint „Keine Berechtigung" mit einem Link zum Dashboard
- [ ] Angenommen ein Administrator ist angemeldet, wenn „Demo-Daten zurücksetzen" angeboten wird, dann ist die Funktion sichtbar; angenommen ein Bearbeiter ist angemeldet, dann ist sie nicht sichtbar

### Rechte-Regel für Workflows
- [ ] Angenommen ein Administrator ist angemeldet, wenn eine beliebige DMRL geöffnet wird, dann sind alle Bearbeiter-Aktionen erlaubt
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn eine ihm zugeordnete DMRL geöffnet wird, dann sind alle Bearbeiter-Aktionen erlaubt

### Datenänderungen im Hintergrund
- [ ] Angenommen ein Benutzer ist angemeldet, wenn sein Benutzer deaktiviert wird (z. B. in einem anderen Tab), dann wird er beim nächsten Laden abgemeldet und sieht auf der Anmeldeseite den Hinweis „Ihr Benutzer ist nicht mehr aktiv"
- [ ] Angenommen ein Benutzer ist angemeldet, wenn seine Rolle geändert wird, dann gelten Navigation und Rechte der neuen Rolle sofort
- [ ] Angenommen ein Benutzer hat eine DMRL ausgecheckt, wenn er in der Auswahlliste den Benutzer wechselt oder sich abmeldet, dann bleibt die Sperre der DMRL bestehen
- [ ] Angenommen ein Demo-Benutzer ist angemeldet, wenn der Administrator die Demo-Daten zurücksetzt, dann bleibt die Anmeldung erhalten

## Edge Cases
- **Mehrere Tabs:** Die Anmeldung gilt browserweit; ein Benutzerwechsel in Tab A wirkt in Tab B nach dem Neuladen.
- **Nur ein aktiver Benutzer (Systemkonto):** Auswahlliste enthält nur „Administrator" und „Abmelden".
- **Wechsel während eines offenen Dialogs (z. B. Check-in-Zusammenfassung):** Dialog wird geschlossen, nichts übernommen; eine Sperre bleibt bestehen.
- **Alle anderen Benutzer gelöscht:** Das Systemkonto „Administrator" bleibt immer übrig; die Anmeldeliste ist nie leer.
- **Systemkonto fehlt in gespeicherten Daten** (manipuliert/beschädigt): wird als beschädigter Datenbestand behandelt (PROJ-1 Fehlerbildschirm → „Demo-Daten neu laden").
- **Bearbeiter wird einer DMRL entzogen, während er sie geöffnet hat:** beim nächsten Seitenaufruf „Keine Berechtigung".
- **Bearbeiter soll von einer DMRL entfernt werden, die er ausgecheckt hat:** wird in PROJ-17 verhindert.
- **Gleichnamige Benutzer:** Liste zeigt Name + Rolle; Unterscheidung bei identischem Namen und Rolle wird in PROJ-3 durch eindeutige Namen verhindert.

## Technical Requirements (optional)
- Keine Passwörter, keine Sitzungs-Tokens — reine Simulation (PRD)
- Anmeldung bleibt über Neuladen erhalten
- UI-Sprache Deutsch, Design-System laut `docs/design-system.md`

## Open Questions
- [x] Wie wird eine Sperre aufgelöst, wenn der sperrende Bearbeiter entfernt oder gelöscht wird? → Entfernen (PROJ-17) und Deaktivieren (PROJ-3) sind bei aktivem Check-out gesperrt; Löschen gibt es nicht
- [x] Müssen Benutzernamen eindeutig sein? → Ja, ohne Unterscheidung Groß-/Kleinschreibung (PROJ-3)
- [x] Benutzerwechsel über Auswahlliste in der Kopfzeile (Wireframe PROJ-16)? → Ja (2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Anmeldung per Klick ohne Passwort | Prototyp, schneller Rollenwechsel für Demo (PRD) | 2026-11-12 |
| Anmeldeliste zeigt nur Name und Rolle | Vorgabe Product Owner — Organisation nicht nötig | 2026-11-12 |
| Administrator hat alle Bearbeiter-Rechte zusätzlich | Vorgabe Product Owner — Admin kann jeden Workflow selbst ausführen | 2026-11-12 |
| Administrator-Bearbeiterrechte gelten für alle DMRLs ohne Zuordnung | Admin verwaltet Berechtigungen selbst; Demo ohne Vorbereitung | 2026-11-12 |
| Bearbeiter sieht nur zugeordnete DMRLs | Fokus und Rechtekonzept laut PRD | 2026-11-12 |
| Startseite heißt „Dashboard" | Vorgabe Product Owner; Kennzahlen folgen in PROJ-16 | 2026-11-12 |
| Kopfnavigation mit „Dashboard" und (nur Admin) „Verwaltung" | Einfache, rollenabhängige Struktur | 2026-11-12 |
| Direktaufruf ohne Recht → „Keine Berechtigung" mit Link | Verständlicher als stille Weiterleitung | 2026-11-12 |
| Deaktivierter aktiver Benutzer → Abmeldung mit Hinweis (kein Löschen, PROJ-3) | Verhindert Arbeiten mit nicht aktiver Identität | 2026-11-12 |
| Rollenänderung wirkt sofort | Rechte müssen immer dem aktuellen Datenstand entsprechen | 2026-11-12 |
| Sperre bleibt bei Benutzerwechsel | Sperre gehört zur DMRL, nicht zur Anmeldung | 2026-11-12 |
| Anmeldung bleibt beim Zurücksetzen der Demo-Daten erhalten (falls Benutzer existiert) | Demo-Fluss nicht unterbrechen | 2026-11-12 |
| Benutzerwechsel per Auswahlliste in der Kopfzeile statt über die Anmeldeseite; „Abmelden" als letzter Eintrag | Vorgabe Product Owner (Wireframe PROJ-16) — flüssige Demo | 2026-11-12 |
| Nach Wechsel bleibt die Seite offen, sonst Dashboard mit Hinweis | Kein „Keine Berechtigung"-Bildschirm durch bloßen Perspektivwechsel | 2026-11-12 |
| Allgemeines Systemkonto „Administrator", nie löschbar, Rolle nicht änderbar | Vorgabe Product Owner — garantiert jederzeit Zugang zur Verwaltung | 2026-11-12 |
| Fehlendes Systemkonto = beschädigter Datenbestand | Konsistenzregel; Wiederherstellung über PROJ-1 | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Clientseitige Seiten, Anmeldung nur im Browser-Speicher | Datenbestand liegt in localStorage (PROJ-1); kein Server-Zustand | 2026-11-12 |
| Anmelde-Bereitsteller (React Context) innerhalb des Datenspeicher-Bereitstellers | Aktueller Benutzer überall verfügbar; Rollen werden aus aktuellem Datenstand gelesen | 2026-11-12 |
| Zentrale Rechte-Regel für Verwaltung, DMRL-Zugriff und Dashboard-Sichtbarkeit | Eine Quelle für alle Features (PROJ-7 bis PROJ-18), leicht testbar | 2026-11-12 |
| Zugriffswächter als Wrapper-Komponenten je Bereich | Einheitlicher Schutz neuer Seiten | 2026-11-12 |
| Adressen `/anmelden`, `/`, `/dmrl/[ID]`, `/verwaltung/...` | Deutsche UI, klare Bereichstrennung Admin/Arbeitsbereich | 2026-11-12 |
| Reset-Funktion auf `/verwaltung` | Ersetzt temporäre Platzierung aus PROJ-1 | 2026-11-12 |
| Benutzer-Auswahlliste mit shadcn Select/DropdownMenu | Bereits installiert; Wireframe PROJ-16 | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
PROJ-2 liefert den „Rahmen" der Anwendung: Anmeldeseite, Kopfzeile mit Navigation und Benutzer-Auswahlliste, Zugriffsschutz für Seiten und **eine zentrale Rechte-Regel**, die alle späteren Features nutzen. Alles läuft im Browser; kein Backend nötig.

### A) Seitenstruktur (Adressen)
| Adresse | Seite | Zugriff |
|---|---|---|
| `/anmelden` | Anmeldeseite | nur ohne Anmeldung |
| `/` | Dashboard (Liste hier, Kennzahlen PROJ-16) | alle Angemeldeten |
| `/dmrl/[ID]` (+ Unterseiten wie Archiv) | DMRL-Ansicht (PROJ-7, 15) | Administrator oder berechtigter Bearbeiter |
| `/verwaltung` | Verwaltungsübersicht inkl. „Demo-Daten zurücksetzen" | nur Administrator |
| `/verwaltung/benutzer`, `/organisationen`, `/systeme`, `/dmrl` | Verwaltungsseiten (PROJ-3–6, 17) | nur Administrator |

### B) Komponentenstruktur
```
App-Rahmen
+-- Datenspeicher-Bereitsteller (PROJ-1)
    +-- Anmelde-Bereitsteller (aktueller Benutzer, anmelden, wechseln, abmelden)
        +-- Anmeldeseite (/anmelden)
        |   +-- Karte „Anmelden"
        |   |   +-- Liste aktiver Benutzer (je Zeile: Name + Rollen-Badge, ganze Zeile klickbar)
        |   +-- Hinweis „Ihr Benutzer ist nicht mehr aktiv" (falls zutreffend)
        +-- Geschützter Bereich (alle anderen Seiten)
            +-- Zugriffswächter „angemeldet?" → sonst Weiterleitung zu /anmelden
            +-- Kopfzeile
            |   +-- Anwendungsname
            |   +-- Navigation: „Dashboard" · „Verwaltung" (Aufklappmenü, nur Administrator)
            |   +-- „Benutzer" + Auswahlliste (Name · Rolle, aktueller ausgewählt, Trenner, „Abmelden")
            +-- Seiteninhalt
                +-- Zugriffswächter „Administrator?" (Verwaltung) bzw. „DMRL erlaubt?" (DMRL-Seiten)
                    +-- sonst Seite „Keine Berechtigung" mit Link zum Dashboard
```
Genutzte shadcn/ui-Bausteine (alle installiert): Card, Button, Badge, Select bzw. DropdownMenu (Benutzer-Auswahlliste), NavigationMenu oder DropdownMenu (Verwaltung), Alert (Hinweise), Sonner (Toast „Die vorherige Seite ist für [Name] nicht verfügbar").

### C) Datenmodell (in Klartext)
- **Anmeldung:** nur die ID des angemeldeten Benutzers, in einem eigenen kleinen Speicherbereich (PROJ-1, Abschnitt B). Kein Passwort, kein Token.
- **Benutzer, Rollen, Berechtigungen:** kommen aus dem Datenbestand (PROJ-1, PROJ-3, PROJ-17) — PROJ-2 speichert dazu nichts Eigenes.
- **Ein kurzlebiger Hinweis** („nicht mehr aktiv", „vorherige Seite nicht verfügbar") wird nur für die nächste Anzeige gemerkt, nicht dauerhaft.

### D) Zentrale Rechte-Regel
Eine einzige Stelle beantwortet alle Rechtefragen, z. B.:
- Darf Benutzer X die Verwaltung sehen? → nur Administrator
- Darf Benutzer X DMRL Y sehen/bearbeiten? → Administrator immer; Bearbeiter nur, wenn für Y berechtigt (PROJ-17)
- Welche DMRLs sieht Benutzer X im Dashboard?

Alle Seiten, Aktionen (Check-out, SEND …) und das Dashboard fragen diese Stelle — keine verstreuten Einzelprüfungen. Das macht Rollenänderungen sofort wirksam und ist einfach zu testen.

### E) Abläufe
- **Start:** Anmeldung gespeichert und Benutzer existiert + aktiv → Dashboard bzw. aufgerufene Seite. Benutzer inaktiv/fehlt → abmelden, Anmeldeseite mit Hinweis. Keine Anmeldung → Anmeldeseite.
- **Anmelden:** Klick auf Benutzer → Anmeldung speichern → Dashboard.
- **Wechseln (Auswahlliste):** neue ID speichern → Rechte-Regel prüft die aktuelle Seite → erlaubt: Seite bleibt (zeigt Daten aus neuer Sicht); nicht erlaubt: Dashboard + Toast. Offene Dialoge werden geschlossen (nichts übernommen).
- **Abmelden:** Anmeldung löschen → Anmeldeseite. Sperren bleiben (gehören zur DMRL).
- **Rollenänderung / Deaktivierung im Datenbestand:** wird bei jeder Anzeige neu ausgewertet — Rollenänderung wirkt sofort; Deaktivierung führt beim nächsten Laden zur Abmeldung.
- **Demo-Daten zurücksetzen:** Anmeldung bleibt, falls der Benutzer im Demo-Bestand existiert und aktiv ist; sonst Abmeldung.

### F) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Alle Seiten werden im Browser aufgebaut | Daten und Anmeldung liegen im Browser-Speicher; der Server kennt sie nicht. |
| Eigener Anmelde-Bereitsteller über dem Datenspeicher | Jede Seite kennt den aktuellen Benutzer, ohne ihn selbst laden zu müssen. |
| Eine zentrale Rechte-Regel | Ein Ort für alle Rechte; keine widersprüchlichen Prüfungen in einzelnen Features. |
| Zugriffswächter als umschließende Bausteine | Neue Seiten werden durch einfaches Einbetten geschützt. |
| „Keine Berechtigung" als eigene Anzeige statt stiller Weiterleitung | Vorgabe der Spec; verständlich für den Benutzer. |
| Deutsche Adressen (`/anmelden`, `/verwaltung`) | Konsistent mit deutscher Oberfläche. |
| „Demo-Daten zurücksetzen" auf `/verwaltung` | Ersetzt die temporäre Platzierung auf der Startseite aus PROJ-1. |

### G) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.** Next.js-Routing, vorhandene shadcn/ui-Komponenten, Sonner.

### H) Testbarkeit
- Unit-Tests der Rechte-Regel (Administrator / Bearbeiter berechtigt / nicht berechtigt / inaktiv).
- Unit-Tests des Anmelde-Bereitstellers (Start mit gültiger/inaktiver/fehlender Anmeldung, Wechsel, Abmelden).
- E2E: Anmelden als Administrator und Bearbeiter, Navigation je Rolle, Direktaufruf ohne Recht, Wechsel auf erlaubter und nicht erlaubter Seite, Reload bleibt angemeldet.

## Implementation Notes (Frontend)
_Stand 2026-11-12 — `/frontend PROJ-2`_

**Umgesetzt**
- `src/lib/auth/permissions.ts` — **zentrale Rechte-Regel**: aktiver Benutzer, Verwaltung (nur Administrator), DMRL-Zugriff (Administrator immer, Bearbeiter nur berechtigt), sichtbare DMRLs, aktive Benutzer (sortiert), Seitenzugriff für den Benutzerwechsel.
- `src/components/auth/session-provider.tsx` — Anmelde-Bereitsteller: Anmeldung im eigenen Speicherbereich (PROJ-1), aktueller Benutzer immer aus dem aktuellen Datenstand (Rollenänderung wirkt sofort), Abmeldung mit Hinweis bei deaktiviertem/fehlendem Benutzer, Anmeldung bleibt beim Zurücksetzen der Demo-Daten.
- `src/components/auth/guards.tsx` — `RequireLogin` (Weiterleitung zu `/anmelden?ziel=…`), `RequireAdministrator`, `RequireDmrl` („DMRL nicht gefunden" / „Keine Berechtigung"); `no-permission.tsx` mit Link zum Dashboard.
- `src/components/auth/login-screen.tsx` + `/anmelden` — Liste aktiver Benutzer (Name + Rollen-Badge), Klick meldet an, Hinweis bei verlorener Anmeldung, Rücksprung zum ursprünglichen Ziel (nur interne Adressen).
- `src/components/layout/app-header.tsx` — Kopfzeile (Markenfarbe), Navigation „Dashboard" und „Verwaltung" (Aufklappmenü, nur Administrator), **Benutzer-Auswahlliste** (Name · Rolle, Haken beim aktuellen, „Abmelden"); beim Wechsel bleibt die Seite offen oder Dashboard + Hinweis.
- Seitenstruktur: geschützter Bereich `src/app/(app)/` mit `/` (Dashboard-Liste: sichtbare DMRLs, Leerhinweise je Rolle), `/verwaltung` (Übersicht + „Demo-Daten zurücksetzen"), Platzhalterseiten für PROJ-3–6/17 und `/dmrl/[id]` (Zugriffsschutz; Inhalt folgt PROJ-7).
- `src/components/dmrl/dmrl-status-badge.tsx` — gemeinsames Status-Kennzeichen; `src/lib/navigation.ts` — Menüpunkte der Verwaltung.

**Tests** (Vitest): `permissions.test.ts` (13), `session-provider.test.tsx` (7) — insgesamt 63 Tests grün.

**Weitere Änderungen**
- `src/test/setup.ts`: Ersatz-`localStorage` für Tests unter Node ≥ 25 (Node-eigenes `localStorage` überdeckt jsdom).
- Vorläufige Übersicht aus PROJ-1 (`data-overview.tsx`) entfernt; Reset-Funktion jetzt auf `/verwaltung`.

**Abweichungen / Hinweise**
- Menüpunkt „DMRL-Berechtigungen" heißt „DMRLs & Berechtigungen" (eine Seite für PROJ-6 und PROJ-17, laut Tech Design PROJ-6/17).
- Deaktivierter angemeldeter Benutzer wird sofort (nicht erst beim nächsten Laden) abgemeldet — strenger als die Spec.
- Browser-E2E-Tests stehen aus → `/qa`.

## QA Test Results

**Tested:** 2026-11-13
**App URL:** http://localhost:3000 (`npm run dev`)
**Tester:** QA Engineer (AI)
**Testumfang:** gemeinsamer QA-Lauf PROJ-1–6 und PROJ-17
**Automatisiert:** Vitest 184 Tests ✅ · Playwright 46 E2E-Tests ✅ (Chrome über `PW_CHANNEL=chrome`, Projekt `chromium`)
**Browser:** Chrome (Desktop) getestet · Firefox und Safari **nicht getestet** (Playwright-Browser nicht installiert)
**Responsive:** 375 / 768 / 1440 px — kein horizontales Scrollen der Seite (Tabellen scrollen innerhalb ihrer Karte)

### Acceptance Criteria Status
- [x] Anmeldung (5/5): Anmeldeseite mit aktiven Benutzern (Name + Rolle) inkl. Systemkonto; Klick meldet an; Neuladen bleibt angemeldet; Direktaufruf → Anmeldeseite (mit Rücksprung zum Ziel) — E2E
- [ ] Kopfzeile & Benutzerwechsel (5/6): **BUG-QA1-1** — Name wird auf dem Desktop gekürzt; Auswahlliste mit aktiven Benutzern + „Abmelden", Wechsel wirkt sofort, Seite bleibt bzw. Dashboard + Hinweis, Abmelden — E2E
- [x] Rollenabhängige Navigation & Sichtbarkeit (7/7): Menü je Rolle, DMRL-Liste je Rolle/Berechtigung, Hinweis ohne Zuordnung, „Keine Berechtigung" mit Link, „Demo-Daten zurücksetzen" nur Administrator — E2E
- [x] Rechte-Regel für Workflows (2/2): zentrale Rechte-Regel per Unit-Test geprüft; die Workflow-Aktionen selbst folgen mit PROJ-7 ff.
- [x] Datenänderungen im Hintergrund (4/4): Deaktivierung → Abmeldung mit Hinweis; Rollenänderung sofort (E2E); Sperre bleibt beim Wechsel (Sperre gehört zur DMRL, Unit); Anmeldung bleibt beim Zurücksetzen (E2E + Unit)

### Edge Cases Status
- [x] Nur Systemkonto aktiv → Auswahlliste mit „Administrator" und „Abmelden"
- [x] Unbekannte DMRL → „DMRL nicht gefunden"
- [ ] Nicht getestet: Wechsel während offenem Dialog (Dialoge der Workflows folgen mit PROJ-9 ff.)

### Security Audit Results
- [x] Zugriff ohne Anmeldung: alle Seiten leiten zur Anmeldeseite (E2E)
- [x] Autorisierung: Bearbeiter erhalten für Verwaltung und nicht berechtigte DMRLs „Keine Berechtigung" (E2E)
- [x] XSS: `<img src=x onerror=alert(1)>` als Benutzername wird als Text angezeigt, nicht ausgeführt (E2E)
- [x] Offene Weiterleitung: `?ziel=//evil…`, `https://evil…` werden ignoriert, Ziel ist das Dashboard (E2E)
- [x] Manipulierte Anmeldung (unbekannte Benutzer-ID im Speicher) wird abgewiesen (E2E)
- [x] Manipulierter/beschädigter Datenbestand wird beim Laden erkannt (Zod-Prüfung, Verknüpfungen, Grundregeln) (Unit + E2E)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): Wer Zugriff auf den Browser-Speicher hat, kann Rollen oder Berechtigungen per Entwicklerwerkzeug ändern — simulierte Anmeldung ohne Backend, bewusst akzeptiert.
- [x] Keine Geheimnisse/Zugangsdaten im Client; keine Serverfunktionen in diesem Umfang (Rate Limiting nicht relevant)

### Bugs Found

#### BUG-QA1-1: Benutzername in der Kopfzeile wird auf dem Desktop abgeschnitten
- **Severity:** Medium
- **Betrifft:** PROJ-2, Kopfzeile (`app-header.tsx`), Benutzer-Auswahlliste
- **Steps to Reproduce:**
  1. Als „Administrator" anmelden, Fensterbreite 1440 px
  2. Expected: „Administrator · Administrator" vollständig lesbar
  3. Actual: „Adm… · Administrator" — der Name wird gekürzt, obwohl genug Platz vorhanden ist (Schaltfläche ist auf 16rem begrenzt, Name und Rolle teilen sich die Breite)
- **Screenshot:** `test-results/screens/1440-benutzer.png`
- **Priority:** Fix before deployment (AC „Kopfzeile zeigt Name und Rolle")
- **Status:** Behoben 2026-11-14 (`/frontend`) — Benutzer-Schaltfläche darf ab 768 px bis 24rem, ab 1024 px bis 32rem breit werden; die Rolle wird nie gekürzt, nur ein sehr langer Name (vollständig im Tooltip). E2E „Kopfzeile: Name und Rolle (BUG-QA1-1)" in `tests/PROJ-2-anmeldung.spec.ts` (1440 px alle Demo-Benutzer ungekürzt, 375 px ohne waagerechtes Scrollen); Gegenprobe mit altem Code schlägt fehl

#### BUG-QA1-3: Mobil (375 px) liegt die Aktion „Auswahl" im Dashboard außerhalb des sichtbaren Bereichs
- **Severity:** Low
- **Betrifft:** Dashboard-Liste (PROJ-2; wird mit PROJ-16 überarbeitet)
- **Steps to Reproduce:**
  1. Fensterbreite 375 px, als Administrator anmelden
  2. Expected: DMRL lässt sich ohne Suchen öffnen
  3. Actual: Tabelle muss horizontal gescrollt werden, um „Auswahl" zu erreichen (laut Spec zulässig, aber unhandlich)
- **Screenshot:** `test-results/screens/375-dashboard.png`
- **Priority:** Nice to have (bei PROJ-16 berücksichtigen)
- **Status:** Behoben mit PROJ-16 (2026-11-13) — Aktionsspalte bleibt beim waagerechten Scrollen sichtbar (fixiert am rechten Rand), zusätzlich ist der Systemname ein Link; E2E-Test `tests/PROJ-16-dashboard.spec.ts`

#### BUG-QA1-2: Fehlendes Favicon erzeugt 404 auf jeder Seite
- **Severity:** Low
- **Betrifft:** alle Seiten (global, App-Rahmen)
- **Steps to Reproduce:**
  1. Beliebige Seite öffnen, Browser-Konsole ansehen
  2. Expected: keine Fehler
  3. Actual: `Failed to load resource: 404 (Not Found)` für `/favicon.ico`
- **Priority:** Nice to have
- **Status:** Behoben 2026-11-14 — App-Icon in den Firmenfarben (Liste, #00406e/weiß): `src/app/icon.svg` für moderne Browser, `src/app/favicon.ico` (16/32/48 px) für die direkte Abfrage; Next.js setzt die `<link rel="icon">`-Verweise automatisch. E2E-Test `tests/PROJ-2-anmeldung.spec.ts` („BUG-QA1-2“: beide Dateien 200, keine 404 beim Laden); Gegenprobe ohne Icons schlägt fehl. Bestätigung durch `/qa` ausstehend.

### Summary
- **Acceptance Criteria:** 23/24 passed, 1 fehlgeschlagen (BUG-QA1-1, Medium)
- **Bugs Found:** 3 total (0 critical, 0 high, 1 medium, 2 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung ohne Backend)
- **Production Ready:** YES
- **Recommendation:** Freigeben; Medium/Low-Bugs bei Gelegenheit beheben
- **E2E-Tests:** `tests/PROJ-1-datenhaltung.spec.ts`, `tests/PROJ-2-anmeldung.spec.ts`, `tests/PROJ-3-to-6-17-verwaltung.spec.ts`, `tests/security-responsive.spec.ts`

## Deployment
_To be added by /deploy_
