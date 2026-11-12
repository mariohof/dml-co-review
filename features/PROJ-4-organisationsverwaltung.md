# PROJ-4: Organisationsverwaltung

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Dependencies
- Requires: PROJ-1 (Datenhaltung + Demo-Daten) — Organisationen werden im Datenbestand gespeichert
- Requires: PROJ-2 (Simulierte Anmeldung & Rollen) — Zugriff nur für Administratoren
- Wird genutzt von: PROJ-6 (DMRL: Auswahl von Sender- und Partner-Organisation), PROJ-12/13 (CAGE-Code als `sendid` im DML-Code)

## Beschreibung
Der Administrator verwaltet unter „Verwaltung → Organisationen" die Organisationen, die als Sender oder Partner an DMRLs beteiligt sind. Eine Organisation wird über ihren CAGE-Code identifiziert, der im S1000D-DML-Code als `sendid` erscheint (z. B. `D0815`, `C1234`). Ob eine Organisation Sender oder Partner ist, wird nicht an der Organisation, sondern an der jeweiligen DMRL festgelegt (PROJ-6).

## Datenfelder einer Organisation
| Feld | Regel |
|------|-------|
| CAGE-Code | Pflicht, genau 5 Zeichen, nur Buchstaben und Ziffern, Eingabe wird automatisch in Großbuchstaben umgewandelt, eindeutig |
| Name | Pflicht, 2–120 Zeichen (Randleerzeichen werden entfernt), nicht eindeutig |

Keine Art (eigene/Partner), kein Status (aktiv/inaktiv).

## Änderungs- und Löschregeln

Eine Organisation gilt als **in einem Workflow benutzt**, sobald eine DMRL, der sie als Sender oder Partner zugeordnet ist (oder war), mindestens einmal einen der beiden Workflows durchlaufen hat:
1. **Check-out / Check-in**
2. **SEND / REPLY**

Dieser Zustand ist dauerhaft — die Historie archivierter DMRLs muss nachvollziehbar bleiben.

| Situation | Löschen | CAGE-Code ändern | Name ändern |
|---|---|---|---|
| Keiner DMRL zugeordnet, nie in Workflow benutzt | ja | ja | ja |
| Einer DMRL zugeordnet, noch kein Workflow | nein — zuerst Zuordnung in der DMRL ändern | ja | ja |
| In einem Workflow benutzt | **nein, dauerhaft** | **nein** | ja |

## User Stories
- Als **Administrator** möchte ich Organisationen mit CAGE-Code und Name anlegen, damit ich sie DMRLs als Sender oder Partner zuordnen kann.
- Als **Administrator** möchte ich den Namen einer Organisation jederzeit korrigieren können, damit Umfirmierungen abgebildet werden.
- Als **Administrator** möchte ich falsch angelegte, unbenutzte Organisationen löschen können, damit die Liste übersichtlich bleibt.
- Als **Bearbeiter** möchte ich, dass am Austausch beteiligte Organisationen nicht gelöscht oder umcodiert werden können, damit ich archivierte DMRLs jederzeit den beteiligten Organisationen zuordnen kann.
- Als **Administrator** möchte ich sehen, wie vielen DMRLs eine Organisation zugeordnet ist und warum eine Aktion gesperrt ist, damit ich die Einschränkungen verstehe.

## Out of Scope
- Art der Organisation (eigene/Partner) — wird je DMRL festgelegt → PROJ-6
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
- [ ] Angenommen eine Organisation ist einer DMRL zugeordnet, die noch keinen Workflow durchlaufen hat, wenn „Löschen" gewählt werden soll, dann ist die Aktion gesperrt mit dem Hinweis „Die Organisation ist der DMRL [Name] zugeordnet. Ändern Sie zuerst die Zuordnung in der DMRL."
- [ ] Angenommen eine Organisation ist in einem Workflow benutzt, wenn „Löschen" gewählt werden soll, dann ist die Aktion dauerhaft gesperrt mit dem Hinweis „Die Organisation ist an Workflows beteiligt und kann nicht gelöscht werden"
- [ ] Angenommen eine gesperrte Aktion wird angezeigt, wenn der Mauszeiger darauf zeigt oder sie fokussiert wird, dann erklärt ein Tooltip den Grund

### Demo-Daten
- [ ] Angenommen der Demo-Datenbestand ist geladen, wenn die Organisationsverwaltung geöffnet wird, dann sind D0815 und C1234 als in Workflows benutzt erkennbar (Löschen und CAGE-Code-Änderung gesperrt), da die DMRL PHUNGUN bereits SEND/REPLY durchlaufen hat

## Edge Cases
- **Organisation war einer DMRL mit Workflow-Historie zugeordnet, Zuordnung wurde später geändert:** bleibt dauerhaft „benutzt" (Historie).
- **CAGE-Code mit Leerzeichen** („C 123"): ungültig — keine automatische Bereinigung von Leerzeichen innerhalb des Codes.
- **CAGE-Code mit Umlauten oder Sonderzeichen:** ungültig.
- **Umcodieren auf bestehenden Code** (unbenutzte Organisation „X0001" → „C1234"): abgelehnt, Eindeutigkeit.
- **Gleiche Organisation als Sender und Partner einer DMRL:** wird in PROJ-6 geregelt (siehe Open Questions).
- **Zwei Tabs, gleichzeitiges Bearbeiten:** letzter Speichervorgang gewinnt (Prototyp, PROJ-1).

## Technical Requirements (optional)
- Nur für Administratoren erreichbar (PROJ-2)
- Formularvalidierung mit sofortigen, deutschsprachigen Fehlermeldungen
- Responsiv: Tabelle auf kleinen Bildschirmen horizontal scrollbar

## Open Questions
- [ ] Darf dieselbe Organisation in einer DMRL zugleich Sender und Partner sein? (PROJ-6)
- [ ] Muss die Sender-Organisation einer DMRL zum CAGE-Code in `dmlc/sendid` beim REPLY-Import passen? (PROJ-13)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Code = CAGE-Code, 5 Zeichen alphanumerisch, Großbuchstaben, eindeutig | Vorgabe Product Owner; entspricht `sendid` im DML-Code | 2026-11-12 |
| Keine Art (eigene/Partner) an der Organisation | Vorgabe Product Owner; Rolle wird je DMRL festgelegt | 2026-11-12 |
| Kein Status aktiv/inaktiv | Vorgabe Product Owner | 2026-11-12 |
| „Benutzt" = beteiligte DMRL hat Check-out/Check-in oder SEND/REPLY durchlaufen; dauerhaft | Vorgabe Product Owner — Nachvollziehbarkeit archivierter DMRLs | 2026-11-12 |
| Benutzte Organisation: kein Löschen, CAGE-Code fest, Name änderbar | CAGE-Code steckt in DML-Codes und Dateinamen; Name ist nur Anzeige | 2026-11-12 |
| Zugeordnet ohne Workflow: Löschen gesperrt bis Zuordnung geändert | Verhindert DMRLs ohne Sender/Partner | 2026-11-12 |
| Name nicht eindeutig, 2–120 Zeichen | Gleichnamige Standorte möglich; Identität über CAGE-Code | 2026-11-12 |
| Gesperrte Aktionen ausgegraut mit Tooltip-Begründung | Administrator versteht Einschränkung ohne Fehlermeldung | 2026-11-12 |
| Liste sortiert nach CAGE-Code, Suche über Code und Name | CAGE-Code ist das fachliche Ordnungsmerkmal | 2026-11-12 |

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
