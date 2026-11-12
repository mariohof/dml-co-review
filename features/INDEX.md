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
| PROJ-1 | Datenhaltung (JSON/localStorage) + Demo-Daten — Persistenzschicht und Beispieldaten (Systeme in 2.3/4.2/5.0) · P0 · Deps: None | Architected | [PROJ-1](PROJ-1-datenhaltung-demo-daten.md) | 2026-11-11 |
| PROJ-2 | Simulierte Anmeldung & Rollenwechsel — Benutzerauswahl, Rollen Administrator/Bearbeiter · P0 · Deps: PROJ-1 | Planned | [PROJ-2](PROJ-2-simulierte-anmeldung-rollen.md) | 2026-11-11 |
| PROJ-3 | Benutzerverwaltung — Admin legt Benutzer an und bearbeitet sie · P0 · Deps: PROJ-2 | Planned | [PROJ-3](PROJ-3-benutzerverwaltung.md) | 2026-11-11 |
| PROJ-4 | Organisationsverwaltung — Admin verwaltet Organisationen (CAGE-Code, Name) · P0 · Deps: PROJ-2 | Planned | [PROJ-4](PROJ-4-organisationsverwaltung.md) | 2026-11-11 |
| PROJ-5 | Systemverwaltung — Admin verwaltet Systeme inkl. S1000D-Issue (2.3/4.2/5.0) · P0 · Deps: PROJ-2 | Planned | [PROJ-5](PROJ-5-systemverwaltung.md) | 2026-11-11 |
| PROJ-6 | DMRL anlegen & Berechtigungen — Admin legt DMRLs zu Systemen an und vergibt Rechte · P0 · Deps: PROJ-3, PROJ-4, PROJ-5 | Roadmap | — | 2026-11-11 |
| PROJ-7 | DMRL-Ansicht — Anzeige der DMRL mit Einträgen und Eintragsstatus · P0 · Deps: PROJ-6 | Roadmap | — | 2026-11-11 |
| PROJ-8 | Fachliches Regelwerk — gemeinsame Prüfregeln für Check-in und REPLY · P0 · Deps: PROJ-7 | Roadmap | — | 2026-11-11 |
| PROJ-9 | Check-out Excel/CSV — Export zur externen Bearbeitung, sperrt die DMRL · P0 · Deps: PROJ-7 | Roadmap | — | 2026-11-11 |
| PROJ-10 | Check-in Excel/CSV — Import mit Regelprüfung, Übernahme, Entsperren · P0 · Deps: PROJ-8, PROJ-9 | Roadmap | — | 2026-11-11 |
| PROJ-11 | XSD-Validierung — Prüfung gegen dml.xsd (2.3/4.2/5.0) via xmllint · P0 · Deps: PROJ-5 | Roadmap | — | 2026-11-11 |
| PROJ-12 | SEND-Export — S1000D-DMRL-XML mit Versionsindex NNNNN-JJJJ · P0 · Deps: PROJ-7, PROJ-11 | Roadmap | — | 2026-11-11 |
| PROJ-13 | REPLY-Import — Partner-XML prüfen, Einträge freigegeben/zu überarbeiten · P0 · Deps: PROJ-8, PROJ-11, PROJ-12 | Roadmap | — | 2026-11-11 |
| PROJ-14 | Freigabestatus DMRL — Ableitung aus Eintragsstatus, Aufhebung bei Änderung · P0 · Deps: PROJ-10, PROJ-13 | Roadmap | — | 2026-11-11 |
| PROJ-15 | Archiv SEND/REPLY — alle Austauschstände einsehen und herunterladen · P0 · Deps: PROJ-12, PROJ-13 | Roadmap | — | 2026-11-11 |
| PROJ-16 | Dashboard — Übersicht aller DMRLs und ihres Status · P1 · Deps: PROJ-14 | Roadmap | — | 2026-11-11 |

## Next Available ID: PROJ-17
