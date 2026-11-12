# PROJ-15: Archiv SEND/REPLY

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-7 (DMRL-Ansicht) — Aktion „Archiv", Tabellendarstellung
- Requires: PROJ-12 (SEND), PROJ-13 (REPLY) — archivierte XML-Dateien
- Requires: PROJ-14 (Freigabestatus) — Freigabestände
- Requires: PROJ-9, PROJ-10 — Verlaufseinträge Check-out/Check-in
- Requires: PROJ-17 (Berechtigungen)
- Requires: PROJ-1 (Datenhaltung) — Demo-Archiv PHUNGUN

## Beschreibung
Das Archiv macht den Austausch mit dem Partner und alle Bearbeitungsschritte einer DMRL nachvollziehbar. Es zeigt je DMRL alle SEND- und REPLY-Stände (byte-genau herunterladbar und als Tabelle einsehbar), alle Freigabestände und einen chronologischen Workflow-Verlauf. Das Archiv ist nur lesend; nichts kann gelöscht werden (PRD: „Alle SEND- und REPLY-Stände werden dauerhaft archiviert").

## Aufbau
Archivseite je DMRL, erreichbar über die Aktion **„Archiv"** in der DMRL-Ansicht (PROJ-7). Kopf: System, MI, Issue, aktueller DMRL-Status. Drei Registerkarten:

### 1. Austausch
- Alle SENDs und REPLYs, neueste oben, als Kette (z. B. `SEND 00002-2026 → REPLY C1234 00001-2026 → SEND 00001-2026`)
- Je Eintrag: Richtung (SEND/REPLY), Versionsindex, Partner (CAGE + Name), Datum/Uhrzeit, Bearbeiter, Bezug (`dmlref`), Anzahl Einträge (bei REPLY: freigegeben/zu überarbeiten), Dateiname
- Zurückgezogene SENDs: Kennzeichen „zurückgezogen" mit Datum, Administrator und Begründung (PROJ-12)
- Aktionen:
  - **„Herunterladen"** — Original-XML, byte-genau, Original-Dateiname
  - **„Anzeigen"** — Inhalt als Tabelle wie PROJ-7 (nur lesend, Suche/Filter), Kopfdaten der Datei; bei REPLY mit Antwort und Kommentar je Eintrag sowie Partner-Bemerkung
- Leer: „Noch kein Austausch mit einem Partner"

### 2. Freigabestände
- Alle Freigabestände (PROJ-14), neueste oben: Datum, REPLY (Partner + Versionsindex), Bearbeiter, Anzahl Einträge
- Aktionen: „Anzeigen", „Als CSV exportieren", „Als XML exportieren" (wie PROJ-14)
- Leer: „Die DMRL wurde noch nie freigegeben"

### 3. Verlauf
Alle Workflow-Schritte chronologisch (neueste oben): Datum/Uhrzeit, Benutzer, Aktion, Details. Filter nach Aktionsart.

| Aktion | Details | Quelle |
|---|---|---|
| Check-out | — | PROJ-9 |
| Check-out zurückgenommen | — | PROJ-9 |
| Sperre aufgehoben durch Administrator | Sperrinhaber | PROJ-9 |
| Check-in | Anzahl neu/geändert/unverändert | PROJ-10 |
| Check-in abgelehnt | Anzahl Fehler | PROJ-10 |
| SEND | Versionsindex, Partner | PROJ-12 |
| SEND fehlgeschlagen | XSD-Prüfung | PROJ-12 |
| SEND zurückgezogen | Versionsindex, Begründung | PROJ-12 |
| REPLY übernommen | Versionsindex, Partner, Anzahl freigegeben/zu überarbeiten, ggf. „DMRL freigegeben" | PROJ-13 |
| REPLY abgelehnt | Dateiname, „XSD: n Fehler" bzw. „Regelwerk: n Fehler" | PROJ-13 |
| Kopfdaten geändert | Feld alt → neu (Sicherheitseinstufung, Originator, DML-Typ) | PROJ-6 |

Nicht protokolliert: abgebrochene Check-ins/REPLYs, Berechtigungsänderungen (PROJ-17), Exporte (PROJ-18), Prüfberichte selbst.

Leer: „Noch keine Workflow-Schritte"

## Zugriff
- Berechtigte Bearbeiter (PROJ-17) und Administratoren; nur lesend
- Nichts kann gelöscht oder geändert werden
- Archiv bleibt auch erhalten, wenn Benutzer deaktiviert oder Organisationen umbenannt werden (Namen werden aktuell angezeigt, CAGE-Code bleibt)

## Demo-Daten
- PHUNGUN: Austausch mit den 3 Beispieldateien (SEND 00001-2026, REPLY C1234 00001-2026, SEND 00002-2026) (PROJ-1)
- PHUNGUN-Verlauf: passende Einträge „SEND", „REPLY übernommen", „SEND" mit Demo-Bearbeiter und den Datumsangaben der Dateien
- Fahrzeug/Fluggerät: leeres Archiv

## User Stories
- Als **Bearbeiter** möchte ich alle SEND- und REPLY-Stände einer DMRL sehen, damit ich den Austausch mit dem Partner nachvollziehen kann.
- Als **Bearbeiter** möchte ich jede archivierte Datei unverändert herunterladen, damit ich sie erneut an den Partner senden oder als Nachweis verwenden kann.
- Als **Bearbeiter** möchte ich den Inhalt eines archivierten Stands als Tabelle einsehen, ohne die Datei herunterzuladen.
- Als **Bearbeiter** möchte ich im Verlauf sehen, wer wann ausgecheckt, eingecheckt, gesendet oder einen REPLY übernommen hat.
- Als **Bearbeiter** möchte ich frühere Freigabestände abrufen und exportieren.
- Als **Product Owner** möchte ich an PHUNGUN die vollständige Austauschkette vorführen.

## Out of Scope
- Archivübersicht über alle DMRLs → ggf. PROJ-16 (Dashboard)
- Vergleich (Diff) zweier Stände
- Löschen oder Bearbeiten von Archiveinträgen
- Speichern der Prüfberichte abgelehnter Dateien
- Archivierung der CSV-Dateien aus Check-out/Check-in
- Protokoll von Berechtigungsänderungen und Exporten
- Export des Verlaufs
- Volltextsuche über alle archivierten Dateien

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein berechtigter Bearbeiter öffnet die DMRL-Ansicht, wenn er „Archiv" wählt, dann öffnet sich die Archivseite mit den Registerkarten Austausch, Freigabestände, Verlauf
- [ ] Angenommen ein Bearbeiter ist für die DMRL nicht berechtigt, wenn er das Archiv direkt aufruft, dann erscheint „Keine Berechtigung"
- [ ] Angenommen das Archiv ist geöffnet, wenn es angezeigt wird, dann gibt es keine Aktion zum Löschen oder Ändern

### Austausch
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn das Archiv von PHUNGUN geöffnet wird, dann zeigt „Austausch" drei Einträge: SEND 00002-2026, REPLY C1234 00001-2026, SEND 00001-2026 (neueste oben) mit Partner, Datum, Bearbeiter, Bezug und Anzahl Einträge
- [ ] Angenommen ein archivierter Stand wird „Herunterladen", wenn die Datei gespeichert wird, dann ist sie byte-genau identisch mit der gesendeten bzw. importierten Datei und trägt den Original-Dateinamen
- [ ] Angenommen ein REPLY wird „Anzeigen", wenn die Tabelle geöffnet wird, dann zeigt sie alle Einträge mit Antwort und Kommentar sowie die Partner-Bemerkung, nur lesend
- [ ] Angenommen ein SEND wurde zurückgezogen, wenn „Austausch" angezeigt wird, dann ist er als „zurückgezogen" mit Datum, Administrator und Begründung gekennzeichnet
- [ ] Angenommen eine DMRL wurde nie gesendet, wenn „Austausch" angezeigt wird, dann erscheint „Noch kein Austausch mit einem Partner"

### Freigabestände
- [ ] Angenommen eine DMRL wurde zweimal freigegeben, wenn „Freigabestände" angezeigt wird, dann erscheinen beide mit Datum, REPLY und Bearbeiter, neueste oben
- [ ] Angenommen ein Freigabestand wird angezeigt, wenn „Als CSV exportieren" oder „Als XML exportieren" gewählt wird, dann wird die Datei wie in PROJ-14 heruntergeladen
- [ ] Angenommen eine DMRL wurde nie freigegeben, wenn „Freigabestände" angezeigt wird, dann erscheint „Die DMRL wurde noch nie freigegeben"

### Verlauf
- [ ] Angenommen ein Check-out, Check-in, SEND oder REPLY wurde ausgeführt, wenn der Verlauf angezeigt wird, dann enthält er den Schritt mit Datum, Benutzer, Aktion und Details laut Tabelle
- [ ] Angenommen ein Check-in wurde wegen Fehlern abgelehnt, wenn der Verlauf angezeigt wird, dann steht dort „Check-in abgelehnt — [n] Fehler"
- [ ] Angenommen ein REPLY wurde abgelehnt, wenn der Verlauf angezeigt wird, dann steht dort „REPLY abgelehnt" mit Dateiname und Art/Anzahl der Fehler
- [ ] Angenommen ein Check-in wurde in der Zusammenfassung abgebrochen, wenn der Verlauf angezeigt wird, dann gibt es dafür keinen Eintrag
- [ ] Angenommen ein Administrator ändert die Sicherheitseinstufung der DMRL von 01 auf 02, wenn der Verlauf angezeigt wird, dann steht dort „Kopfdaten geändert: Sicherheitseinstufung 01 → 02"
- [ ] Angenommen der Verlauf hat viele Einträge, wenn nach „SEND" gefiltert wird, dann werden nur SEND-bezogene Einträge angezeigt
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn der Verlauf von PHUNGUN angezeigt wird, dann enthält er SEND, REPLY übernommen, SEND passend zu den Archivdateien

## Edge Cases
- **Benutzer deaktiviert:** Name bleibt im Archiv/Verlauf sichtbar (ggf. mit „inaktiv").
- **Organisation umbenannt:** Archiv zeigt CAGE-Code und aktuellen Namen; die archivierte Datei bleibt unverändert.
- **Sehr viele Archiveinträge / Verlaufseinträge:** Liste blättert oder lädt nach; keine spürbare Verzögerung.
- **Archivierte Datei mit CRLF-Zeilenenden (Beispieldateien):** Download behält die Zeilenenden (byte-genau).
- **DMRL wird gelöscht:** nur ohne Workflow möglich (PROJ-6) — dann gibt es kein Archiv.
- **Demo-Daten neu laden:** Archiv und Verlauf werden auf den Demo-Stand zurückgesetzt.
- **Speicher voll:** Archivierung beim SEND/REPLY schlägt fehl → Vorgang abgebrochen (PROJ-12/13); bestehendes Archiv bleibt.

## Technical Requirements (optional)
- Archivierte Dateien unveränderlich, byte-genau
- Anzeige eines archivierten Stands mit 1.000 Einträgen ohne spürbare Verzögerung
- Darstellung archivierter XML-Dateien aller drei Issues (2.3/4.2/5.0)

## Open Questions
- [x] Soll es eine Archivübersicht über alle DMRLs geben (z. B. im Dashboard, PROJ-16)? → Nein, nicht im MVP; Archiv je DMRL reicht (2026-11-12)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Archivseite je DMRL mit Registerkarten Austausch, Freigabestände, Verlauf | Vorgabe Product Owner | 2026-11-12 |
| Herunterladen byte-genau und Anzeigen als Tabelle | PRD: jederzeit Zugriff auf jede DMRL-Version | 2026-11-12 |
| Nur lesend, nichts löschbar | PRD: dauerhafte Archivierung | 2026-11-12 |
| Admin-Änderungen an Kopfdaten werden protokolliert | Nachvollziehbarkeit (offene Frage aus PROJ-9) | 2026-11-12 |
| Abgelehnte Check-ins/REPLYs und fehlgeschlagene SENDs werden protokolliert, ohne Prüfbericht | Nachvollziehbarkeit bei geringem Speicherbedarf | 2026-11-12 |
| Abgebrochene Vorgänge, Berechtigungsänderungen und Exporte werden nicht protokolliert | Kein fachlicher Schritt / bewusst ausgeschlossen (PROJ-17) | 2026-11-12 |
| Demo-Verlauf für PHUNGUN passend zu den Archivdateien | Durchgängige Demo | 2026-11-12 |

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
