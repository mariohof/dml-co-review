# Product Requirements Document — DMRL Management System (Prototyp)

## Vision
Ein Prototyp zur zentralen Verwaltung von Datenmodul-Anforderungslisten (DMRL) für mehrere Systeme (Fahrzeuge, Fluggeräte, Schiffe, Geräte). Er bildet den Abstimmungsprozess mit externen Partnern nach S1000D (SEND/REPLY) inklusive Prüfungen und Freigabe vollständig ab — und ersetzt damit die heutige Excel-/E-Mail-Abstimmung, bei der unklar ist, welche Version gilt, Änderungen schwer nachvollziehbar sind und der Freigabestatus einzelner Datenmodule intransparent ist.

## Target Users
- **Administrator** — legt Systeme (mit S1000D-Issue 2.3, 4.2 oder 5.0), Organisationen, DMRLs, Benutzer und Berechtigungen an und verwaltet sie.
- **Bearbeiter (DMRL-Verantwortlicher)** — pflegt die DMRL, checkt sie als CSV aus und wieder ein, sendet sie als S1000D-XML (SEND), importiert die Partner-Antwort (REPLY), verfolgt und erteilt die Freigabe. Braucht Nachvollziehbarkeit aller Austauschstände.
- **Externer Partner** (kein Systembenutzer) — erhält die DMRL als S1000D-XML, bearbeitet sie und sendet sie als REPLY zurück.

## Kernabläufe
1. **Check-out/Check-in (CSV, Bearbeitung z. B. in Excel):** Auschecken sperrt die DMRL; beim Einchecken werden die Einträge nach fachlichen Regeln geprüft, erst danach übernommen und die Sperre aufgehoben.
2. **SEND:** Export als S1000D-DMRL-XML in der Issue-Version des Systems, mit XSD-Validierung (`dml.xsd`). Jeder SEND erzeugt einen neuen Versionsindex `NNNNN-JJJJ` (5-stellig, führende Nullen, z. B. `00001-2026`); im neuen Jahr beginnt der Zähler wieder bei `00001`.
3. **REPLY:** Import der Partner-XML mit XSD-Validierung und fachlicher Prüfung; jeder Eintrag erhält den Status *freigegeben* oder *zu überarbeiten*.
4. **Freigabe:** Eine DMRL ist nur freigegeben, wenn alle Einträge vom Partner freigegeben sind. Nicht freigegebene DMRLs dürfen nicht in einem Technische-Publikation-Projekt verwendet werden. Eine freigegebene DMRL ist nicht eingefroren — sie behält ihren Status, bis eine Änderung über Check-out/Check-in erfolgt.
5. **Archiv:** Alle SEND- und REPLY-Stände werden dauerhaft archiviert; der Bearbeiter kann den Austausch nachvollziehen und jederzeit auf jede im Workflow verwendete DMRL-Version zugreifen.

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Datenhaltung (JSON/localStorage) + Demo-Daten | Approved |
| P0 (MVP) | Simulierte Anmeldung & Rollenwechsel | Approved |
| P0 (MVP) | Benutzer-, Organisations-, System- und DMRL-Verwaltung, DMRL-Berechtigungen (Admin) | Approved (PROJ-3–6, PROJ-17) |
| P0 (MVP) | DMRL-Ansicht mit Einträgen & Status | Approved (PROJ-7) |
| P0 (MVP) | Fachliches Regelwerk | Approved (PROJ-8) |
| P0 (MVP) | Check-out/Check-in CSV mit Sperre | Approved (PROJ-9, PROJ-10) |
| P0 (MVP) | DMRL-Export CSV/XML (jederzeit, ohne Sperre) | Approved (PROJ-18) |
| P0 (MVP) | XSD-Validierung via xmllint (2.3 / 4.2 / 5.0) | Approved (PROJ-11) |
| P0 (MVP) | SEND-Export & REPLY-Import | Approved (PROJ-12, PROJ-13) |
| P0 (MVP) | Freigabestatus & Archiv | Approved (PROJ-14, PROJ-15) |
| P0 (MVP) | Lokaler Start (Python-Startskript) | In Review (PROJ-19) |
| P1 | Dashboard / Übersicht | Approved (PROJ-16) |

Details und Abhängigkeiten: siehe `features/INDEX.md`.

## Success Metrics
- Der Product Owner kann alle Workflows (Stammdatenpflege, Check-out/Check-in, SEND, REPLY, Freigabe, Archiv) inklusive aller Prüfungen an Demo-Systemen mit allen drei S1000D-Versionen (2.3, 4.2, 5.0) durchgängig demonstrieren.
- Fehlerhafte CSV- oder XML-Dateien werden von den Prüfungen zuverlässig erkannt und nicht übernommen.

## Constraints
- **No backend — localStorage only:** Datenhaltung und Benutzer werden über JSON-Strukturen in localStorage simuliert; keine echte Authentifizierung.
- **Betrieb:** vorerst nur lokal auf einem Rechner mit macOS, Windows 11 oder Linux (kein Cloud-Hosting/Vercel). Start über ein **Python-Startskript**, das Voraussetzungen (Node.js, xmllint) prüft, die App baut, lokal startet und den Browser öffnet; xmllint muss installiert sein.
- **XSD-Validierung:** Pflicht-Validierung gegen `dml.xsd` mit `xmllint` (MacOS/Windows/Linux). Da xmllint nicht im Browser läuft, wird dafür eine serverseitige Next.js-Funktion benötigt. Die Schemas für Issue 2.3, 4.2 und 5.0 werden vom Product Owner bereitgestellt.
- **S1000D-Version:** wird pro System festgelegt; alle drei Versionen sind im MVP enthalten.
- **Design system:** see `docs/design-system.md`
- UI-Sprache: Deutsch.
- Team: Product Owner + KI-gestützte Entwicklung; kein fester Termin.

## Non-Goals
- Kein echtes Backend, keine Datenbank, keine echte Anmeldung.
- Kein automatischer Versand an Partner (E-Mail/Schnittstellen) — Dateien werden manuell heruntergeladen/hochgeladen.
- Keine Erstellung von Datenmodul-Inhalten, keine Anbindung an CSDB oder TP-Projekte (Verwendungssperre nur als Status sichtbar).
- Keine Mehrsprachigkeit.
