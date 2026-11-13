# Feature Index

> Central tracking for all features. Updated by skills automatically.

## Status Legend
- **Roadmap** - `/init` done, feature identified in feature map, no spec file yet
- **Planned** - `/write-spec` done, full spec written, architecture not yet designed
- **Architected** - `/architecture` done, tech design approved, ready to build
- **In Progress** - `/frontend` or `/backend` active or completed, not yet in QA
- **In Review** - `/qa` active, testing in progress
- **Approved** - `/qa` passed, no critical/high bugs, ready to deploy
- **Deployed** - `/deploy` done, live in production

## Features

| ID | Feature | Status | Spec | Created |
|----|---------|--------|------|---------|
| PROJ-1 | Datenhaltung (JSON/localStorage) + Demo-Daten — Persistenzschicht und Beispieldaten (Systeme in 2.3/4.2/5.0) · P0 · Deps: None | Approved | [PROJ-1](PROJ-1-datenhaltung-demo-daten.md) | 2026-11-11 |
| PROJ-2 | Simulierte Anmeldung & Rollenwechsel — Benutzerauswahl, Rollen Administrator/Bearbeiter · P0 · Deps: PROJ-1 | Approved | [PROJ-2](PROJ-2-simulierte-anmeldung-rollen.md) | 2026-11-11 |
| PROJ-3 | Benutzerverwaltung — Admin legt Benutzer an und bearbeitet sie · P0 · Deps: PROJ-2 | Approved | [PROJ-3](PROJ-3-benutzerverwaltung.md) | 2026-11-11 |
| PROJ-4 | Organisationsverwaltung — Admin verwaltet Organisationen (CAGE-Code, Name) · P0 · Deps: PROJ-2 | Approved | [PROJ-4](PROJ-4-organisationsverwaltung.md) | 2026-11-11 |
| PROJ-5 | Systemverwaltung — Admin verwaltet Systeme inkl. S1000D-Issue (2.3/4.2/5.0) · P0 · Deps: PROJ-2 | Approved | [PROJ-5](PROJ-5-systemverwaltung.md) | 2026-11-11 |
| PROJ-6 | DMRL anlegen — Admin legt DMRL zu einem System an (Originator, DML-Typ, Sicherheitseinstufung) · P0 · Deps: PROJ-4, PROJ-5 | Approved | [PROJ-6](PROJ-6-dmrl-anlegen.md) | 2026-11-11 |
| PROJ-7 | DMRL-Ansicht — Anzeige der DMRL mit Einträgen und Eintragsstatus · P0 · Deps: PROJ-6, PROJ-17 | In Progress | [PROJ-7](PROJ-7-dmrl-ansicht.md) | 2026-11-11 |
| PROJ-8 | Fachliches Regelwerk — gemeinsame Prüfregeln für Check-in und REPLY · P0 · Deps: PROJ-7 | In Progress | [PROJ-8](PROJ-8-fachliches-regelwerk.md) | 2026-11-11 |
| PROJ-9 | Check-out CSV — Export zur externen Bearbeitung, sperrt die DMRL · P0 · Deps: PROJ-7 | In Progress | [PROJ-9](PROJ-9-check-out-csv.md) | 2026-11-11 |
| PROJ-10 | Check-in CSV — Import mit Regelprüfung, Übernahme, Entsperren · P0 · Deps: PROJ-8, PROJ-9 | In Progress | [PROJ-10](PROJ-10-check-in-csv.md) | 2026-11-11 |
| PROJ-11 | XSD-Validierung — Prüfung gegen dml.xsd (2.3/4.2/5.0) via xmllint · P0 · Deps: PROJ-5 | Architected | [PROJ-11](PROJ-11-xsd-validierung.md) | 2026-11-11 |
| PROJ-12 | SEND-Export — S1000D-DMRL-XML mit Versionsindex NNNNN-JJJJ · P0 · Deps: PROJ-7, PROJ-11 | Architected | [PROJ-12](PROJ-12-send-export.md) | 2026-11-11 |
| PROJ-13 | REPLY-Import — Partner-XML prüfen, Einträge freigegeben/zu überarbeiten · P0 · Deps: PROJ-8, PROJ-11, PROJ-12 | Architected | [PROJ-13](PROJ-13-reply-import.md) | 2026-11-11 |
| PROJ-14 | Freigabestatus DMRL — Statusmodell, Freigabe-Nachweis, Freigabestand (CSV/XML) · P0 · Deps: PROJ-10, PROJ-13, PROJ-18 | Architected | [PROJ-14](PROJ-14-freigabestatus.md) | 2026-11-11 |
| PROJ-15 | Archiv SEND/REPLY — alle Austauschstände einsehen und herunterladen · P0 · Deps: PROJ-12, PROJ-13 | Architected | [PROJ-15](PROJ-15-archiv.md) | 2026-11-11 |
| PROJ-16 | Dashboard — Übersicht aller DMRLs und ihres Status · P1 · Deps: PROJ-14 | Architected | [PROJ-16](PROJ-16-dashboard.md) | 2026-11-11 |
| PROJ-17 | DMRL-Berechtigungen — Admin berechtigt Bearbeiter je DMRL/System · P0 · Deps: PROJ-3, PROJ-6 | Approved | [PROJ-17](PROJ-17-dmrl-berechtigungen.md) | 2026-11-12 |
| PROJ-18 | DMRL-Export (CSV/XML) — jederzeit exportieren, ohne Sperre und ohne Workflow · P0 · Deps: PROJ-7, PROJ-9, PROJ-11, PROJ-12 | Architected | [PROJ-18](PROJ-18-dmrl-export.md) | 2026-11-12 |
| PROJ-19 | Lokaler Start (Python-Startskript) — Voraussetzungen prüfen, App bauen, lokal starten, Browser öffnen · P0 · Deps: PROJ-11 | Architected | [PROJ-19](PROJ-19-lokaler-start.md) | 2026-11-12 |

## Next Available ID: PROJ-20
