# PROJ-3: Benutzerverwaltung

## Status: In Progress
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-1 (Datenhaltung + Demo-Daten) — Benutzer werden im Datenbestand gespeichert
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — Zugriff nur für Administratoren, Wirkung auf Anmeldeliste

## Beschreibung
Der Administrator verwaltet im Bereich „Verwaltung → Benutzer" alle Benutzer des Prototyps: anlegen, Name und Rolle ändern, aktivieren und deaktivieren. Benutzer werden nie gelöscht, damit die Archiv-Historie (wer hat welchen SEND/REPLY ausgelöst) vollständig nachvollziehbar bleibt. Das Systemkonto „Administrator" ist vollständig geschützt.

## Datenfelder eines Benutzers
| Feld | Regel |
|------|-------|
| Name | Pflicht, 2–80 Zeichen, führende/abschließende Leerzeichen werden entfernt, eindeutig (ohne Unterscheidung Groß-/Kleinschreibung) |
| Rolle | Pflicht: Administrator oder Bearbeiter |
| Status | aktiv / inaktiv; neue Benutzer sind aktiv |
| Systemkonto | nur beim Konto „Administrator"; nicht über die Oberfläche setzbar |

Benutzer haben **keine Organisation**.

## Regeln für Deaktivieren
Ein Benutzer kann **nicht** deaktiviert werden, wenn
1. er das **Systemkonto** „Administrator" ist,
2. er der **aktuell angemeldete** Benutzer ist,
3. er eine **DMRL ausgecheckt** hat,
4. er den **letzten SEND** einer DMRL ausgelöst hat, die noch im Status **„gesendet"** ist (wartet auf REPLY).

Bei Regel 3 und 4 nennt die Meldung die betroffenen DMRLs.

## User Stories
- Als **Administrator** möchte ich neue Benutzer mit Name und Rolle anlegen, damit weitere Personen im Prototyp arbeiten können.
- Als **Administrator** möchte ich Name und Rolle eines Benutzers ändern, damit ich Tippfehler korrigieren und Zuständigkeiten anpassen kann.
- Als **Administrator** möchte ich Benutzer deaktivieren und wieder aktivieren, damit ausgeschiedene Personen nicht mehr arbeiten können, ihre Historie aber erhalten bleibt.
- Als **Administrator** möchte ich daran gehindert werden, Benutzer mit laufenden Vorgängen (Check-out, offener SEND) zu deaktivieren, damit kein Vorgang ohne Verantwortlichen bleibt.
- Als **Administrator** möchte ich alle Benutzer mit Rolle und Status in einer durchsuchbaren Liste sehen, damit ich den Überblick behalte.
- Als **Product Owner** möchte ich, dass das Systemkonto „Administrator" nicht verändert, deaktiviert oder gelöscht werden kann, damit der Zugang zur Verwaltung immer gesichert ist.

## Out of Scope
- Löschen von Benutzern — bewusst ausgeschlossen (Archiv-Nachvollziehbarkeit)
- Organisation, E-Mail, Kürzel oder weitere Benutzerfelder
- Passwörter / echte Anmeldung (PRD Non-Goal)
- Berechtigung von Benutzern für DMRLs → PROJ-17
- Aufheben von Sperren durch den Administrator → PROJ-9 / PROJ-10
- Änderungsprotokoll der Benutzerverwaltung (wer hat wann was geändert)
- Import/Export von Benutzerlisten

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein Administrator ist angemeldet, wenn er „Verwaltung → Benutzer" öffnet, dann erscheint die Benutzerverwaltung
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn er die Benutzerverwaltung direkt aufruft, dann erscheint „Keine Berechtigung" (PROJ-2)

### Liste
- [ ] Angenommen die Benutzerverwaltung ist geöffnet, wenn die Liste angezeigt wird, dann zeigt sie alle Benutzer (aktive und inaktive) mit Name, Rolle und Status, sortiert nach Name
- [ ] Angenommen die Liste wird angezeigt, wenn das Systemkonto „Administrator" erscheint, dann ist es mit dem Kennzeichen „Systemkonto" markiert
- [ ] Angenommen die Liste wird angezeigt, wenn ein Suchbegriff eingegeben wird, dann werden nur Benutzer angezeigt, deren Name den Begriff enthält (ohne Unterscheidung Groß-/Kleinschreibung)
- [ ] Angenommen ein Suchbegriff liefert keine Treffer, wenn die Liste angezeigt wird, dann erscheint „Keine Benutzer gefunden"

### Anlegen
- [ ] Angenommen die Benutzerverwaltung ist geöffnet, wenn „Benutzer anlegen" gewählt wird, dann öffnet sich ein Dialog mit den Feldern Name und Rolle
- [ ] Angenommen der Anlegen-Dialog ist ausgefüllt, wenn gespeichert wird, dann wird der Benutzer mit Status „aktiv" angelegt, erscheint in der Liste und in der Anmeldeliste
- [ ] Angenommen der Anlegen-Dialog ist geöffnet, wenn ohne Name oder ohne Rolle gespeichert wird, dann erscheint je Pflichtfeld eine Fehlermeldung und nichts wird gespeichert
- [ ] Angenommen ein Name ist kürzer als 2 oder länger als 80 Zeichen (nach Entfernen der Randleerzeichen), wenn gespeichert wird, dann erscheint eine Fehlermeldung zur Länge
- [ ] Angenommen ein Benutzer „Bea Bearbeiter" existiert, wenn ein neuer Benutzer „bea bearbeiter" angelegt werden soll, dann erscheint „Dieser Name ist bereits vergeben" und nichts wird gespeichert
- [ ] Angenommen der Anlegen-Dialog ist geöffnet, wenn „Abbrechen" gewählt wird, dann wird nichts gespeichert

### Bearbeiten
- [ ] Angenommen ein normaler Benutzer existiert, wenn „Bearbeiten" gewählt wird, dann können Name und Rolle geändert und gespeichert werden (gleiche Regeln wie beim Anlegen)
- [ ] Angenommen ein Bearbeiter wird zum Administrator gemacht, wenn er sich danach anmeldet, dann hat er die Administrator-Rechte (PROJ-2)
- [ ] Angenommen ein angemeldeter Administrator ändert seine eigene Rolle auf Bearbeiter, wenn gespeichert wird, dann gelten sofort die Bearbeiter-Rechte und er verliert den Zugriff auf die Verwaltung
- [ ] Angenommen das Systemkonto „Administrator" wird angezeigt, wenn „Bearbeiten" gewählt wird, dann sind Name und Rolle nicht änderbar (oder die Aktion ist nicht angeboten)

### Deaktivieren / Aktivieren
- [ ] Angenommen ein aktiver Benutzer ohne laufende Vorgänge, wenn „Deaktivieren" gewählt und bestätigt wird, dann ist er inaktiv und erscheint nicht mehr in der Anmeldeliste
- [ ] Angenommen der Deaktivieren-Dialog ist geöffnet, wenn „Abbrechen" gewählt wird, dann bleibt der Benutzer aktiv
- [ ] Angenommen ein inaktiver Benutzer, wenn „Aktivieren" gewählt und bestätigt wird, dann ist er aktiv und erscheint wieder in der Anmeldeliste
- [ ] Angenommen ein Benutzer ist inaktiv, wenn er reaktiviert wird, dann gelten seine bisherigen DMRL-Zuordnungen wieder
- [ ] Angenommen das Systemkonto „Administrator", wenn die Liste angezeigt wird, dann ist „Deaktivieren" nicht möglich
- [ ] Angenommen der angemeldete Benutzer betrachtet seinen eigenen Eintrag, wenn er „Deaktivieren" wählt, dann ist dies nicht möglich mit dem Hinweis „Sie können sich nicht selbst deaktivieren"
- [ ] Angenommen ein Benutzer hat eine DMRL ausgecheckt, wenn er deaktiviert werden soll, dann erscheint eine Meldung mit den betroffenen DMRLs und er bleibt aktiv
- [ ] Angenommen ein Benutzer hat den letzten SEND einer DMRL im Status „gesendet" ausgelöst, wenn er deaktiviert werden soll, dann erscheint eine Meldung mit der DMRL und dem Versionsindex (z. B. „wartet auf REPLY zu SEND 00002-2026") und er bleibt aktiv
- [ ] Angenommen die REPLY zu diesem SEND wurde importiert, wenn der Benutzer deaktiviert werden soll, dann ist die Deaktivierung möglich
- [ ] Angenommen ein Benutzer ist angemeldet, wenn er (z. B. in einem anderen Tab) deaktiviert wird, dann wird er beim nächsten Seitenaufruf abgemeldet und sieht „Ihr Benutzer ist nicht mehr aktiv" (PROJ-2)

### Kein Löschen
- [ ] Angenommen die Benutzerverwaltung ist geöffnet, wenn ein beliebiger Benutzer betrachtet wird, dann gibt es keine Möglichkeit, ihn zu löschen

## Edge Cases
- **Name nur aus Leerzeichen:** gilt als leer → Pflichtfeld-Fehler.
- **Umbenennen auf eigenen Namen in anderer Schreibweise** („Bea Bearbeiter" → „BEA Bearbeiter"): erlaubt, da derselbe Benutzer.
- **Name „Administrator" für einen neuen Benutzer:** abgelehnt, da bereits vom Systemkonto belegt (Eindeutigkeit).
- **Letzter aktiver Bearbeiter wird deaktiviert:** erlaubt; der Administrator hat ohnehin alle Bearbeiter-Rechte.
- **Inaktiver Benutzer ist noch DMRL zugeordnet:** Zuordnung bleibt gespeichert; in PROJ-17 kann er nicht neu berechtigt werden.
- **Archiv zeigt Stände eines inaktiven Benutzers:** Name wird weiterhin angezeigt (ggf. mit Vermerk „inaktiv").
- **Zwei Tabs, gleichzeitiges Bearbeiten:** letzter Speichervorgang gewinnt (Prototyp, PROJ-1).

## Technical Requirements (optional)
- Nur für Administratoren erreichbar (PROJ-2)
- Formularvalidierung mit sofortigen, deutschsprachigen Fehlermeldungen
- Responsiv: Tabelle auf kleinen Bildschirmen horizontal scrollbar oder als Liste

## Open Questions
- [x] Soll im Archiv bei inaktiven Benutzern ein Vermerk „inaktiv" erscheinen? → Ja, Name mit Vermerk „inaktiv" (PROJ-15, 2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Benutzer haben keine Organisation | Vorgabe Product Owner | 2026-11-12 |
| Felder: Name, Rolle, Status (aktiv/inaktiv) | Minimal für Prototyp; Status ermöglicht Ausscheiden ohne Datenverlust | 2026-11-12 |
| Name eindeutig (ohne Groß-/Kleinschreibung), 2–80 Zeichen | Anmeldeliste zeigt nur Name + Rolle → muss eindeutig sein (offene Frage aus PROJ-2) | 2026-11-12 |
| Kein Löschen, nur Deaktivieren | Archiv referenziert auslösende Benutzer; Nachvollziehbarkeit | 2026-11-12 |
| Inaktive Benutzer erscheinen nicht in der Anmeldeliste | Inaktiv = darf nicht arbeiten | 2026-11-12 |
| Deaktivieren gesperrt bei ausgecheckter DMRL oder offenem eigenem SEND | Vorgabe Product Owner — kein laufender Vorgang ohne Verantwortlichen | 2026-11-12 |
| „Offener SEND" = Benutzer hat den letzten SEND einer DMRL im Status „gesendet" ausgelöst | Präzisierung mit Product Owner | 2026-11-12 |
| Selbst-Deaktivierung verhindert | Schutz vor versehentlichem Aussperren | 2026-11-12 |
| Systemkonto: Name, Rolle und Status unveränderlich | Garantiert Zugang zur Verwaltung (PROJ-2) | 2026-11-12 |
| DMRL-Zuordnungen bleiben bei Deaktivierung erhalten | Reaktivierung ohne Neuzuordnung | 2026-11-12 |
| Nur Administratoren legen an und bearbeiten | Vorgabe Product Owner; Verwaltung ist Admin-Bereich (PROJ-2) | 2026-11-12 |
| Eigene Rollenänderung erlaubt (außer Systemkonto) | Systemkonto garantiert weiterhin Admin-Zugang | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Gemeinsames Verwaltungsmuster (Seitenrahmen, Tabelle, Formular-Dialog, Bestätigung mit Sperrgründen) für PROJ-3/4/5/6/17 | Einheitliche Bedienung, weniger Code | 2026-11-12 |
| Fachregeln (Prüfung, Sperrgründe) als eigene, oberflächenunabhängige Module | Testbar, wiederverwendbar (z. B. Sperrgründe in PROJ-17) | 2026-11-12 |
| Gleiche Zod-Prüfung im Formular und beim Speichern | Keine Abweichung zwischen UI und Datenbestand | 2026-11-12 |
| Anlegen/Bearbeiten im Dialog (shadcn Dialog + Form) | Wenige Felder, Liste bleibt sichtbar | 2026-11-12 |
| Sperrgründe bei jedem Öffnen neu ermittelt, „letzter SEND" ohne zurückgezogene SENDs | Immer aktueller Stand; konsistent mit PROJ-12 | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
### Überblick
Die Benutzerverwaltung ist die erste von fünf gleichartigen Verwaltungsseiten (PROJ-3, 4, 5, 6, 17). Sie legt dafür ein **gemeinsames Verwaltungsmuster** fest: Seitenrahmen, durchsuchbare Tabelle, Formular-Dialog, Bestätigungsdialog und Anzeige von Sperrgründen. Die fachlichen Regeln (Pflichtfelder, Eindeutigkeit, wann Deaktivieren gesperrt ist) liegen getrennt von der Oberfläche an einer Stelle und sind dadurch einzeln testbar. Kein Backend nötig — alles im Browser-Datenbestand (PROJ-1).

### A) Komponentenstruktur
```
Seite „Verwaltung → Benutzer" (/verwaltung/benutzer)
+-- Zugriffswächter „Administrator?" (PROJ-2)
+-- Verwaltungs-Seitenrahmen (gemeinsames Muster)
    +-- Titel „Benutzer" · Button „Benutzer anlegen"
    +-- Suchfeld (Name)
    +-- Tabelle (shadcn Table)
    |   +-- Spalten: Name · Rolle (Badge) · Status (Badge aktiv/inaktiv) · Aktionen
    |   +-- Kennzeichen „Systemkonto" am Administrator
    |   +-- Aktionen je Zeile: „Bearbeiten" · „Deaktivieren" / „Aktivieren"
    |   |   (beim Systemkonto nicht angeboten; gesperrte Aktion mit Tooltip-Begründung)
    |   +-- Leer-/Keine-Treffer-Hinweis „Keine Benutzer gefunden"
    +-- Formular-Dialog „Benutzer anlegen / bearbeiten" (shadcn Dialog + Form)
    |   +-- Name (Eingabefeld) · Rolle (Auswahl)
    |   +-- Fehlermeldungen je Feld · „Speichern" · „Abbrechen"
    +-- Bestätigungsdialog „Deaktivieren / Aktivieren" (shadcn AlertDialog)
        +-- bei Sperre: Meldung mit Grund und betroffenen DMRLs statt Bestätigung
```
Genutzte shadcn/ui-Bausteine (installiert): Table, Input, Select, Badge, Button, Dialog, Form, AlertDialog, Tooltip, Sonner.

### B) Datenmodell (in Klartext)
Keine Änderung am Datenbestand — Benutzer sind in PROJ-1 definiert: ID, Name, Rolle, aktiv ja/nein, Systemkonto ja/nein. Neue Benutzer erhalten eine neue eindeutige ID und sind aktiv.

### C) Fachregeln (eine Stelle, ohne Oberfläche)
- **Prüfung Name/Rolle:** Name nach Entfernen der Randleerzeichen 2–80 Zeichen, eindeutig ohne Groß-/Kleinschreibung (eigener Name ausgenommen), Rolle Pflicht. Dieselbe Prüfung gilt im Formular (sofortige Meldungen) und beim Speichern im Datenbestand.
- **Sperrgründe für Deaktivieren** — liefert eine Liste von Gründen:
  1. Systemkonto
  2. angemeldeter Benutzer selbst
  3. hat DMRL(s) ausgecheckt → Namen der DMRLs
  4. hat den letzten (nicht zurückgezogenen) SEND einer DMRL im Status *gesendet* ausgelöst → DMRL + Versionsindex
- **Schutz Systemkonto:** Name, Rolle und Status nicht änderbar — wird sowohl in der Oberfläche (Aktion nicht angeboten) als auch beim Speichern geprüft.

### D) Abläufe
- **Anlegen/Bearbeiten:** Dialog → Prüfung → eine atomare Speicherung → Liste und Anmeldeliste aktualisiert → Erfolgsmeldung.
- **Eigene Rolle ändern:** nach dem Speichern wertet die zentrale Rechte-Regel (PROJ-2) sofort neu aus → bei Verlust der Admin-Rolle Wechsel zum Dashboard mit Hinweis.
- **Deaktivieren:** Sperrgründe ermitteln → keine: Bestätigung → speichern; sonst Meldung mit Gründen, nichts gespeichert.
- **Aktivieren:** Bestätigung → speichern; Berechtigungen (PROJ-17) gelten wieder, da sie nie entfernt wurden.

### E) Gemeinsames Verwaltungsmuster (für PROJ-4, 5, 6, 17)
| Baustein | Zweck |
|---|---|
| Verwaltungs-Seitenrahmen | Titel, Haupt-Aktion, Suchfeld, einheitliche Abstände |
| Durchsuchbare Tabelle | Sortierung, Suche, Leer-/Keine-Treffer-Hinweis, Aktionen je Zeile |
| Formular-Dialog | Anlegen/Bearbeiten mit Feldprüfung (react-hook-form + Zod) |
| Bestätigungsdialog mit Sperrgründen | Einheitliche Darstellung „nicht möglich, weil …" |
| Fachregel-Module je Objekt | Prüfungen und Sperrgründe ohne Oberflächenbezug, testbar |

### F) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Gemeinsames Verwaltungsmuster | Fünf Verwaltungsseiten sehen gleich aus und verhalten sich gleich; weniger Aufwand, weniger Fehler. |
| Fachregeln getrennt von der Oberfläche | Regeln (z. B. Sperrgründe) sind einzeln testbar und werden später auch von anderen Features genutzt. |
| Eine Prüfung für Formular und Speicherung | Keine Lücke zwischen Anzeige und gespeicherten Daten. |
| react-hook-form + Zod für Formulare | Bereits im Projekt-Stack (CLAUDE.md); deutsche Fehlermeldungen je Feld. |
| Sperrgründe werden bei jedem Öffnen neu ermittelt | Immer aktueller Stand (z. B. nach REPLY-Import sofort deaktivierbar). |
| Dialoge statt eigener Seiten für Anlegen/Bearbeiten | Wenige Felder; Liste bleibt sichtbar. |

### G) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.** react-hook-form, Zod, shadcn/ui (inkl. Form, Dialog, AlertDialog, Table, Tooltip) sind installiert.

### H) Testbarkeit
- Unit-Tests der Fachregeln: Namensprüfung (Länge, Leerzeichen, Eindeutigkeit inkl. eigener Name), Sperrgründe 1–4 einzeln und kombiniert, Schutz Systemkonto.
- E2E: Anlegen mit Fehlern/erfolgreich, Bearbeiten, Deaktivieren gesperrt (Demo: Anna Bearbeitung hat letzten SEND PHUNGUN ausgelöst) und erfolgreich, Aktivieren, Bearbeiter ohne Zugriff.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-3`_

**Umgesetzt**
- `src/lib/rules/users.ts` — Fachregeln ohne Oberfläche: Namensprüfung (Randleerzeichen, 2–80 Zeichen, eindeutig ohne Groß-/Kleinschreibung, eigener Name ausgenommen), Rolle Pflicht, Sperrgründe für Deaktivieren (Systemkonto, man selbst, ausgecheckte DMRL, letzter nicht zurückgezogener SEND einer gesendeten DMRL), Schutz des Systemkontos; Speicherfunktionen prüfen erneut.
- **Gemeinsames Verwaltungsmuster** (`src/components/admin/`): `AdminPage` (Seitenrahmen), `SearchField`, `BlockedAction` (gesperrte Aktion mit Tooltip-Begründung, per Tastatur erreichbar), `ConfirmDialog` (Bestätigung oder „nicht möglich, weil …").
- `src/components/admin/users/` — `UserManagement` (Tabelle sortiert nach Name, Suche, Badges Rolle/Status/Systemkonto, Aktionen Bearbeiten/Deaktivieren/Aktivieren) und `UserFormDialog` (react-hook-form + Zod, deutsche Fehlermeldungen).
- Eigene Rolle auf Bearbeiter geändert → Wechsel zum Dashboard mit Hinweis.
- `src/lib/ids.ts` — Erzeugung eindeutiger IDs; `TooltipProvider` im geschützten Bereich.

**Tests**: `users.test.ts` (20), `user-management.test.tsx` (6) — insgesamt 89 Tests grün.

**Abweichungen / Hinweise**
- Systemkonto: „Bearbeiten" und „Deaktivieren" sind sichtbar, aber gesperrt (Tooltip-Begründung) — die Spec lässt „nicht änderbar oder nicht angeboten" offen.
- Selbst-Deaktivierung, ausgecheckte DMRL und offener SEND: Klick auf „Deaktivieren" zeigt den Dialog „Deaktivieren nicht möglich" mit allen Gründen.
- Browser-E2E-Tests stehen aus → `/qa`.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
