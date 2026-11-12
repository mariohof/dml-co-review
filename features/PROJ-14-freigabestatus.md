# PROJ-14: Freigabestatus DMRL

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-7 (DMRL-Ansicht) — Kopfbereich, Banner, Tabelle
- Requires: PROJ-10 (Check-in) — Aufhebung der Freigabe bei Änderung
- Requires: PROJ-12 (SEND), PROJ-13 (REPLY) — Statusübergänge, Freigabe durch REPLY
- Requires: PROJ-18 (DMRL-Export) — XML-Aufbau des Exports, PROJ-11 — XSD-Prüfung
- Wird genutzt von: PROJ-15 (Archiv zeigt Freigabestände), PROJ-16 (Dashboard)

## Beschreibung
PROJ-14 ist die zentrale Referenz für den Status von DMRL und Einträgen (Statusmodell) und ergänzt zwei Funktionen: den **Freigabe-Nachweis** (wodurch und wann wurde die DMRL freigegeben) und den **letzten freigegebenen Stand**, der auch dann einsehbar und exportierbar bleibt, wenn die DMRL erneut bearbeitet wird (Anforderung 02: „Letzte Freigabeversion bleibt als Prüfgrundlage"). Eine nicht freigegebene DMRL darf nicht in einem Technische-Publikation-Projekt verwendet werden (PRD); der Freigabestand zeigt, welcher Stand zuletzt verwendbar war.

## Statusmodell

### Eintragsstatus
| Status | Bedeutung |
|---|---|
| *in Bearbeitung* | neu oder geändert, noch nicht gesendet |
| *gesendet* | mit Eintragstyp `n`/`c`/`d` an den Partner gesendet, Antwort ausstehend |
| *freigegeben* | vom Partner genehmigt (Eintragstyp leer) |
| *zu überarbeiten* | vom Partner abgelehnt (Eintragstyp bleibt) |

| Auslöser | Von | Nach | Spec |
|---|---|---|---|
| Check-in: Eintrag neu | — | *in Bearbeitung* | PROJ-10 |
| Check-in: Eintrag geändert (auch nur Eintragstyp) | jeder | *in Bearbeitung* | PROJ-10 |
| Check-in: Eintrag unverändert | jeder | unverändert | PROJ-10 |
| SEND: Eintrag mit `n`/`c`/`d` | *in Bearbeitung* | *gesendet* | PROJ-12 |
| SEND: Eintrag ohne Eintragstyp | *freigegeben* | unverändert | PROJ-12 |
| REPLY `answer="y"` | *gesendet* | *freigegeben* (Eintragstyp entfernt) | PROJ-13 |
| REPLY `answer="n"` | *gesendet* | *zu überarbeiten* | PROJ-13 |
| SEND zurückgezogen | *gesendet* | *in Bearbeitung* | PROJ-12 |

Demo-Ausgangsstände: PHUNGUN-Einträge *gesendet*, Fahrzeug/Fluggerät *in Bearbeitung* (PROJ-1).

### DMRL-Status
| Status | Bedeutung |
|---|---|
| *in Bearbeitung* | nicht freigegeben, kein SEND offen |
| *gesendet* | SEND offen, wartet auf REPLY |
| *freigegeben* | alle Einträge *freigegeben* |

| Auslöser | Von | Nach | Spec |
|---|---|---|---|
| DMRL angelegt | — | *in Bearbeitung* | PROJ-6 |
| Check-in mit Änderung | jeder außer *gesendet* | *in Bearbeitung* (Freigabe aufgehoben) | PROJ-10 |
| Check-in ohne Änderung | jeder außer *gesendet* | unverändert | PROJ-10 |
| SEND | *in Bearbeitung* | *gesendet* | PROJ-12 |
| REPLY, danach alle Einträge *freigegeben* | *gesendet* | *freigegeben* | PROJ-13 |
| REPLY, mindestens ein Eintrag nicht *freigegeben* | *gesendet* | *in Bearbeitung* | PROJ-13 |
| SEND zurückgezogen | *gesendet* | *in Bearbeitung* | PROJ-12 |

**Sperre (Check-out)** ist kein Status, sondern ein zusätzliches Kennzeichen (PROJ-9); Check-out ist bei *gesendet* nicht möglich.

**Invariante:** DMRL *freigegeben* ⇔ alle Einträge *freigegeben* (und mindestens ein Eintrag vorhanden). Eine DMRL ohne Einträge ist nie freigegeben.

## Freigabe-Nachweis
Bei jeder Freigabe (REPLY-Übernahme mit Ergebnis *freigegeben*) wird gespeichert: Datum/Uhrzeit, REPLY-Versionsindex und Partner, übernehmender Bearbeiter.

Kopfbereich der Ansicht (Ergänzung PROJ-7):
- **freigegeben:** „Freigegeben am 12.11.2026 durch REPLY C1234 00002-2026 — übernommen von Bea Bearbeiter"
- **nicht freigegeben, früher schon freigegeben:** Banner „Nicht freigegeben" (PROJ-7) + „Letzte Freigabe: 12.11.2026, REPLY C1234 00002-2026" mit Aktion **„Freigabestand anzeigen"**
- **nie freigegeben:** nur Banner „Nicht freigegeben"

## Freigabestand
- Bei jeder Freigabe wird eine **Momentaufnahme aller Einträge** gespeichert (alle Felder, Status *freigegeben*).
- **Alle** Freigabestände bleiben erhalten (Historie), werden nie gelöscht; Liste im Archiv (PROJ-15).
- **„Freigabestand anzeigen"**: Tabelle wie PROJ-7, nur lesend, deutlich gekennzeichnet „Freigabestand vom [Datum] (REPLY [Versionsindex])", mit Suche/Filter wie PROJ-7.
- **„Als CSV exportieren"**: Aufbau wie PROJ-9, ohne Sperre; Dateiname `DML-{MI}-{CAGE}-{DML-Typ}-Freigabe-{JJJJ-MM-TT}.csv`.
- **„Als XML exportieren"**: jederzeit, ohne Sperre; S1000D-XML im Issue des Systems mit dem XML-Aufbau des Exports (PROJ-18), vor dem Download gegen das Schema geprüft (PROJ-11); Dateiname `DML-{MI}-{CAGE}-{DML-Typ}-Freigabe-{JJJJ-MM-TT}.XML`. Kein Versionsindex, kein Archiveintrag, keine Statusänderung.

## User Stories
- Als **Bearbeiter** möchte ich sehen, wann und durch welchen REPLY die DMRL freigegeben wurde, damit ich die Freigabe nachweisen kann.
- Als **Bearbeiter** möchte ich nach einer erneuten Bearbeitung weiterhin den letzten freigegebenen Stand einsehen und exportieren, damit ein TP-Projekt darauf weiterarbeiten kann.
- Als **Product Owner** möchte ich zeigen, dass eine DMRL ihre Freigabe durch eine Änderung verliert, der letzte freigegebene Stand aber erhalten bleibt.
- Als **Entwickler/QA** möchte ich ein zentrales Statusmodell, damit alle Workflows konsistent umgesetzt und getestet werden.

## Out of Scope
- Manueller „Freigeben"-Schritt, Status *freigabebereit* (PROJ-13)
- Freigabe ohne REPLY / „Fehler ignorieren" (Anforderung 02)
- Echte Verwendungssperre in TP-Projekten (Non-Goal; nur als Status sichtbar)
- Vergleich (Diff) zweier Freigabestände
- Löschen von Freigabeständen
- Liste aller Freigabestände → PROJ-15

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Statusmodell
- [ ] Angenommen eine DMRL ist *freigegeben*, wenn ihre Einträge betrachtet werden, dann sind alle *freigegeben*
- [ ] Angenommen eine DMRL hat keine Einträge, wenn ihr Status betrachtet wird, dann ist sie nicht *freigegeben*
- [ ] Angenommen ein Übergang aus der Tabelle wird ausgelöst, wenn er abgeschlossen ist, dann haben DMRL und Einträge den dort angegebenen Status (Prüfung je Zeile)

### Freigabe-Nachweis
- [ ] Angenommen ein REPLY wird übernommen und danach sind alle Einträge *freigegeben*, wenn der Kopfbereich betrachtet wird, dann zeigt er „Freigegeben am [Datum] durch REPLY [Partner] [Versionsindex] — übernommen von [Name]"
- [ ] Angenommen eine DMRL wurde nie freigegeben, wenn der Kopfbereich betrachtet wird, dann erscheint nur das Banner „Nicht freigegeben" ohne Hinweis auf eine letzte Freigabe

### Freigabestand
- [ ] Angenommen eine DMRL wird freigegeben, wenn danach die Freigabestände betrachtet werden, dann existiert ein neuer Freigabestand mit allen Einträgen, Datum, REPLY und Bearbeiter
- [ ] Angenommen eine freigegebene DMRL wird per Check-in geändert, wenn der Kopfbereich betrachtet wird, dann erscheinen das Banner „Nicht freigegeben" und „Letzte Freigabe: [Datum], REPLY [Versionsindex]" mit „Freigabestand anzeigen"
- [ ] Angenommen „Freigabestand anzeigen" wird gewählt, wenn die Tabelle angezeigt wird, dann zeigt sie die Einträge zum Zeitpunkt der Freigabe (nicht den aktuellen Stand), gekennzeichnet als Freigabestand, ohne Bearbeitungsaktionen
- [ ] Angenommen der Freigabestand wird angezeigt, wenn „Als CSV exportieren" gewählt wird, dann wird eine CSV im Aufbau von PROJ-9 mit dem Dateinamen `DML-{MI}-{CAGE}-{DML-Typ}-Freigabe-{JJJJ-MM-TT}.csv` heruntergeladen und die DMRL wird nicht gesperrt
- [ ] Angenommen der Freigabestand wird angezeigt, wenn „Als XML exportieren" gewählt wird, dann wird eine XML im Issue des Systems heruntergeladen, die die XSD-Prüfung besteht; DMRL-Status, Versionsindex und Archiv bleiben unverändert
- [ ] Angenommen die XSD-Prüfung des Freigabestands schlägt fehl oder ist nicht verfügbar, wenn als XML exportiert wird, dann wird nichts heruntergeladen (PROJ-11)
- [ ] Angenommen eine DMRL wurde zweimal freigegeben, wenn die Freigabestände betrachtet werden, dann existieren beide; „Letzte Freigabe" verweist auf den neueren
- [ ] Angenommen ein Check-in ohne Änderung erfolgt bei einer freigegebenen DMRL, wenn danach der Kopfbereich betrachtet wird, dann bleibt der Freigabe-Nachweis unverändert und es entsteht kein neuer Freigabestand

### Demo
- [ ] Angenommen PHUNGUN wird durch einen REPLY mit nur `y` freigegeben, danach ausgecheckt, ein Eintrag geändert und eingecheckt, wenn die Ansicht betrachtet wird, dann ist die DMRL *in Bearbeitung* und der letzte Freigabestand ist anzeigbar und als CSV und XML exportierbar

## Edge Cases
- **Freigabestand bei vielen Freigaben:** Speicherbedarf wächst; bei vollem Speicher schlägt die REPLY-Übernahme fehl (PROJ-1), nichts geändert.
- **Benutzer des Freigabe-Nachweises wird deaktiviert:** Name bleibt im Nachweis sichtbar.
- **Partner-Organisation wird umbenannt:** Nachweis zeigt CAGE-Code und aktuellen Namen.
- **Admin zieht SEND zurück nach einer früheren Freigabe:** letzter Freigabestand bleibt unverändert verfügbar.
- **Demo-Daten neu laden:** Freigabestände der Demo-Daten (keine) ersetzen bestehende.

## Technical Requirements (optional)
- Freigabestände unveränderlich gespeichert
- Anzeige eines Freigabestands mit 1.000 Einträgen ohne spürbare Verzögerung

## Open Questions
- [x] Kopfdaten des XML-Exports (Richtung, `dmlc`, `dmlref`) → festgelegt in PROJ-18 (`issno` 000 / `inwork` 01, `remarks` „Freigabestand vom … — Export vom …")

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| PROJ-14 als zentrales Statusmodell + Freigabe-Nachweis + Freigabestand | Vorgabe Product Owner; Regeln bisher über PROJ-7/10/12/13 verteilt | 2026-11-12 |
| Freigabestand als Momentaufnahme bei jeder Freigabe, alle bleiben erhalten | Anforderung 02: letzte Freigabeversion bleibt Prüfgrundlage; Nachvollziehbarkeit | 2026-11-12 |
| Freigabestand nur lesend, CSV-Export ohne Sperre | TP-Projekt kann auf freigegebenem Stand weiterarbeiten | 2026-11-12 |
| Freigabestand jederzeit als CSV und XML exportierbar | Vorgabe Product Owner | 2026-11-12 |
| DMRL ohne Einträge ist nie freigegeben | Freigabe setzt geprüfte Einträge voraus | 2026-11-12 |

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
