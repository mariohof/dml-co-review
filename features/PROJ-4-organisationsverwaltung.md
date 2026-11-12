# PROJ-4: Organisationsverwaltung

## Status: Architected
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-1 (Datenhaltung + Demo-Daten) — Organisationen werden im Datenbestand gespeichert
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — Zugriff nur für Administratoren
- Wird genutzt von: PROJ-6 (Auswahl des Originators einer DMRL), PROJ-12 (Auswahl des Partners beim SEND), PROJ-13 (Absenderprüfung REPLY), CAGE-Code als `sendid` im DML-Code

## Beschreibung
Der Administrator verwaltet unter „Verwaltung → Organisationen" die Organisationen, die als Sender oder Partner an DMRLs beteiligt sind. Eine Organisation wird über ihren CAGE-Code identifiziert, der im S1000D-DML-Code als `sendid` erscheint (z. B. `D0815`, `C1234`). Ob eine Organisation Originator oder Partner ist, wird nicht an der Organisation festgelegt: der Originator an der DMRL (PROJ-6), der Partner je SEND (PROJ-12).

## Datenfelder einer Organisation
| Feld | Regel |
|------|-------|
| CAGE-Code | Pflicht, genau 5 Zeichen, nur Buchstaben und Ziffern, Eingabe wird automatisch in Großbuchstaben umgewandelt, eindeutig |
| Name | Pflicht, 2–120 Zeichen (Randleerzeichen werden entfernt), nicht eindeutig |

Keine Art (eigene/Partner), kein Status (aktiv/inaktiv).

## Änderungs- und Löschregeln

Eine Organisation gilt als **in einem Workflow benutzt**, sobald eine DMRL, der sie als Originator zugeordnet ist (oder war) oder an die sie als Partner gesendet wurde, mindestens einmal einen der beiden Workflows durchlaufen hat:
1. **Check-out / Check-in**
2. **SEND / REPLY**

Dieser Zustand ist dauerhaft — die Historie archivierter DMRLs muss nachvollziehbar bleiben.

| Situation | Löschen | CAGE-Code ändern | Name ändern |
|---|---|---|---|
| Keiner DMRL zugeordnet, nie in Workflow benutzt | ja | ja | ja |
| Einer DMRL zugeordnet, noch kein Workflow | nein — zuerst Zuordnung in der DMRL ändern | ja | ja |
| In einem Workflow benutzt | **nein, dauerhaft** | **nein** | ja |

## User Stories
- Als **Administrator** möchte ich Organisationen mit CAGE-Code und Name anlegen, damit ich sie DMRLs als Originator zuordnen und beim SEND als Partner wählen kann.
- Als **Administrator** möchte ich den Namen einer Organisation jederzeit korrigieren können, damit Umfirmierungen abgebildet werden.
- Als **Administrator** möchte ich falsch angelegte, unbenutzte Organisationen löschen können, damit die Liste übersichtlich bleibt.
- Als **Bearbeiter** möchte ich, dass am Austausch beteiligte Organisationen nicht gelöscht oder umcodiert werden können, damit ich archivierte DMRLs jederzeit den beteiligten Organisationen zuordnen kann.
- Als **Administrator** möchte ich sehen, wie vielen DMRLs eine Organisation zugeordnet ist und warum eine Aktion gesperrt ist, damit ich die Einschränkungen verstehe.

## Out of Scope
- Art der Organisation (eigene/Partner) — Originator je DMRL (PROJ-6), Partner je SEND (PROJ-12)
- Status aktiv/inaktiv
- Zuordnung von Organisationen zu DMRLs → PROJ-6
- Zuordnung von Benutzern zu Organisationen (Benutzer haben keine Organisation, PROJ-3)
- Prüfung des CAGE-Codes gegen ein externes CAGE-Register
- Weitere Felder (Adresse, Ansprechpartner, Kontaktdaten)
- Verwaltung der verantwortlichen Partnerfirma je Eintrag (`rpc`/`rpcname`) — bleibt ein Freitextfeld des DMRL-Eintrags
- Import/Export von Organisationslisten

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Zugriff
- [ ] Angenommen ein Administrator ist angemeldet, wenn er „Verwaltung → Organisationen" öffnet, dann erscheint die Organisationsverwaltung
- [ ] Angenommen ein Bearbeiter ist angemeldet, wenn er die Organisationsverwaltung direkt aufruft, dann erscheint „Keine Berechtigung" (PROJ-2)

### Liste
- [ ] Angenommen die Organisationsverwaltung ist geöffnet, wenn die Liste angezeigt wird, dann zeigt sie alle Organisationen mit CAGE-Code, Name und Anzahl zugeordneter DMRLs, sortiert nach CAGE-Code
- [ ] Angenommen die Liste wird angezeigt, wenn ein Suchbegriff eingegeben wird, dann werden nur Organisationen angezeigt, deren CAGE-Code oder Name den Begriff enthält (ohne Unterscheidung Groß-/Kleinschreibung)
- [ ] Angenommen es existieren keine Organisationen, wenn die Liste angezeigt wird, dann erscheint „Noch keine Organisationen angelegt" mit der Aktion „Organisation anlegen"
- [ ] Angenommen ein Suchbegriff liefert keine Treffer, wenn die Liste angezeigt wird, dann erscheint „Keine Organisationen gefunden"

### Anlegen
- [ ] Angenommen die Organisationsverwaltung ist geöffnet, wenn „Organisation anlegen" gewählt wird, dann öffnet sich ein Dialog mit den Feldern CAGE-Code und Name
- [ ] Angenommen der Dialog ist gültig ausgefüllt, wenn gespeichert wird, dann erscheint die Organisation in der Liste
- [ ] Angenommen im Feld CAGE-Code wird „c1234" eingegeben, wenn die Eingabe erfolgt, dann wird sie als „C1234" übernommen
- [ ] Angenommen der CAGE-Code hat nicht genau 5 Zeichen oder enthält andere Zeichen als Buchstaben und Ziffern, wenn gespeichert wird, dann erscheint „CAGE-Code muss aus genau 5 Buchstaben/Ziffern bestehen" und nichts wird gespeichert
- [ ] Angenommen eine Organisation mit CAGE-Code „C1234" existiert, wenn eine weitere mit „C1234" angelegt werden soll, dann erscheint „CAGE-Code bereits vergeben" und nichts wird gespeichert
- [ ] Angenommen der Name ist leer oder kürzer als 2 bzw. länger als 120 Zeichen, wenn gespeichert wird, dann erscheint eine entsprechende Fehlermeldung und nichts wird gespeichert
- [ ] Angenommen eine Organisation mit dem Namen „Partner Systemtechnik GmbH" existiert, wenn eine weitere mit demselben Namen und anderem CAGE-Code angelegt wird, dann ist das erlaubt

### Bearbeiten
- [ ] Angenommen eine Organisation ist keiner DMRL zugeordnet, wenn „Bearbeiten" gewählt wird, dann können CAGE-Code und Name geändert werden (gleiche Prüfregeln wie beim Anlegen)
- [ ] Angenommen eine Organisation ist einer DMRL zugeordnet, die noch keinen Workflow durchlaufen hat, wenn „Bearbeiten" gewählt wird, dann können CAGE-Code und Name geändert werden
- [ ] Angenommen eine Organisation ist in einem Workflow benutzt, wenn „Bearbeiten" gewählt wird, dann ist nur der Name änderbar und das Feld CAGE-Code ist gesperrt mit dem Hinweis „CAGE-Code wird in Workflows verwendet und kann nicht geändert werden"
- [ ] Angenommen der Name einer benutzten Organisation wird geändert, wenn gespeichert wird, dann erscheint der neue Name überall in der Anwendung; archivierte XML-Dateien bleiben unverändert

### Löschen
- [ ] Angenommen eine Organisation ist keiner DMRL zugeordnet und nie in einem Workflow benutzt, wenn „Löschen" gewählt wird, dann erscheint ein Bestätigungsdialog
- [ ] Angenommen der Lösch-Dialog ist geöffnet, wenn bestätigt wird, dann ist die Organisation entfernt; wenn abgebrochen wird, bleibt sie erhalten
- [ ] Angenommen eine Organisation ist einer DMRL zugeordnet, die noch keinen Workflow durchlaufen hat, wenn „Löschen" gewählt werden soll, dann ist die Aktion gesperrt mit dem Hinweis „Die Organisation ist der DMRL [Systemname] zugeordnet. Ändern Sie zuerst die Zuordnung in der DMRL."
- [ ] Angenommen eine Organisation ist in einem Workflow benutzt, wenn „Löschen" gewählt werden soll, dann ist die Aktion dauerhaft gesperrt mit dem Hinweis „Die Organisation ist an Workflows beteiligt und kann nicht gelöscht werden"
- [ ] Angenommen eine gesperrte Aktion wird angezeigt, wenn der Mauszeiger darauf zeigt oder sie fokussiert wird, dann erklärt ein Tooltip den Grund

### Demo-Daten
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Organisationsverwaltung geöffnet wird, dann sind D0815 und C1234 als in Workflows benutzt erkennbar (Löschen und CAGE-Code-Änderung gesperrt), da die DMRL PHUNGUN bereits SEND/REPLY durchlaufen hat

## Edge Cases
- **Organisation war einer DMRL mit Workflow-Historie zugeordnet, Zuordnung wurde später geändert:** bleibt dauerhaft „benutzt" (Historie).
- **CAGE-Code mit Leerzeichen** („C 123"): ungültig — keine automatische Bereinigung von Leerzeichen innerhalb des Codes.
- **CAGE-Code mit Umlauten oder Sonderzeichen:** ungültig.
- **Umcodieren auf bestehenden Code** (unbenutzte Organisation „X0001" → „C1234"): abgelehnt, Eindeutigkeit.
- **Gleiche Organisation als Originator und Partner:** Partner wird beim SEND gewählt (PROJ-12) — Regel dort.
- **Zwei Tabs, gleichzeitiges Bearbeiten:** letzter Speichervorgang gewinnt (Prototyp, PROJ-1).

## Technical Requirements (optional)
- Nur für Administratoren erreichbar (PROJ-2)
- Formularvalidierung mit sofortigen, deutschsprachigen Fehlermeldungen
- Responsiv: Tabelle auf kleinen Bildschirmen horizontal scrollbar

## Open Questions
- [x] Darf beim SEND der Originator selbst als Partner gewählt werden? → Nein, der Originator wird in der Partnerauswahl nicht angeboten (PROJ-12, 2026-11-12)
- [x] Prüfung beim REPLY-Import: `dmlc/sendid` der REPLY muss dem beim SEND gewählten Partner entsprechen (PROJ-6/PROJ-13)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Code = CAGE-Code, 5 Zeichen alphanumerisch, Großbuchstaben, eindeutig | Vorgabe Product Owner; entspricht `sendid` im DML-Code | 2026-11-12 |
| Keine Art (eigene/Partner) an der Organisation | Vorgabe Product Owner; Rolle wird je DMRL festgelegt | 2026-11-12 |
| Kein Status aktiv/inaktiv | Vorgabe Product Owner | 2026-11-12 |
| „Benutzt" = beteiligte DMRL hat Check-out/Check-in oder SEND/REPLY durchlaufen; dauerhaft | Vorgabe Product Owner — Nachvollziehbarkeit archivierter DMRLs | 2026-11-12 |
| Benutzte Organisation: kein Löschen, CAGE-Code fest, Name änderbar | CAGE-Code steckt in DML-Codes und Dateinamen; Name ist nur Anzeige | 2026-11-12 |
| Zugeordnet ohne Workflow: Löschen gesperrt bis Zuordnung geändert | Verhindert DMRLs ohne Originator | 2026-11-12 |
| Name nicht eindeutig, 2–120 Zeichen | Gleichnamige Standorte möglich; Identität über CAGE-Code | 2026-11-12 |
| Gesperrte Aktionen ausgegraut mit Tooltip-Begründung | Administrator versteht Einschränkung ohne Fehlermeldung | 2026-11-12 |
| Liste sortiert nach CAGE-Code, Suche über Code und Name | CAGE-Code ist das fachliche Ordnungsmerkmal | 2026-11-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Verwaltungsmuster aus PROJ-3 wiederverwendet | Einheitliche Bedienung | 2026-11-12 |
| Gemeinsame, abgeleitete Regel „im Workflow benutzt" (Check-in im Verlauf oder Archivstand; Partner im Archiv) für PROJ-4/5/6 | Eine Definition, kein gespeichertes Kennzeichen (PROJ-1) | 2026-11-12 |
| Aktueller Originator genügt für die Regel | Originator nach erstem Workflow unveränderlich (PROJ-6) | 2026-11-12 |
| Verknüpfung über ID, Anzeige aktueller Name | Umfirmierung wirkt überall, Archivdateien unverändert | 2026-11-12 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
### Überblick
Die Organisationsverwaltung nutzt das **gemeinsame Verwaltungsmuster aus PROJ-3** (Seitenrahmen, durchsuchbare Tabelle, Formular-Dialog, Bestätigung mit Sperrgründen). Neu ist eine **gemeinsame Regel „im Workflow benutzt"**, die auch PROJ-5 (Systeme) und PROJ-6 (DMRL) verwenden. Kein Backend nötig.

### A) Komponentenstruktur
```
Seite „Verwaltung → Organisationen" (/verwaltung/organisationen)
+-- Zugriffswächter „Administrator?" (PROJ-2)
+-- Verwaltungs-Seitenrahmen (PROJ-3)
    +-- Titel „Organisationen" · Button „Organisation anlegen"
    +-- Suchfeld (CAGE-Code, Name)
    +-- Tabelle
    |   +-- Spalten: CAGE-Code · Name · zugeordnete DMRLs (Anzahl) · Kennzeichen „im Workflow benutzt" · Aktionen
    |   +-- Aktionen: „Bearbeiten" · „Löschen" (gesperrt ausgegraut mit Tooltip-Begründung)
    |   +-- Leer: „Noch keine Organisationen angelegt" + Aktion · Keine Treffer: „Keine Organisationen gefunden"
    +-- Formular-Dialog „Organisation anlegen / bearbeiten"
    |   +-- CAGE-Code (automatisch Großbuchstaben; gesperrt mit Hinweis, wenn benutzt) · Name
    +-- Bestätigungsdialog „Löschen"
```

### B) Datenmodell (in Klartext)
Keine Änderung — Organisation laut PROJ-1: ID, CAGE-Code, Name. Verknüpfungen zu DMRLs (Originator) und Archivständen (Partner) laufen über die ID; deshalb bleibt bei einer Namensänderung alles korrekt verknüpft, archivierte XML-Dateien bleiben unverändert.

### C) Fachregeln (eine Stelle, ohne Oberfläche)
- **Prüfung:** CAGE-Code genau 5 Buchstaben/Ziffern, in Großbuchstaben, eindeutig (eigener Code ausgenommen); Name 2–120 Zeichen nach Entfernen der Randleerzeichen.
- **Zugeordnete DMRLs:** DMRLs mit dieser Organisation als Originator (Anzahl und Systemnamen für Meldungen).
- **Gemeinsame Regel „im Workflow benutzt"** (abgeleitet, nicht gespeichert — PROJ-1):
  - eine DMRL mit dieser Organisation als Originator hat mindestens einen **abgeschlossenen Check-in** (Verlauf) oder **Archivstand** (SEND/REPLY), oder
  - die Organisation ist **Partner** eines Archivstands (SEND oder REPLY).
  Da der Originator nach dem ersten Workflow nicht mehr geändert werden kann (PROJ-6), genügt der aktuelle Originator.
- **Rechte je Situation** (Löschen / CAGE-Code ändern / Name ändern) laut Tabelle der Spec, mit Begründungstext für Tooltip und Hinweise.

### D) Technische Entscheidungen (für PM erklärt)
| Entscheidung | Warum |
|---|---|
| Gemeinsames Verwaltungsmuster aus PROJ-3 | Einheitliche Bedienung, kaum neuer Aufwand. |
| Gemeinsame Regel „im Workflow benutzt" für Organisationen, Systeme und DMRLs | Eine Definition für PROJ-4/5/6 — keine abweichenden Auslegungen. |
| Ableitung aus Verlauf und Archiv statt gespeichertem Kennzeichen | Kann nicht „vergessen" werden und bleibt dauerhaft korrekt. |
| Verknüpfung über ID, Anzeige des aktuellen Namens | Umfirmierung wirkt überall; CAGE-Code in Dateien bleibt unverändert. |
| CAGE-Code-Feld wandelt Eingabe sofort in Großbuchstaben | Verhindert Tippfehler-Duplikate („c1234" vs. „C1234"). |

### E) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.**

### F) Testbarkeit
- Unit-Tests: CAGE-Prüfung (Länge, Zeichen, Groß-/Kleinschreibung, Eindeutigkeit), Regel „im Workflow benutzt" (Originator mit Check-in, Originator mit Archiv, Partner im Archiv, zugeordnet ohne Workflow, unbenutzt), Rechte-Tabelle.
- E2E: Anlegen/Bearbeiten/Löschen; Demo-Daten: D0815 und C1234 als benutzt erkennbar, Löschen und CAGE-Änderung gesperrt.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
