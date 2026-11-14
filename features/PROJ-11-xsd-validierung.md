# PROJ-11: XSD-Validierung

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-14

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
- [x] Wie wird xmllint bereitgestellt? → Installiertes xmllint-Programm, aufgerufen von einer Serverfunktion (Vorgabe Product Owner, 2026-11-12)
- [x] Deployment → vorerst nur lokaler Betrieb auf einem Rechner mit macOS, Windows 11 oder Linux; kein Vercel (Vorgabe Product Owner, 2026-11-12)
- [x] Zugriffsschutz der Serverfunktion → nicht nötig, da nur lokal betrieben; App wird nur auf dem eigenen Rechner (localhost) erreichbar gestartet (2026-11-12)
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
| Kein wohlgeformtes XML: genau ein Fehler, weitere xmllint-Meldungen nur als Hinweise | Fehlerzahl bleibt aussagekräftig (Folgefehler); bestätigt durch Product Owner | 2026-11-13 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Installiertes xmllint-Programm (libxml2), aufgerufen aus einer Next.js-Serverfunktion | Vorgabe Product Owner (statt WebAssembly-Variante) | 2026-11-12 |
| xmllint offline, ohne Shell, feste Argumente, Zeitlimit, max. 5 MB | Sicherheit und Stabilität | 2026-11-12 |
| Schemapfad nur aus Issue-Whitelist (2.3/4.2/5.0) | Kein Pfad aus Benutzereingaben | 2026-11-12 |
| Programmpfad per Einstellung änderbar (Standard: Systempfad) | Windows-Betrieb | 2026-11-12 |
| Betrieb nur lokal (macOS, Windows 11, Linux), App nur unter localhost erreichbar; kein Zugriffsschutz der Serverfunktion | Vorgabe Product Owner; kein Vercel | 2026-11-12 |
| Strukturiertes Ergebnis (gültig / Schemafehler / nicht wohlgeformt / nicht verfügbar) → gemeinsamer Prüfbericht | Einheitliche Anzeige (PROJ-8) | 2026-11-12 |
| Kein Speichern/Protokollieren von Dateiinhalten auf dem Server | Datenschutz, Prototyp | 2026-11-12 |
| Integrationstests mit echtem xmllint, übersprungen wenn nicht installiert | Reale Prüfung, lauffähig auf jedem Rechner | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Die XSD-Prüfung ist der **einzige Server-Baustein** der Anwendung. Eine Serverfunktion der Next.js-App nimmt eine XML-Datei und das S1000D-Issue entgegen, ruft das **auf dem Rechner installierte xmllint-Programm** gegen das passende `dml.xsd` auf und liefert ein strukturiertes Ergebnis zurück. Im Browser übersetzt ein **XSD-Prüfdienst** das Ergebnis in den gemeinsamen Prüfbericht (PROJ-8). Daten werden auf dem Server nicht gespeichert.

### A) Ablauf
```
Browser                                         Server (Next.js-Serverfunktion)
SEND / Export / Freigabestand: erzeugte XML ─┐
REPLY: hochgeladene XML ─────────────────────┤
                                              ▼
XSD-Prüfdienst ──(XML-Text + Issue)──►  XSD-Prüfung
                                          +-- Issue prüfen (nur 2.3 / 4.2 / 5.0)
                                          +-- Schema wählen: schemas/s1000d/issue-X/dml.xsd
                                          +-- xmllint aufrufen (offline, mit Zeitlimit)
                                          +-- Ausgabe auswerten: gültig / Schemafehler / kein gültiges XML
               ◄──(Ergebnis)───────────  +-- nicht verfügbar (xmllint fehlt, Schema fehlt, Zeitlimit)
Prüfbericht (PROJ-8-Anzeige) bzw. weiter zum nächsten Schritt
```

### B) Komponentenstruktur (Anzeige)
Keine eigene Seite. Das Ergebnis erscheint in den Dialogen der aufrufenden Features:
```
REPLY-/SEND-/Export-Dialog
+-- „Schemaprüfung läuft…" (Fortschritt)
+-- bestanden: Hinweis „XSD-Prüfung bestanden (S1000D Issue X)" → nächster Schritt
+-- Fehler: Prüfbericht-Anzeige (PROJ-8)
|   +-- Überschrift „Die Datei entspricht nicht dem Schema S1000D Issue X (dml.xsd) — n Fehler"
|   +-- je Fehler: Zeile · Originalmeldung von xmllint · „Bericht herunterladen"
+-- kein gültiges XML: „Die Datei ist kein gültiges XML (Zeile X)"
+-- nicht verfügbar: Fehlermeldung „XSD-Prüfung nicht verfügbar — … Bitte Administrator informieren." (Vorgang blockiert)
```

### C) Datenmodell (in Klartext)
Nichts wird gespeichert. **Ergebnis einer Prüfung:** Zustand (gültig / Schemafehler / nicht wohlgeformt / nicht verfügbar), geprüftes Issue, Liste der Befunde (Zeile, Originalmeldung). Der Prüfdienst wandelt es in Befunde des gemeinsamen Prüfberichts um (Regelgruppe „XSD").

### D) Server-Baustein
| Aspekt | Festlegung |
|---|---|
| Aufruf | eine Serverfunktion („XSD-Prüfung") der App; Eingabe XML-Text + Issue |
| Programm | installiertes **xmllint** (libxml2); Pfad über eine Einstellung änderbar (Standard: `xmllint` im Systempfad) — nötig z. B. unter Windows |
| Schemas | `schemas/s1000d/issue-2.3 | 4.2 | 5.0/dml.xsd` aus dem Projekt; 5.0 mit lokaler `xml.xsd` |
| Offline | Prüfung ohne Netzzugriff; externe Verweise in Dateien werden nicht nachgeladen |
| Zeitlimit | Abbruch nach festem Zeitlimit (z. B. 20 Sekunden) → „Prüfung hat zu lange gedauert" |
| Größe | max. 5 MB je Prüfung |
| Fehlerfall | Programm nicht gefunden, Schema fehlt oder unerwartete Ausgabe → Zustand „nicht verfügbar" |
| Temporäres | ggf. benötigte Zwischendateien werden sofort wieder gelöscht |

### E) Sicherheit
- Nur die drei bekannten Issue-Werte werden angenommen; der Schema-Pfad wird daraus gebildet, nie aus Benutzereingaben.
- xmllint wird ohne Kommandozeilen-Shell und mit festen Argumenten gestartet (keine Befehlseinschleusung möglich).
- Kein Nachladen externer Ressourcen; Größen- und Zeitlimit gegen überlange Dateien.
- Inhalte werden nicht protokolliert oder gespeichert.
- Prototyp ohne echte Anmeldung: die Serverfunktion ist nicht zugriffsgeschützt — akzeptabel, da die App nur lokal auf dem eigenen Rechner (localhost) läuft.

### F) Betrieb
- **Voraussetzung:** xmllint muss auf dem Rechner bzw. Server installiert sein (macOS: vorinstalliert; Linux: Paket libxml2-utils; Windows: libxml2-Binärpaket). Eine kurze Installationsanleitung kommt in die Projektdokumentation.
- **Betrieb:** vorerst **nur lokal** auf einem Rechner mit **macOS, Windows 11 oder Linux** (`npm run build` + `npm run start`, erreichbar nur unter localhost). Kein Vercel — dort gäbe es kein xmllint.

### G) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Installiertes xmllint statt WebAssembly-Variante | Vorgabe Product Owner; identisch mit dem Werkzeug, das Partner und Fachleute nutzen. |
| Eine Serverfunktion in der Next.js-App | xmllint läuft nicht im Browser; kein separater Dienst nötig. |
| Schema immer aus dem Issue des Systems | Eindeutig, sicher (kein Pfad aus Benutzereingabe). |
| Strukturiertes Ergebnis statt Rohtext | Gemeinsame Prüfbericht-Anzeige (PROJ-8) kann es darstellen. |
| Zustand „nicht verfügbar" blockiert den Vorgang | PRD: Prüfung ist Pflicht. |
| Pfad zu xmllint einstellbar | Funktioniert auch unter Windows ohne Systempfad-Eintrag. |

### H) Abhängigkeiten (Pakete)
- **Keine neuen npm-Pakete.** Systemvoraussetzung: **xmllint** (libxml2) auf dem Rechner/Server.

### I) Testbarkeit
- Integrationstests mit echtem xmllint: PHUNGUN-Dateien gültig (2.3), S1000DBIKE-Beispiel gültig (4.2), leere/fehlerhafte Dateien → Schemafehler, kaputtes XML → nicht wohlgeformt, unbekanntes Issue abgelehnt, falscher Programmpfad → nicht verfügbar. Tests werden übersprungen (mit Hinweis), wenn xmllint auf dem Testrechner fehlt.
- Demo-Testdateien (PROJ-1): 1–3 scheitern wie erwartet, 4 und Demo-REPLY bestehen.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend` (PROJ-11)_

**Umgesetzt (Browser-Seite)**
- `src/lib/xsd/types.ts` — **Vertrag zur Serverfunktion**: `POST /api/xsd-pruefung?issue=2.3|4.2|5.0`, Body = XML-Datei roh (höchstens 5 MB); Antwort JSON mit Zustand `gueltig` / `schemafehler` (Zeile + Originalmeldung je Fehler) / `nicht_wohlgeformt` / `nicht_verfuegbar` (Grund: `programm_fehlt`, `schema_fehlt`, `zeitlimit`, `unerwartet`, `nicht_erreichbar`). Die Antwort wird mit Zod geprüft.
- `src/lib/xsd/client.ts` — XSD-Prüfdienst `validateXml(xml, issue)`: wirft nie; Netzfehler, fehlende Serverfunktion, unerwartete Antwort und Zeitlimit (30 s im Browser) ergeben „nicht verfügbar" → Vorgang blockiert. Übersetzung in den gemeinsamen Prüfbericht (Regelgruppe „XSD", Bezug „Zeile"), deutsche Überschriften, Dateiannahme REPLY (`.xml`, höchstens 5 MB, nicht leer). Die Datei wird roh übertragen, damit xmllint die Kodierung aus der XML-Deklaration auswertet.
- `src/components/check/xsd-check-panel.tsx` — Anzeige für die Dialoge von SEND, REPLY und Export: „Schemaprüfung läuft …", „XSD-Prüfung bestanden (S1000D Issue X)", Prüfbericht (PROJ-8-Anzeige mit Download, „… und N weitere") bzw. „XSD-Prüfung nicht verfügbar …" mit Grund und ohne Weiter-Möglichkeit; `xsdPassed()` für die aufrufenden Dialoge.

**Tests**: `client.test.ts` (9), `xsd-check-panel.test.tsx` (5).

**Hinweise**
- Kein wohlgeformtes XML: ein Fehler „Die Datei ist kein gültiges XML (Zeile X) — {xmllint-Meldung}"; Folgemeldungen von xmllint erscheinen als Hinweise, damit die Fehlerzahl nicht künstlich steigt.
- Sichtbar wird die Prüfung erst mit SEND, REPLY und Export (PROJ-12, 13, 18).

## Implementation Notes (Backend)
_Stand 2026-11-13 — `/backend` (PROJ-11)_

**Umgesetzt**
- `src/app/api/xsd-pruefung/route.ts` — Serverfunktion `POST /api/xsd-pruefung?issue=…` (Node.js-Laufzeit, nicht zwischengespeichert). Issue per Zod gegen die Whitelist 2.3/4.2/5.0 geprüft (sonst 400), leere Datei 400, über 5 MB 413. Antwort: Ergebnis laut Vertrag (`src/lib/xsd/types.ts`), Status 200 bzw. 503 bei „nicht verfügbar".
- `src/lib/xsd/server/xmllint.ts` — Aufruf `xmllint --noout --nonet --schema schemas/s1000d/issue-X/dml.xsd -`:
  - Datei über die Standardeingabe → **keine Zwischendateien**, nichts wird gespeichert oder protokolliert.
  - ohne Shell, feste Argumente, Schemapfad nur aus dem Issue; offline (`--nonet`), keine Ersetzung externer Entities (geprüft: kein Lesen lokaler Dateien über `<!ENTITY … SYSTEM>`).
  - Zeitlimit 20 s (Prozess wird beendet → „zeitlimit"), Ausgabe auf 4 MB begrenzt.
  - Auswertung der Exit-Codes: 0 gültig · 3/4 Schemafehler · 1 mit „parser error" nicht wohlgeformt · 5 Schema fehlt · Programm nicht gefunden → `programm_fehlt` · alles andere → `unerwartet`. Meldungsformat von libxml2 2.9 und 2.13+ wird erkannt.

**Einstellung**
- `XMLLINT_PATH` (optional): Pfad zum xmllint-Programm, Standard `xmllint` im Systempfad — z. B. unter Windows `C:\\libxml2\\bin\\xmllint.exe`. Wird vom Python-Startskript (PROJ-19) gesetzt bzw. geprüft. _(Eintrag in `.env.local.example` steht noch aus — Zugriff auf `.env`-Dateien ist für die KI gesperrt.)_
- Die Schemas werden relativ zum Arbeitsverzeichnis gesucht (`schemas/s1000d/…`); die App muss daher aus dem Projektordner gestartet werden (PROJ-19).

**Sicherheit**
- Kein Zugriffsschutz (lokaler Betrieb, siehe Decision Log). Zusätzlich werden Browser-Anfragen fremder Webseiten (Origin ≠ eigener Host) mit 403 abgewiesen, damit eine fremde Seite die lokale Prüffunktion nicht nutzen kann.
- **Host-Prüfung (BUG-QA2-3, 2026-11-14):** Der Host-Kopf muss `localhost`, `127.0.0.1` oder `[::1]` sein (beliebiger Port), sonst 403. Das verhindert DNS-Rebinding: Eine fremde Domain, die auf 127.0.0.1 zeigt, schickt ihren eigenen Namen als Host und Origin mit — beide Köpfe passten bisher zueinander, die Anfrage wurde angenommen. Fehlt der Host-Kopf, wird ebenfalls abgewiesen. Zwei zusätzliche Tests in `route.test.ts` (fremde Hosts → 403, lokale Hosts → durchgelassen).

**Tests**: `xmllint.test.ts` (9, mit echtem xmllint; übersprungen, wenn nicht installiert), `route.test.ts` (5). Geprüft: Demo-REPLY und Testdatei 4 gültig; S1000DBIKE 4.2/5.0 gültig (5.0 offline); Testdatei 1 und 2 sowie 4.2-Datei gegen 2.3 → Schemafehler; Testdatei 3 → nicht wohlgeformt (Zeile 987); Programm fehlt, Schema fehlt, Zeitlimit → nicht verfügbar. Rauchtest am laufenden Produktionsserver bestanden. Insgesamt 308 Unit-Tests grün.

## QA Test Results

**Tested:** 2026-11-13
**App URL:** http://localhost:3000 (`npm run dev`); PROJ-19 zusätzlich Produktionsstart über `scripts/start.py`
**Tester:** QA Engineer (AI)
**Testumfang:** gemeinsamer QA-Lauf PROJ-7 bis PROJ-19
**Automatisiert:** Vitest 424 Tests ✅ · Startskript 12 Tests ✅ · Playwright 62/63 ✅ (1 ausstehend: BUG-QA2-4) — 58 Regressionstests + 5 neue QA-Tests (Chrome über `PW_CHANNEL=chrome`)
**Echte XSD-Prüfung:** xmllint (libxml2 2.9.13) in Unit-, Integrations- und E2E-Tests
**Browser:** Chrome (Desktop) getestet · Firefox und Safari **nicht getestet** (Playwright-Browser für diese Version nicht installiert)
**Responsive:** 375 px für alle Workflow-Seiten und Dialoge, 375/768/1440 px für die übrigen Seiten — kein waagerechtes Scrollen der Seite

### Acceptance Criteria Status
- [x] Schema-Auswahl (4/4): 2.3/4.2/5.0, 4.2-Datei gegen 2.3 abgelehnt, 5.0 offline — Integration mit xmllint
- [x] REPLY (5/5), SEND/Export (3/3), Nicht verfügbar (1/1), Demo (2/2) — Unit, Integration, E2E (`PROJ-13-reply.spec.ts` Testdateien 1–4)

### Edge Cases Status
- [x] > 100 Fehler gekürzt; Kodierung laut Deklaration; externe Verweise nicht nachgeladen (XXE-Test); Schema fehlt → nicht verfügbar; Zeitlimit; Issue fest nach Workflow

### Security Audit Results
- [x] Zugriff ohne Anmeldung → Anmeldeseite; ohne Berechtigung → „Keine Berechtigung" auch für Unterseiten (Archiv, archivierter Stand, Freigabestand) (E2E `QA-proj7-19.spec.ts`)
- [x] XSS: HTML/Script in Partner-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar
- [x] Pfad-Manipulation über `issue` abgewiesen (400), > 5 MB auch ohne Längenangabe abgewiesen (413), fremde Herkunft (Origin) → 403, keine Shell, keine Entity-Ersetzung
- [x] **BUG-QA2-3 (Low) — behoben 2026-11-14:** Host-Kopf wird nicht geprüft — bei DNS-Rebinding (Host = Origin = fremde Domain, die auf 127.0.0.1 zeigt) wird die Anfrage angenommen

### Bugs Found

#### BUG-QA2-3: Serverfunktion prüft den Host-Kopf nicht (DNS-Rebinding)
- **Severity:** Low (Sicherheit)
- **Steps to Reproduce:**
  1. `curl -X POST -H "Host: angreifer.example:3000" -H "Origin: http://angreifer.example:3000" --data-binary @datei.xml "http://localhost:3000/api/xsd-pruefung?issue=2.3"`
  2. Expected: 403 (nur `localhost`/`127.0.0.1` als Host zulässig)
  3. Actual: 200 mit Prüfergebnis
- **Auswirkung:** Eine fremde Webseite könnte die lokale Prüffunktion nutzen (Rechenlast); kein Zugriff auf Anwendungsdaten (liegen im Browser, an die Adresse gebunden)
- **Priority:** Nice to have
- **Status:** Behoben 2026-11-14 — nur lokale Hostnamen zulässig; Nachstellung mit curl liefert jetzt 403, lokale Anfragen weiter 200. Bestätigung durch `/qa` ausstehend.

### Summary
- **Acceptance Criteria:** 15/15 passed
- **Bugs Found:** 1 total (0 critical, 0 high, 0 medium, 1 low)
- **Security:** Issues found (siehe Bugs)
- **Production Ready:** YES (keine Critical/High-Bugs)

### Re-Test 2026-11-14 (Bestätigung der Bugfixes)
- [x] **BUG-QA2-3 bestätigt behoben:** Nachstellung aus dem Fehlerbericht (Host = Origin = `angreifer.example:3000`) → 403; lokale Anfragen (`localhost`, `127.0.0.1`, `[::1]`) → 200 mit Prüfergebnis
- [x] Umgehungsversuche abgewiesen (403): `localhost:3000@angreifer.example`, `angreifer.example#localhost`, `localhost.angreifer.example`, `127.0.0.1.nip.io`, fremder Host mit `X-Forwarded-Host: localhost`, fehlender Host-Kopf, lokaler Host mit fremdem Origin bzw. `Origin: null`
- [x] Harmlos durchgelassen: `LOCALHOST`, `127.0.0.1.` (werden zu lokalen Adressen normalisiert; eine IP-Adresse lässt sich nicht per DNS umleiten)
- Automatisierte Tests: 432 Unit-Tests (48 Dateien) und 69 E2E-Tests (Chromium/Chrome) grün — keine Regressionen
- Nicht getestet: Firefox und Safari (nicht installiert)

**Ergebnis Re-Test**
- **Acceptance Criteria:** 15/15 passed
- **Offene Bugs:** keine
- **Security:** Pass
- **Production Ready:** YES

## Deployment
_To be added by /deploy_
