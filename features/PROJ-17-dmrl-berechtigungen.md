# PROJ-17: DMRL-Berechtigungen

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — Sichtbarkeit und Rechte für Bearbeiter
- Requires: PROJ-3 (Benutzerverwaltung) — Auswahl aktiver Bearbeiter
- Requires: PROJ-6 (DMRL anlegen) — Berechtigungen gelten je DMRL
- Wird genutzt von: PROJ-7 bis PROJ-15 (nur berechtigte Bearbeiter sehen und bearbeiten eine DMRL)

## Beschreibung
Der Administrator berechtigt Bearbeiter für eine DMRL (und damit für deren System). Berechtigte Bearbeiter sehen die DMRL im Dashboard und dürfen alle Workflows darauf ausführen. Der Administrator selbst braucht keine Berechtigung (PROJ-2). Damit der Workflow nachvollziehbar ist, wird jeweils der ausführende Bearbeiter im Workflow gespeichert (PROJ-9, 10, 12, 13).

## Regeln
- Berechtigungen werden **je DMRL** vergeben (1 System = 1 DMRL, daher gleichbedeutend mit „je System").
- Zur Auswahl stehen nur **aktive** Benutzer mit Rolle **Bearbeiter**.
- Mehrere Bearbeiter je DMRL möglich; auch keiner (dann nur Administratoren).
- Berechtigungen sind **jederzeit** änderbar, auch während laufender Workflows.
- **Ausnahme:** Ein Bearbeiter, der die DMRL **gerade ausgecheckt** hat, kann nicht entfernt werden.
- Inaktive Bearbeiter behalten ihre Berechtigung (PROJ-3), werden als „inaktiv" gekennzeichnet, können entfernt, aber nicht neu hinzugefügt werden.
- Administratoren werden in der Auswahl nicht angeboten.

## User Stories
- Als **Administrator** möchte ich Bearbeiter für eine DMRL berechtigen, damit sie daran arbeiten können.
- Als **Administrator** möchte ich Berechtigungen wieder entziehen, damit nur zuständige Personen eine DMRL bearbeiten.
- Als **Bearbeiter** möchte ich im Dashboard nur die DMRLs sehen, für die ich berechtigt bin, damit ich mich auf meine Systeme konzentrieren kann.
- Als **Administrator** möchte ich daran gehindert werden, einem Bearbeiter mit aktivem Check-out die Berechtigung zu entziehen, damit keine Sperre ohne berechtigten Besitzer entsteht.
- Als **Administrator** möchte ich in der DMRL-Liste sehen, wer berechtigt ist, damit ich Zuständigkeiten schnell erkenne.

## Out of Scope
- Anlegen/Bearbeiten/Löschen der DMRL → PROJ-6
- Berechtigungen pro Workflow-Schritt (alle berechtigten Bearbeiter dürfen alle Schritte)
- Berechtigungen für Administratoren (haben immer Zugriff)
- Zeitlich befristete Berechtigungen
- Protokoll der Berechtigungsänderungen
- Speichern des ausführenden Bearbeiters je Workflow-Schritt → jeweiliges Workflow-Feature (PROJ-9, 10, 12, 13)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein Administrator ist angemeldet, wenn er in der DMRL-Verwaltung bei einer DMRL „Berechtigungen" wählt, dann öffnet sich die Berechtigungsauswahl
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn er die Berechtigungsverwaltung direkt aufruft, dann erscheint „Keine Berechtigung" (PROJ-2)

### Anzeige
- [ ] Angenommen die DMRL-Verwaltung ist geöffnet, wenn die Liste angezeigt wird, dann zeigt eine Spalte „Bearbeiter" die Namen der berechtigten Bearbeiter oder „— keine —"
- [ ] Angenommen ein berechtigter Bearbeiter ist inaktiv, wenn die Liste oder die Auswahl angezeigt wird, dann ist sein Name mit „inaktiv" gekennzeichnet

### Vergeben & Entziehen
- [ ] Angenommen die Berechtigungsauswahl ist geöffnet, wenn sie angezeigt wird, dann listet sie alle aktiven Bearbeiter als Mehrfachauswahl, bereits berechtigte sind markiert
- [ ] Angenommen ein Bearbeiter wird hinzugefügt und gespeichert, wenn er sich anmeldet, dann sieht er die DMRL im Dashboard und darf alle Workflows darauf ausführen
- [ ] Angenommen ein Bearbeiter ist berechtigt und hat die DMRL nicht ausgecheckt, wenn er entfernt und gespeichert wird, dann sieht er die DMRL nicht mehr und erhält bei Direktaufruf „Keine Berechtigung"
- [ ] Angenommen ein Bearbeiter hat die DMRL ausgecheckt, wenn er entfernt werden soll, dann ist dies nicht möglich mit dem Hinweis „[Name] hat die DMRL ausgecheckt und kann erst nach dem Check-in entfernt werden"
- [ ] Angenommen ein inaktiver Bearbeiter ist berechtigt, wenn die Auswahl geöffnet wird, dann kann er entfernt, aber nicht neu hinzugefügt werden
- [ ] Angenommen Benutzer mit Rolle Administrator existieren, wenn die Auswahl geöffnet wird, dann werden sie nicht angeboten
- [ ] Angenommen keine Bearbeiter sind ausgewählt, wenn gespeichert wird, dann ist das erlaubt; nur Administratoren können die DMRL bearbeiten
- [ ] Angenommen die Auswahl ist geöffnet, wenn „Abbrechen" gewählt wird, dann bleiben die Berechtigungen unverändert
- [ ] Angenommen es gibt keine aktiven Bearbeiter, wenn die Auswahl geöffnet wird, dann erscheint „Keine aktiven Bearbeiter vorhanden — legen Sie zuerst Bearbeiter an (Verwaltung → Benutzer)"

### Wirkung
- [ ] Angenommen eine DMRL wird gelöscht (PROJ-6), wenn danach die Berechtigungen betrachtet werden, dann existieren für sie keine Berechtigungen mehr
- [ ] Angenommen ein berechtigter Bearbeiter wird deaktiviert und später reaktiviert (PROJ-3), wenn er sich danach anmeldet, dann gilt seine Berechtigung wieder

### Demo-Daten
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Berechtigungen betrachtet werden, dann ist „Anna Bearbeitung" für PHUNGUN und Fahrzeug, „Ben Bearbeiter" für Fahrzeug und Fluggerät berechtigt (PROJ-1)

## Edge Cases
- **Bearbeiter wird zum Administrator befördert:** Berechtigungen bleiben gespeichert, sind aber wirkungslos (Admin sieht alles); nach Rückstufung wirken sie wieder.
- **Berechtigung entzogen, während der Bearbeiter die DMRL geöffnet hat (ohne Check-out):** nächster Seitenaufruf → „Keine Berechtigung".
- **Letzter berechtigter Bearbeiter wird entfernt:** erlaubt; Administratoren können weiterarbeiten.
- **Bearbeiter hat den letzten SEND ausgelöst und wird entfernt:** erlaubt (nur Check-out sperrt); Deaktivieren bleibt in diesem Fall gesperrt (PROJ-3).
- **Zwei Tabs, gleichzeitiges Bearbeiten:** letzter Speichervorgang gewinnt (Prototyp, PROJ-1).

## Technical Requirements (optional)
- Nur für Administratoren erreichbar (PROJ-2)
- Rechteprüfung wirkt sofort auf Dashboard und Direktaufrufe

## Open Questions
- [x] Soll ein Bearbeiter, der den letzten SEND ausgelöst hat, ebenfalls nicht entfernt werden können? → Nein, Entfernen erlaubt (nur Check-out sperrt); Deaktivieren bleibt gesperrt (PROJ-3) — siehe Edge Cases (2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Berechtigungen als eigenes Feature, getrennt von „DMRL anlegen" | Vorgabe Product Owner | 2026-11-12 |
| Bearbeiter werden je System/DMRL durch den Administrator berechtigt | Vorgabe Product Owner | 2026-11-12 |
| Ausführender Bearbeiter wird je Workflow-Schritt gespeichert | Vorgabe Product Owner — Nachvollziehbarkeit | 2026-11-12 |
| Berechtigung jederzeit änderbar, außer Entfernen des Bearbeiters mit aktivem Check-out | Keine Sperre ohne berechtigten Besitzer | 2026-11-12 |
| Nur aktive Bearbeiter wählbar; inaktive behalten Berechtigung | Konsistent mit PROJ-3 | 2026-11-12 |
| Administratoren nicht in der Auswahl | Haben ohnehin Zugriff auf alle DMRLs (PROJ-2) | 2026-11-12 |
| Keine Berechtigung pro Workflow-Schritt | Einfaches Rechtemodell für den Prototyp | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Berechtigungsdialog aus der DMRL-Verwaltung (PROJ-6), keine eigene Seite | Alles zu einer DMRL an einer Stelle | 2026-11-12 |
| Checkbox-Liste im Dialog | Wenige Bearbeiter, Sperren sichtbar | 2026-11-12 |
| Wirkung ausschließlich über zentrale Rechte-Regel (PROJ-2) | Sofort wirksam, eine Quelle | 2026-11-12 |
| Berechtigungen inaktiver/beförderter Benutzer bleiben gespeichert, wirken aber nicht | Wiederherstellung ohne Neuvergabe | 2026-11-12 |
| Sperrinhaber-Schutz in UI und beim Speichern | Schutz bei veralteter Anzeige | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Die Berechtigungen werden direkt in der **DMRL-Verwaltung (PROJ-6)** gepflegt: zusätzliche Spalte „Bearbeiter" und Aktion „Berechtigungen" je DMRL, die einen Auswahldialog öffnet. Die Wirkung (wer sieht welche DMRL) setzt ausschließlich die **zentrale Rechte-Regel aus PROJ-2** um. Kein Backend nötig.

### A) Komponentenstruktur
```
DMRL-Verwaltung (/verwaltung/dmrl, PROJ-6)
+-- Tabelle (Ergänzung)
|   +-- Spalte „Bearbeiter": Namen der berechtigten Bearbeiter, inaktive mit Badge „inaktiv"; „— keine —"
|   +-- Aktion „Berechtigungen"
+-- Dialog „Berechtigungen — [Systemname]" (shadcn Dialog)
    +-- Liste aller Bearbeiter als Mehrfachauswahl (shadcn Checkbox), sortiert nach Name
    |   +-- aktive Bearbeiter: frei wählbar
    |   +-- inaktive, bereits berechtigte: angezeigt mit „inaktiv", nur abwählbar
    |   +-- Sperrinhaber: angehakt und gesperrt, Hinweis „[Name] hat die DMRL ausgecheckt …"
    |   +-- Administratoren: nicht angezeigt
    +-- Hinweis, wenn keine aktiven Bearbeiter existieren (mit Verweis auf Verwaltung → Benutzer)
    +-- „Speichern" · „Abbrechen"
```

### B) Datenmodell (in Klartext)
Keine Änderung — die DMRL speichert die Liste der berechtigten Bearbeiter (IDs) laut PROJ-1. Beim Löschen einer DMRL verschwindet die Liste mit (PROJ-6). Deaktivierte oder zum Administrator beförderte Benutzer bleiben in der Liste; ob die Berechtigung wirkt, entscheidet die Rechte-Regel (nur aktive Bearbeiter).

### C) Fachregeln (eine Stelle, ohne Oberfläche)
- **Auswählbar:** aktive Benutzer mit Rolle Bearbeiter.
- **Nur abwählbar:** inaktive, bereits berechtigte Bearbeiter.
- **Nicht entfernbar:** der Sperrinhaber der DMRL (Check-out, PROJ-9) — wird auch beim Speichern geprüft.
- **Leere Auswahl** erlaubt.
- **Wirkung:** zentrale Rechte-Regel (PROJ-2) — Bearbeiter sieht/bearbeitet eine DMRL nur, wenn er aktiv, Rolle Bearbeiter und in der Liste ist; Administratoren immer.
- Änderungen werden **nicht** im Verlauf protokolliert (PROJ-15).

### D) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Pflege in der DMRL-Verwaltung statt eigener Seite | Alles zu einer DMRL an einer Stelle (PROJ-6). |
| Mehrfachauswahl als Checkbox-Liste im Dialog | Wenige Bearbeiter; alle Optionen und Sperren auf einen Blick. |
| Wirkung nur über die zentrale Rechte-Regel | Änderungen gelten sofort für Dashboard, DMRL-Seiten und Aktionen. |
| Inaktive/beförderte Benutzer bleiben gespeichert | Reaktivierung bzw. Rückstufung stellt die Berechtigung ohne Neuvergabe wieder her (PROJ-3). |
| Sperrinhaber-Schutz auch beim Speichern | Schutz bei veralteter Anzeige (zweiter Tab). |

### E) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.** shadcn Checkbox, Dialog, Badge sind installiert.

### F) Testbarkeit
- Unit-Tests: Auswahlliste (aktive Bearbeiter, keine Admins, inaktive nur abwählbar), Sperrinhaber nicht entfernbar, Rechte-Regel mit Berechtigung (aktiv / inaktiv / befördert).
- E2E: Berechtigung vergeben → Bearbeiter sieht DMRL; entziehen → „Keine Berechtigung"; Sperrinhaber nicht entfernbar; Demo-Berechtigungen laut PROJ-1.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-17`_

**Umgesetzt**
- `src/lib/rules/permissions-admin.ts` — Auswahlliste (aktive Bearbeiter + bereits berechtigte inaktive; keine Administratoren; Sperrinhaber gesperrt mit Hinweis), Spalte „Bearbeiter", Speichern mit Prüfungen (nur Bearbeiter, inaktive nicht neu hinzufügbar, Sperrinhaber nicht entfernbar). Gespeicherte Berechtigungen von zum Administrator beförderten Benutzern bleiben beim Speichern erhalten (wirkungslos, wirken nach Rückstufung wieder).
- `src/components/admin/dmrls/dmrl-permissions-dialog.tsx` — Dialog „Berechtigungen — [System]" mit Checkbox-Liste, Kennzeichen „inaktiv", Sperrhinweis, Hinweis bei fehlenden aktiven Bearbeitern; Abbrechen ändert nichts.
- DMRL-Verwaltung (PROJ-6) ergänzt um Spalte „Bearbeiter" (Namen bzw. „— keine —", inaktive markiert) und Aktion „Berechtigungen".
- Wirkung ausschließlich über die zentrale Rechte-Regel (PROJ-2): Dashboard, DMRL-Seiten und Direktaufrufe reagieren sofort.

**Tests**: `permissions-admin.test.ts` (11), `dmrl-permissions.test.tsx` (5) — insgesamt 184 Tests grün.

**Hinweise**
- Änderungen werden laut Spec nicht im Verlauf protokolliert.
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
- [x] Zugriff (2/2) — E2E
- [x] Anzeige (2/2): Spalte „Bearbeiter", Kennzeichen „inaktiv" — E2E + Komponententest
- [x] Vergeben & Entziehen (9/9): Mehrfachauswahl, Wirkung im Dashboard, Entzug → „Keine Berechtigung", Sperrinhaber nicht entfernbar, inaktive nur abwählbar, keine Administratoren, leere Auswahl, Abbrechen, Hinweis ohne aktive Bearbeiter — E2E + Komponententest + Unit
- [x] Wirkung (2/2): Löschen der DMRL entfernt Berechtigungen; Reaktivierung stellt Berechtigung wieder her (Unit)
- [x] Demo-Daten (1/1)

### Edge Cases Status
- [x] Beförderter Bearbeiter: Berechtigung bleibt gespeichert, wirkt nach Rückstufung wieder (Unit)

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

Keine Bugs in diesem Feature.

### Summary
- **Acceptance Criteria:** 16/16 passed
- **Bugs Found:** 0 total (0 critical, 0 high, 0 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung ohne Backend)
- **Production Ready:** YES
- **Recommendation:** Freigeben; Medium/Low-Bugs bei Gelegenheit beheben
- **E2E-Tests:** `tests/PROJ-1-datenhaltung.spec.ts`, `tests/PROJ-2-anmeldung.spec.ts`, `tests/PROJ-3-to-6-17-verwaltung.spec.ts`, `tests/security-responsive.spec.ts`

## Deployment
_To be added by /deploy_
