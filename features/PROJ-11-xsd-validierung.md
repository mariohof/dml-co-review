# PROJ-11: XSD-Validierung

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-5 (Systemverwaltung) — S1000D-Issue des Systems bestimmt das Schema
- Wird genutzt von: PROJ-12 (SEND-Export), PROJ-13 (REPLY-Import), PROJ-18 (DMRL-Export XML)
- Abgrenzung: PROJ-8 (Fachliches Regelwerk) läuft beim REPLY **nach** bestandener XSD-Prüfung

## Beschreibung
Jede DMRL-XML-Datei, die die Anwendung erzeugt oder annimmt, wird gegen das S1000D-Schema `dml.xsd` des Issues des Systems (2.3, 4.2 oder 5.0) mit `xmllint` validiert. Die Validierung ist Pflicht (PRD): Besteht eine Datei die Prüfung nicht oder ist die Prüfung nicht möglich, wird der Vorgang blockiert. Da `xmllint` nicht im Browser läuft, erfolgt die Prüfung serverseitig.

## Schemas
| Issue | Ablage | Bemerkung |
|---|---|---|
| 2.3 | `schemas/s1000d/issue-2.3/dml.xsd` (+ dc, rdf, xcf, xlink) | PHUNGUN-Beispieldateien gültig |
| 4.2 | `schemas/s1000d/issue-4.2/dml.xsd` (+ dc, rdf, xcf, xlink) | |
| 5.0 | `schemas/s1000d/issue-5.0/dml.xsd` (+ dc, rdf, xcf, xlink, xml) | `xml.xsd` lokal (Offline-Prüfung) |

Maßgeblich ist **immer das Issue des Systems** der DMRL. Eine Datei eines anderen Issues fällt dadurch durch.

## Einsatz
| Einsatz | Geprüft wird | Bei Fehler |
|---|---|---|
| REPLY-Import (PROJ-13) | hochgeladene Partner-XML, **vor** PROJ-8 | Datei abgelehnt, Regelwerk läuft nicht, XSD-Prüfbericht |
| SEND (PROJ-12) | erzeugte XML, **vor** Download und Archivierung | SEND abgebrochen: kein Download, kein Versionsindex, kein Archiv; Meldung als Anwendungsfehler |
| XML-Export (PROJ-18) | erzeugte XML | Export abgebrochen |

**Prüfung nicht möglich** (xmllint fehlt, Serverfunktion nicht erreichbar, Schema fehlt): Vorgang blockiert — „XSD-Prüfung nicht verfügbar — der Vorgang kann nicht ausgeführt werden. Bitte Administrator informieren." Kein „Trotzdem fortfahren".

## Prüfbericht
| Punkt | Festlegung |
|---|---|
| Überschrift | Deutsch, z. B. „Die Datei entspricht nicht dem Schema S1000D Issue 2.3 (dml.xsd) — 3 Fehler" |
| je Fehler | Zeile + Originalmeldung von xmllint (unübersetzt) |
| Kein wohlgeformtes XML | eigene Meldung „Die Datei ist kein gültiges XML (Zeile X)"; keine Schemaprüfung |
| Download | Bericht herunterladbar, gleicher Aufbau wie PROJ-8 |
| Erfolg | Hinweis „XSD-Prüfung bestanden (S1000D Issue 2.3)", weiter mit nächstem Schritt |

**Dateiannahme (REPLY):** nur `.xml`/`.XML`, max. 5 MB.

## Demo-Testdateien
Für die Vorführung werden fehlerhafte REPLY-Dateien bereitgestellt (auf Basis von PHUNGUN, Issue 2.3):
1. **Pflichtelement fehlt** (z. B. `dmentry` ohne `addresdm`) → XSD-Fehler
2. **Falsches Issue** (4.2-Struktur für das 2.3-System) → XSD-Fehler
3. **Kein gültiges XML** (fehlendes schließendes Tag) → Wohlgeformtheitsfehler
4. **XSD-gültig, aber fachlich falsch** (z. B. falscher Absender) → besteht PROJ-11, scheitert an PROJ-8

## User Stories
- Als **Bearbeiter** möchte ich, dass eine REPLY-Datei des Partners gegen das Schema geprüft wird, bevor sie fachlich geprüft wird, damit nur strukturell korrekte Dateien verarbeitet werden.
- Als **Bearbeiter** möchte ich sicher sein, dass jede SEND-Datei schemakonform ist, damit der Partner sie verarbeiten kann.
- Als **Bearbeiter** möchte ich den XSD-Prüfbericht herunterladen und dem Partner schicken, damit er seine Datei korrigieren kann.
- Als **Product Owner** möchte ich mit vorbereiteten fehlerhaften Dateien zeigen, dass Schemafehler zuverlässig erkannt werden.
- Als **Administrator** möchte ich eine klare Meldung erhalten, wenn die Prüfung technisch nicht verfügbar ist, damit ich das Problem beheben kann.

## Out of Scope
- Eigenständige Funktion „XML prüfen" ohne Workflow
- Validierung von CSV-Dateien → PROJ-8
- Fachliche Prüfung → PROJ-8
- Übersetzung der xmllint-Meldungen
- Automatisches Erkennen des Issues aus der Datei (es gilt immer das Issue des Systems)
- Pflege/Austausch der Schemas über die Oberfläche
- Weitere S1000D-Issues (z. B. 4.0, 4.1, 6.0)
- Bereitstellung von xmllint auf dem Hosting (→ `/architecture`)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Schema-Auswahl
- [ ] Angenommen das System hat Issue 2.3, wenn eine XML geprüft wird, dann wird `schemas/s1000d/issue-2.3/dml.xsd` verwendet
- [ ] Angenommen das System hat Issue 4.2 bzw. 5.0, wenn eine XML geprüft wird, dann wird das Schema des jeweiligen Issues verwendet
- [ ] Angenommen das System hat Issue 2.3, wenn eine XML mit 4.2-Struktur geprüft wird, dann wird sie mit XSD-Fehlern abgelehnt
- [ ] Angenommen keine Internetverbindung besteht, wenn eine Datei gegen das 5.0-Schema geprüft wird, dann funktioniert die Prüfung

### REPLY
- [ ] Angenommen die Beispieldatei 02 (REPLY C1234-00001, Issue 2.3) wird für PHUNGUN hochgeladen, wenn geprüft wird, dann ist die XSD-Prüfung bestanden und das Regelwerk (PROJ-8) läuft
- [ ] Angenommen eine REPLY-Datei verletzt das Schema, wenn geprüft wird, dann erscheint der Bericht mit Überschrift, Anzahl, Zeile und xmllint-Meldung je Fehler; das Regelwerk läuft nicht; nichts wird übernommen
- [ ] Angenommen eine Datei ist kein wohlgeformtes XML, wenn geprüft wird, dann erscheint „Die Datei ist kein gültiges XML (Zeile X)"
- [ ] Angenommen eine Datei ist keine `.xml`-Datei oder größer als 5 MB, wenn sie hochgeladen wird, dann wird sie mit entsprechender Meldung abgelehnt
- [ ] Angenommen ein XSD-Prüfbericht wird angezeigt, wenn „Bericht herunterladen" gewählt wird, dann wird er als Datei gespeichert

### SEND / Export
- [ ] Angenommen ein SEND wird ausgeführt, wenn die erzeugte XML die XSD-Prüfung besteht, dann wird sie heruntergeladen und archiviert (PROJ-12)
- [ ] Angenommen ein SEND wird ausgeführt, wenn die erzeugte XML die XSD-Prüfung nicht besteht, dann wird nichts heruntergeladen, kein Versionsindex vergeben, nichts archiviert und eine Fehlermeldung mit Bericht angezeigt
- [ ] Angenommen ein XML-Export wird ausgeführt, wenn die XML die Prüfung nicht besteht, dann wird nichts heruntergeladen

### Nicht verfügbar
- [ ] Angenommen xmllint ist nicht installiert oder die Serverfunktion nicht erreichbar, wenn ein REPLY, SEND oder XML-Export ausgeführt wird, dann wird der Vorgang mit „XSD-Prüfung nicht verfügbar" blockiert und es gibt keine Möglichkeit, ihn ohne Prüfung fortzusetzen

### Demo
- [ ] Angenommen die Demo-Testdateien 1–3 werden als REPLY für PHUNGUN hochgeladen, wenn geprüft wird, dann scheitern sie an der XSD-Prüfung (1, 2) bzw. an der Wohlgeformtheit (3)
- [ ] Angenommen Demo-Testdatei 4 wird hochgeladen, wenn geprüft wird, dann besteht sie die XSD-Prüfung und scheitert am Regelwerk (PROJ-8)

## Edge Cases
- **Viele Fehler (z. B. > 100):** Anzeige gekürzt mit „… und N weitere", Download enthält alle.
- **Datei mit BOM oder anderer Kodierung (ISO-8859-1 mit XML-Deklaration):** xmllint wertet die Deklaration aus; ungültige Kodierung → Wohlgeformtheitsfehler.
- **Externe Verweise in der Datei (DTD, Entities aus dem Internet):** werden nicht nachgeladen; Prüfung offline.
- **Schema-Datei fehlt oder ist beschädigt:** wie „Prüfung nicht verfügbar".
- **Langsame Prüfung (große Datei):** Fortschrittsanzeige; Abbruch nach Zeitlimit mit „Prüfung hat zu lange gedauert".
- **System-Issue wird geändert:** nur möglich, solange kein Workflow verwendet wurde (PROJ-5); danach bleibt das Schema fest.

## Technical Requirements (optional)
- Prüfung serverseitig (xmllint läuft nicht im Browser)
- Offline-fähig, keine Nachladung aus dem Internet
- Prüfung einer Datei mit 1.000 Einträgen in wenigen Sekunden
- Hochgeladene Dateien werden nur für die Prüfung verwendet und nicht dauerhaft auf dem Server gespeichert

## Open Questions
- [ ] Wie wird xmllint auf dem Deploy-Ziel (Vercel) bereitgestellt? (→ `/architecture`)
- [ ] Gültige Demo-Dateien für Issue 4.2 und 5.0 entstehen erst durch SEND (PROJ-12) — eigene Beispieldateien vom Product Owner?

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| XSD-Prüfung bei REPLY (vor PROJ-8), SEND (vor Download/Archiv) und XML-Export | Jede XML, die die Anwendung verlässt oder betritt, ist schemakonform | 2026-11-12 |
| Schema immer nach Issue des Systems | Eindeutig; falsches Issue fällt automatisch auf | 2026-11-12 |
| Prüfung nicht verfügbar → Vorgang blockiert | PRD: Validierung ist Pflicht | 2026-11-12 |
| xmllint-Meldungen im Original, deutsche Überschrift | Eindeutig für Partner und Fachleute | 2026-11-12 |
| Bericht herunterladbar | Weitergabe an den Partner | 2026-11-12 |
| Keine eigenständige „XML prüfen"-Funktion im MVP | Prüfung läuft in allen Workflows; REPLY-Abbruch ist folgenlos | 2026-11-12 |
| Demo-Testdateien mit typischen Fehlern | PRD-Erfolgskriterium: fehlerhafte Dateien zuverlässig erkannt | 2026-11-12 |
| Lokale `xml.xsd` für Issue 5.0 | Offline-Validierung mit `xmllint --nonet` | 2026-11-12 |

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
