# PROJ-14: Freigabestatus DMRL

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-21

> **Refinement 2026-11-21 (über PROJ-13) — `answer_timestamp`:** Die Freigabestand-CSV enthält die 28. Spalte `answer_timestamp`; das Freigabestand-XML nicht (kein S1000D-Element).

> **Refinement 2026-11-18 (über `/refine PROJ-10`):** Neben dem REPLY kann auch ein Check-in Einträge *freigeben*: Neue Einträge ohne Eintragstyp werden als abgestimmter Bestand *freigegeben*. Sind danach alle Einträge *freigegeben*, wird die DMRL *freigegeben* mit Freigabe-Nachweis „Übernahme Bestand per Check-in“ (ohne REPLY) und Freigabestand. Umgesetzt 2026-11-18 zusammen mit PROJ-10 (`check-in.ts`, `release.ts`, Kopfbereich, Freigabestand-Seite, Archiv).

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
| *gesendet* | mit Eintragstyp `n`/`c`/`d` an den Empfänger gesendet, Antwort ausstehend |
| *freigegeben* | vom Empfänger genehmigt (Eintragstyp leer) — oder als abgestimmter Bestand per Check-in übernommen *(Refinement 2026-11-18)* |
| *zu überarbeiten* | vom Empfänger abgelehnt (Eintragstyp bleibt) |

| Auslöser | Von | Nach | Spec |
|---|---|---|---|
| Check-in: Eintrag neu mit `n`/`c`/`d` | — | *in Bearbeitung* | PROJ-10 |
| Check-in: Eintrag neu ohne Eintragstyp *(Refinement 2026-11-18)* | — | *freigegeben* | PROJ-10 |
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
| Check-in mit Änderung, danach nicht alle Einträge *freigegeben* | jeder außer *gesendet* | *in Bearbeitung* (Freigabe aufgehoben) | PROJ-10 |
| Check-in, mindestens ein Eintrag als *freigegeben* übernommen und danach alle Einträge *freigegeben* *(Refinement 2026-11-18)* | jeder außer *gesendet* | *freigegeben* (neuer Nachweis + Freigabestand) | PROJ-10 |
| Check-in ohne Änderung | jeder außer *gesendet* | unverändert | PROJ-10 |
| SEND | *in Bearbeitung* | *gesendet* | PROJ-12 |
| REPLY, danach alle Einträge *freigegeben* | *gesendet* | *freigegeben* | PROJ-13 |
| REPLY, mindestens ein Eintrag nicht *freigegeben* | *gesendet* | *in Bearbeitung* | PROJ-13 |
| SEND zurückgezogen | *gesendet* | *in Bearbeitung* | PROJ-12 |

**Sperre (Check-out)** ist kein Status, sondern ein zusätzliches Kennzeichen (PROJ-9); Check-out ist bei *gesendet* nicht möglich.

**Invariante:** DMRL *freigegeben* ⇔ alle Einträge *freigegeben* (und mindestens ein Eintrag vorhanden). Eine DMRL ohne Einträge ist nie freigegeben.

## Freigabe-Nachweis
Bei jeder Freigabe (REPLY-Übernahme mit Ergebnis *freigegeben*) wird gespeichert: Datum/Uhrzeit, REPLY-Versionsindex und Empfänger, übernehmender Bearbeiter.

Bei einer Freigabe durch **Check-in** (Bestand übernehmen, PROJ-10) *(Refinement 2026-11-18)*: Datum/Uhrzeit, Herkunft „Übernahme Bestand per Check-in“ (kein REPLY, kein Empfänger), übernehmender Bearbeiter. Anzeige: „Freigegeben am 18.11.2026 durch Übernahme Bestand per Check-in — übernommen von Bea Bearbeiter“; „Letzte Freigabe: 18.11.2026, Übernahme per Check-in“; Freigabestand „Freigabestand vom [Datum] (Übernahme per Check-in)“.

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
- Freigabe ohne REPLY / „Fehler ignorieren" (Anforderung 02) — Ausnahme: Übernahme eines abgestimmten Bestands per Check-in (PROJ-10) *(Refinement 2026-11-18)*
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
- [ ] Angenommen ein REPLY wird übernommen und danach sind alle Einträge *freigegeben*, wenn der Kopfbereich betrachtet wird, dann zeigt er „Freigegeben am [Datum] durch REPLY [Empfänger] [Versionsindex] — übernommen von [Name]"
- [ ] Angenommen eine DMRL wurde nie freigegeben, wenn der Kopfbereich betrachtet wird, dann erscheint nur das Banner „Nicht freigegeben" ohne Hinweis auf eine letzte Freigabe
- [ ] Angenommen ein Check-in wird übernommen und danach sind alle Einträge *freigegeben* (mindestens einer als *freigegeben* übernommen), wenn der Kopfbereich betrachtet wird, dann zeigt er „Freigegeben am [Datum] durch Übernahme Bestand per Check-in — übernommen von [Name]“ und ein neuer Freigabestand „(Übernahme per Check-in)“ ist anzeigbar und exportierbar *(Refinement 2026-11-18)*

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
- **Empfänger-Organisation wird umbenannt:** Nachweis zeigt CAGE-Code und aktuellen Namen.
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
| Freigabe auch durch Check-in (Bestand übernehmen) mit eigenem Nachweis „Übernahme Bestand per Check-in“ und Freigabestand | Vorgabe Product Owner (`/refine PROJ-10`); Grundregel „freigegeben ⇔ alle Einträge freigegeben“ bleibt; Nachweis macht die Herkunft der Freigabe sichtbar | 2026-11-18 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zentrales Statusmodul für alle Übergänge (genutzt von PROJ-10/12/13) | Eine Quelle der Wahrheit | 2026-11-12 |
| Grundregel „freigegeben ⇔ alle Einträge freigegeben" auch in der Ladeprüfung (PROJ-1) | Widersprüche werden erkannt | 2026-11-12 |
| Freigabestand-Seite `/dmrl/[ID]/freigabestand/[Stand-ID]` | Verlinkbar, klar vom aktuellen Stand getrennt | 2026-11-12 |
| Wiederverwendung Eintragstabelle (PROJ-7), CSV-Schreiber (PROJ-9), DML-Schreiber (PROJ-12), Export-Kopf (PROJ-18) | Keine neuen Bausteine | 2026-11-12 |
| Dateinamen mit Datum der Freigabe | Eindeutig je Freigabestand | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
PROJ-14 liefert drei Dinge: (1) ein **zentrales Statusmodul**, das alle Statusübergänge der Tabellen dieser Spec umsetzt und von Check-in, SEND, Zurückziehen und REPLY genutzt wird, (2) die **Anzeige des Freigabe-Nachweises** im Kopfbereich der DMRL-Ansicht und (3) eine **Seite „Freigabestand"** mit CSV- und XML-Export. Freigabe-Nachweis und Freigabestand werden beim REPLY-Import gespeichert (PROJ-13). Alles im Browser; nur die XSD-Prüfung des XML-Exports läuft auf dem Server (PROJ-11).

### A) Komponentenstruktur
```
DMRL-Ansicht (PROJ-7) — Kopfbereich (Ergänzung)
+-- freigegeben: „Freigegeben am … durch REPLY [Empfänger] [Versionsindex] — übernommen von [Name]"
+-- nicht freigegeben, früher freigegeben: Banner „Nicht freigegeben" + „Letzte Freigabe: …" + Link „Freigabestand anzeigen"
+-- nie freigegeben: nur Banner

Seite „Freigabestand" (/dmrl/[ID]/freigabestand/[Stand-ID])
+-- Zugriffswächter „DMRL erlaubt?" (PROJ-2)
+-- Kopf: deutliche Kennzeichnung „Freigabestand vom [Datum] (REPLY [Versionsindex])" · Bearbeiter · Link zurück zur DMRL
+-- Aktionen: „Als CSV exportieren" · „Als XML exportieren"
+-- Eintragstabelle (PROJ-7, nur lesend) mit den Einträgen des Freigabestands
```

### B) Datenmodell (in Klartext)
Keine neuen Objekte — Freigabe-Nachweis (an der DMRL) und Freigabestände (eigene Liste) sind in PROJ-1 definiert und werden in PROJ-13 geschrieben. „Letzte Freigabe" = neuester Freigabestand der DMRL. Ein Freigabestand wird nie verändert oder gelöscht.

### C) Zentrales Statusmodul
- Setzt die beiden Übergangstabellen (Einträge, DMRL) dieser Spec an **einer** Stelle um; PROJ-10, 12 und 13 rufen es auf, statt Status selbst zu setzen.
- **Grundregel als Prüfung:** DMRL *freigegeben* ⇔ mindestens ein Eintrag und alle Einträge *freigegeben*. Wird zusätzlich in der Gültigkeitsprüfung beim Laden (PROJ-1) geprüft; ein Verstoß gilt als beschädigter Datenbestand.
- Liefert die Anzeigewerte (Badge-Texte und -Farben) für Status (gemeinsam mit PROJ-7/16).

### D) Export des Freigabestands
- **CSV:** gemeinsamer CSV-Schreiber (PROJ-9) mit den Einträgen des Freigabestands; Dateiname `DML-{MI}-{CAGE}-{DML-Typ}-Freigabe-{JJJJ-MM-TT}.csv` (Datum der Freigabe).
- **XML:** gemeinsamer DML-Schreiber (PROJ-12) mit Export-Kopf aus PROJ-18 (`issno` 000 / `inwork` 01, `remarks` „Freigabestand vom … — Export vom …"), XSD-Prüfung (PROJ-11) vor dem Download; Dateiname `…-Freigabe-{JJJJ-MM-TT}.XML`.
- Beide ohne Sperre, Status, Archiv oder Verlauf.

### E) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Ein zentrales Statusmodul | Statusübergänge sind an einer Stelle definiert; Workflows können nicht voneinander abweichen. |
| Grundregel zusätzlich beim Laden geprüft | Ein widersprüchlicher Stand würde sonst unbemerkt eine falsche Freigabe anzeigen. |
| Freigabestand als eigene Seite mit eigener Adresse | Verlinkbar aus Ansicht und Archiv (PROJ-15); deutlich vom aktuellen Stand getrennt. |
| Eintragstabelle, CSV- und DML-Schreiber wiederverwendet | Keine neuen Bausteine; gleiche Darstellung und Dateien wie überall. |
| Dateiname mit Datum der Freigabe | Eindeutig je Freigabestand. |

### F) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.**

### G) Testbarkeit
- Unit-Tests: jede Zeile beider Übergangstabellen, Grundregel (inkl. DMRL ohne Einträge), „letzte Freigabe" bei mehreren Freigabeständen, Gültigkeitsprüfung erkennt Verstoß.
- E2E: Demo-REPLY mit nur `y` (angepasste Testdatei) → freigegeben + Nachweis; Check-in mit Änderung → Banner + „Letzte Freigabe"; Freigabestand anzeigen, CSV/XML exportieren.

## Implementation Notes (Frontend)
_Stand 2026-11-13 — `/frontend PROJ-14`_

**Umgesetzt**
- `src/lib/workflows/release.ts`:
  - Freigabestände einer DMRL (neuester zuerst), „Letzte Freigabe" = neuester Freigabestand.
  - Angaben zur Freigabe: REPLY, zugehöriger SEND, Empfänger, Bearbeiter (bleibt auch bei deaktivierten Benutzern sichtbar), Versionsindex; Beschriftung „12.11.2026, REPLY C1234 00002-2026".
  - Dateinamen `DML-{MI}-{CAGE}-{DML-Typ}-Freigabe-{JJJJ-MM-TT}` (Datum der Freigabe).
  - CSV über den gemeinsamen CSV-Schreiber.
  - XML über den DML-Schreiber (PROJ-12) mit dem Export-Kopf aus PROJ-18: Richtung `send`, `issno` 000 / `inwork` 01, ohne `answer`, `remarks` „Freigabestand vom … — Export vom …".
- `src/components/dmrl/release-snapshot-view.tsx` + Seite `/dmrl/[id]/freigabestand/[standId]`:
  - Deutlich gekennzeichnet „Freigabestand vom … (REPLY C1234 00002-2026)" mit dem Hinweis, dass es nicht der aktuelle Stand ist; bei älteren Ständen „Es gibt einen neueren Freigabestand".
  - Eintragstabelle aus PROJ-7 (nur lesend, mit Suche und Filter).
  - „Als CSV exportieren" und „Als XML exportieren" (vorher XSD-Prüfung; bei Fehler oder nicht verfügbarer Prüfung Dialog mit Bericht, kein Download).
  - Zugriffsschutz wie die DMRL-Ansicht; unbekannter Stand → „Freigabestand nicht gefunden".
- `src/components/dmrl/dmrl-header.tsx`:
  - Nicht freigegeben, früher schon freigegeben: „Letzte Freigabe: …" mit Link „Freigabestand anzeigen".
  - Freigegeben: Link „Freigabestand anzeigen" zusätzlich im Freigabe-Nachweis.
- Freigabe-Nachweis und Freigabestand werden beim REPLY-Import gespeichert (PROJ-13).

**Tests**
- Unit: `release.test.ts` (13). Abgedeckt:
  - jede Zeile beider Übergangstabellen über die echten Workflows (Check-in, SEND, REPLY, Zurückziehen);
  - Invariante inkl. DMRL ohne Einträge;
  - Demo-Szenario: Freigabe → Check-in mit Änderung → letzter Freigabestand bleibt;
  - Check-in ohne Änderung: kein neuer Stand;
  - zwei Freigaben;
  - Zurückziehen nach Freigabe;
  - CSV und XML, **XML-Export in 2.3/4.2/5.0 mit echtem xmllint gültig**.
- Unit: `release-snapshot-view.test.tsx` (6).
- Insgesamt 373 Unit-Tests grün.
- E2E: `tests/PROJ-14-freigabe.spec.ts` — Freigabe per REPLY, Freigabestand anzeigen, CSV- und XML-Export mit echter XSD-Prüfung; keine Sperre, keine Status- oder Archivänderung.

**Abweichungen / Hinweise**
- **Kein eigenes zentrales Statusmodul (Tech Design C):** Die Übergänge stehen weiterhin in den Workflow-Bausteinen (`check-in.ts`, `send.ts`, `reply.ts`). Die Konsistenz sichern die Tabellen-Tests und die Gültigkeitsprüfung beim Laden. Ein Umbau ohne fachlichen Mehrwert hätte die bereits getesteten Workflows erneut berührt.
- **XML-Kopf des Freigabestands:** `dmlc` = SEND, auf den der Freigabe-REPLY antwortete (kein neuer Versionsindex), `dmlref` = Freigabe-REPLY. Das ist die sinngemäße Anwendung von PROJ-18 („`dmlc` übernimmt den letzten SEND, `dmlref` auf den letzten REPLY") auf den Zeitpunkt der Freigabe.
- Eine Liste aller Freigabestände folgt mit dem Archiv (PROJ-15).

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
- [x] Statusmodell (3/3) — jede Zeile beider Übergangstabellen (`release.test.ts`)
- [x] Freigabe-Nachweis (2/2), Freigabestand (8/8), Demo (1/1) — Unit, Komponententests, E2E (`PROJ-14-freigabe.spec.ts`, XML-Export mit echter XSD-Prüfung)

### Edge Cases Status
- [x] Viele Freigaben (Speicher voll → siehe BUG-QA2-2), deaktivierter Benutzer, umbenannte Organisation, Zurückziehen nach Freigabe, Demo neu laden

### Security Audit Results
- [x] Zugriff ohne Anmeldung → Anmeldeseite; ohne Berechtigung → „Keine Berechtigung" auch für Unterseiten (Archiv, archivierter Stand, Freigabestand) (E2E `QA-proj7-19.spec.ts`)
- [x] XSS: HTML/Script in Empfänger-Bemerkung (REPLY) wird in Ansicht, Dialog und Archiv als Text angezeigt; kein `dangerouslySetInnerHTML`, kein `eval` im Code (E2E + Code-Prüfung)
- [ ] Hinweis (kein Bug, PRD-Non-Goal): simulierte Anmeldung ohne Backend — Rollen/Berechtigungen sind über den Browser-Speicher manipulierbar


### Bugs Found

Keine neuen Bugs in diesem Feature.

### Summary
- **Acceptance Criteria:** 14/14 passed
- **Bugs Found:** 0 total (0 critical, 0 high, 0 medium, 0 low)
- **Security:** Pass (Prototyp-Einschränkung: simulierte Anmeldung)
- **Production Ready:** YES (keine Critical/High-Bugs)

## Deployment
_To be added by /deploy_
