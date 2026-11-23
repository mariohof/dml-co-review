---
name: deploy-windows-offline
description: Erstellt ein neues Windows-11-Offline-Paket (x64, ZIP) des DMRL Management Systems — mit Windows-node_modules und vorgebauter App, sodass auf dem Zielrechner weder installiert noch gebaut werden muss. Verwenden bei "neues Windows-Offline-Paket", "Windows-11-Package", "Offline-ZIP für Windows".
argument-hint: "optional: Zielordner für das ZIP"
user-invocable: true
---

# Windows-11-Offline-Paket erstellen

## Ziel
Ein ZIP `DMRL-Management-System-Windows-offline-<JJJJ-MM-TT>[-vN].zip` (Ablage: Elternordner des Projekts, `/Users/mario/Documents/Claude/`) für den Windows-11-Firmenrechner des Product Owners:
- portable Node.js unter `c:\tools\node`, xmllint unter `c:\tools\xmllint\bin`, Firmen-Proxy, **keine Paketinstallation und kein Internet** möglich
- Inhalt: Projektstand aus **git HEAD** + `node_modules` mit **Windows-x64**-Binärdateien (`.bin` als `.cmd`/`.ps1`-Shims, keine Symlinks) + vorgebautes `.next` (ohne `.next/cache`) + `.start-stand.json` + `OFFLINE-WINDOWS-LIESMICH.txt`
- Beim Start (`Start.bat`) erkennt das Startskript (PROJ-19) über `.start-stand.json`: nichts zu installieren, nichts zu bauen

### Paketinhalt: nur was die Anwendung braucht
**Bleibt im Paket:** `.next` (vorgebaute App), `node_modules`, `src/` (ohne Testdateien), `public/`, `schemas/`, `scripts/start.py`, `Start.bat`, `START-HIER.md`, `docs/beispiele/` (Beispiel-XML zum Ausprobieren), `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `tailwind.config.ts`.
`src/` und die Build-Konfiguration bleiben, weil das Startskript daraus den Build-Fingerabdruck bildet und ein Neubau (`--neu-bauen`) auf Windows möglich bleiben soll.

**Wird entfernt (Liste `DEV_FILES` in `build-package.sh`):** `.claude/`, `CLAUDE.md`, `README.md`, `features/`, `tests/`, `src/test/`, `src/**/*.test.ts(x)`, `docs/` außer den XML-Dateien in `beispiele/`, `*.textClipping`, `.DS_Store`, `.gitattributes`, `.gitignore`, `.env.local.example`, `playwright.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `components.json`, `Start.command`, `start.sh`, `scripts/test_start.py`, `scripts/generate-demo-*`; nach dem Build außerdem `.next/cache`, `start.log`, `__pycache__`, `tsconfig.tsbuildinfo`.
Die Dateien werden **vor** dem Build entfernt, damit der Start-Vermerk zum ausgelieferten Stand passt. Am Ende prüft das Skript, dass keine davon im Paket ist. Kommen neue Entwicklungsdateien ins Repo, die Liste `DEV_FILES` ergänzen.

Hintergrund und frühere Windows-Fehler: `features/PROJ-19-lokaler-start.md`, Abschnitt „Bugfixes 2026-11-16 (… Offline-Paket)“.

## Dateien dieses Skills
- `build-package.sh` — erledigt den kompletten Bau (siehe Kopfkommentar)
- `OFFLINE-WINDOWS-LIESMICH.txt` — Anleitung im Paket (UTF-8, CRLF). Änderungen an der Anleitung hier vornehmen.

## Ablauf

### 1. Vorbedingungen prüfen
1. `git status --short` — nicht eingecheckte Änderungen an `src/`, `public/`, `schemas/`, `scripts/`, Paket-/Build-Konfiguration kommen **nicht** ins Paket (nur git HEAD). Gibt es solche Änderungen: den Benutzer fragen, ob zuerst committet werden soll. Fremde, unbeteiligte Dateien (z. B. `.textClipping`) ignorieren.
2. `git log --oneline -5` — den Projektstand für die Zusammenfassung merken.
3. Optional, falls seit dem letzten grünen Lauf Code geändert wurde: `npm test` und `python3 -m unittest discover -s scripts -p "test_*.py"`. Bei Fehlern abbrechen und melden.
4. Voraussetzungen auf dem Mac: `node`, `npm`, `xmllint`, `zip`; Port 8899 frei; im Projekt sind die macOS-`node_modules` installiert (werden nur zum Bauen ausgeliehen).

### 2. Paket bauen
Arbeitsordner im Scratchpad wählen (falls vorhanden), sonst Standard des Skripts:
```bash
bash .claude/skills/deploy-windows-offline/build-package.sh "<scratchpad>/win-offline" ["<Zielordner>"]
```
- Laufzeit: einige Minuten (Build). Mit langem Timeout (≥ 600000 ms) oder im Hintergrund ausführen und auf das Ende warten.
- **Ausgabe nie nach `<Arbeitsordner>/run.out` umleiten** (auch nicht in den Arbeitsordner selbst): Das Skript schreibt das Protokoll des Startskripts dorthin und gibt es per `cat` wieder aus — eine Umleitung in dieselbe Datei erzeugt eine Endlosschleife (am 2026-11-22 wuchs die Datei so auf 236 GB). Gesamtausgabe in eine Datei **neben** dem Arbeitsordner leiten, z. B. `"<scratchpad>/build-package.log"`.
- Das Skript übernimmt `node_modules` aus dem **jüngsten Offline-ZIP mit gleicher Lock-Datei** (schnell, offline). Hat sich `package-lock.json` geändert, installiert es neu mit `npm ci --os=win32 --cpu=x64` (Internet nötig) und wandelt die `.bin`-Symlinks mit npm's `cmd-shim` in Windows-Shims um.
- Es baut über das echte Startskript (`scripts/start.py 8899 --kein-browser --neu-bauen`) mit vorübergehend ausgeliehenen macOS-Binärdateien (`*darwin*` aus dem Projekt), macht einen Rauchtest (`/`, `/xml-pruefung`, XSD-Prüfung 4.2 und 5.0 mit den Beispielen aus `docs/beispiele/`), beendet den Server, entfernt die macOS-Binärdateien, `start.log`, `__pycache__` und `.next/cache` und prüft, dass laut Start-Vermerk **weder Installation noch Build** nötig ist.
- Der ZIP-Name bekommt automatisch die nächste freie Versionsnummer (`…-JJJJ-MM-TT.zip`, dann `-v2`, `-v3` …). Vorhandene ZIPs werden nie überschrieben.

### 3. Bei Fehlern
- Das Skript bricht mit `FEHLER: …` ab. `<Arbeitsordner>/run.out` und `<Arbeitsordner>/DMRL-Management-System/start.log` lesen, Ursache beheben, erneut ausführen. Nichts von Hand ins ZIP flicken.
- „Port 8899 ist belegt“ → laufenden Probestart beenden (`lsof -nP -iTCP:8899 -sTCP:LISTEN`).
- „keine macOS-Binärdateien“ → im Projekt `npm ci` ausführen.
- Nach dem Lauf sicherstellen, dass kein Server mehr auf Port 8899 läuft.

### 4. Ergebnis melden (auf Deutsch)
- vollständiger Pfad und Größe des ZIP, Anzahl Dateien
- enthaltener Projektstand (Commit) und was sich gegenüber dem vorigen Paket fachlich geändert hat (aus `git log` seit dem Commit des vorigen Pakets, falls bekannt)
- woher `node_modules` stammt (übernommen aus … / neu installiert)
- Rauchtest-Ergebnis; ausdrücklich sagen, dass **nicht auf Windows** getestet wurde
- Installationshinweis: in einen **neuen, leeren Ordner** mit kurzem Pfad entpacken (z. B. `C:\DMRL`), nicht über die alte Version; `Start.bat` doppelklicken; bei Problemen `start.log` aus dem Ordner `DMRL-Management-System` schicken lassen

## Regeln
- Nichts committen, nichts pushen, kein Vercel — das Paket ist eine lokale Datei.
- Alte Pakete nicht löschen (sie dienen als Quelle für `node_modules`); Aufräumen nur auf Wunsch des Benutzers.
- Den Arbeitsordner nicht ins Projekt legen.
- Ändert sich der Startablauf (`scripts/start.py`, `Start.bat`) oder kommen neue native Pakete hinzu, das Skript und diese Anleitung anpassen.
- Keine Claude-/Entwicklungsdateien ins Paket — `.next` (vorgebaute App) aber **nie** entfernen, sonst baut Windows beim ersten Start neu.
