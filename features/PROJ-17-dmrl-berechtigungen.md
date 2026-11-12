# PROJ-17: DMRL-Berechtigungen

## Status: Planned
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
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Berechtigungen betrachtet werden, dann ist Bearbeiter 1 für PHUNGUN und Fahrzeug, Bearbeiter 2 für Fahrzeug und Fluggerät berechtigt

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
- [ ] Soll ein Bearbeiter, der den letzten SEND ausgelöst hat, ebenfalls nicht entfernt werden können (analog Deaktivieren, PROJ-3)?

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

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
