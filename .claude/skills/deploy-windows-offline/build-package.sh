#!/usr/bin/env bash
# Baut das Windows-11-Offline-Paket (x64) des DMRL Management Systems.
#
# Aufruf:  bash .claude/skills/deploy-windows-offline/build-package.sh [ARBEITSORDNER] [ZIELORDNER]
#   ARBEITSORDNER  temporärer Ordner für den Bau (Standard: neuer Ordner unter $TMPDIR)
#   ZIELORDNER     Ablage des ZIP (Standard: Elternordner des Projekts)
#
# Ablauf:
#   1. Projektstand = git HEAD (nur eingecheckte Dateien), ohne Claude-/Entwicklungsdateien
#      (.claude, CLAUDE.md, features/, tests/, Testdateien, docs/ außer beispiele/, Test-/Lint-Konfiguration,
#      Mac/Linux-Startdateien); .next (vorgebaute App) bleibt im Paket
#   2. node_modules für Windows x64: aus dem letzten Offline-ZIP mit gleicher Lock-Datei übernehmen,
#      sonst `npm ci --os=win32 --cpu=x64` + .bin-Symlinks in Windows-Shims (.cmd/.ps1) umwandeln
#   3. macOS-Binärdateien vorübergehend ergänzen, mit dem Startskript bauen + Probestart (Port 8899)
#   4. Rauchtest (Seiten, XSD-Prüfung 4.2/5.0/6.0), Server beenden
#   5. macOS-Binärdateien, Protokoll, Build-Cache entfernen; Start-Vermerk prüfen (nichts zu installieren/bauen)
#   6. ZIP mit fortlaufender Versionsnummer anlegen
set -euo pipefail

say() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nFEHLER: %s\n' "$*" >&2; exit 1; }

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SKILL_DIR/../../.." && pwd)"
WORK="${1:-$(mktemp -d "${TMPDIR:-/tmp}/dmrl-win-offline.XXXXXX")}"
OUT_DIR="${2:-$(dirname "$REPO")}"
NAME="DMRL-Management-System"
PKG="$WORK/$NAME"
PORT=8899
PREFIX="$NAME-Windows-offline"

command -v node >/dev/null || fail "node fehlt"
command -v npm >/dev/null || fail "npm fehlt"
command -v xmllint >/dev/null || fail "xmllint fehlt"
command -v zip >/dev/null || fail "zip fehlt"

# ---------------------------------------------------------------- 1. Projektstand
say "Projektstand: $(git -C "$REPO" log --oneline -1)"
if [ -n "$(git -C "$REPO" status --porcelain --untracked-files=no)" ]; then
  echo "Hinweis: Es gibt nicht eingecheckte Änderungen — sie sind NICHT im Paket (nur git HEAD)."
fi
rm -rf "$PKG"; mkdir -p "$PKG"
git -C "$REPO" archive HEAD | tar -x -C "$PKG"

# Nur was die Anwendung zum Laufen (und für einen Neubau auf Windows) braucht — keine
# Claude-/Entwicklungsdateien. Vor dem Build entfernen, damit der Build-Fingerabdruck
# im Start-Vermerk zum ausgelieferten Stand passt.
say "Entferne Entwicklungsdateien (Claude, Specs, Tests, Doku, Mac/Linux-Start)"
DEV_FILES=(
  .claude CLAUDE.md README.md features tests
  .gitattributes .gitignore .env.local.example
  playwright.config.ts vitest.config.ts eslint.config.mjs components.json
  Start.command start.sh
  scripts/test_start.py scripts/generate-demo-files.py scripts/generate-demo-xml.mjs
  src/test
)
for f in "${DEV_FILES[@]}"; do rm -rf "${PKG:?}/$f"; done
# docs/: nur die Beispiel-XML (zum Ausprobieren von REPLY/XML-Prüfung) bleibt
find "$PKG/docs" -mindepth 1 -maxdepth 1 ! -name beispiele -exec rm -rf {} +
find "$PKG/docs/beispiele" -type f ! -iname '*.xml' -delete
# macOS-Reste (Textclips, Finder-Dateien), falls versehentlich eingecheckt
find "$PKG" \( -name '*.textClipping' -o -name '.DS_Store' \) -delete
find "$PKG/src" -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -delete
cp "$SKILL_DIR/OFFLINE-WINDOWS-LIESMICH.txt" "$PKG/"
echo "Paketinhalt (oberste Ebene): $(cd "$PKG" && ls -A | tr '\n' ' ')"

LOCK_HASH="$(shasum -a 256 "$PKG/package-lock.json" | cut -d' ' -f1)"
echo "Lock-Datei: $LOCK_HASH"

# ---------------------------------------------------------------- 2. node_modules (Windows x64)
REUSED=""
for zipfile in $(ls -t "$OUT_DIR"/"$PREFIX"-*.zip 2>/dev/null); do
  old_lock="$(unzip -p "$zipfile" "$NAME/.start-stand.json" 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin).get("lock",""))' 2>/dev/null || true)"
  if [ "$old_lock" = "$LOCK_HASH" ]; then
    say "Übernehme node_modules (Windows x64) aus $(basename "$zipfile")"
    unzip -q "$zipfile" "$NAME/node_modules/*" -d "$WORK"
    REUSED="$zipfile"
    break
  fi
done

if [ -z "$REUSED" ]; then
  say "Kein Paket mit gleicher Lock-Datei — installiere Pakete für Windows x64 (Internet nötig)"
  (cd "$PKG" && npm ci --os=win32 --cpu=x64 --no-audit --no-fund --ignore-scripts)
  say "Wandle .bin-Verknüpfungen in Windows-Shims um"
  NPM_ROOT="$(npm root -g)/npm"
  [ -d "$NPM_ROOT/node_modules/cmd-shim" ] || fail "cmd-shim im npm-Paket nicht gefunden ($NPM_ROOT)"
  cd "$PKG"
  NPM_ROOT="$NPM_ROOT" node -e '
    const fs = require("fs"), path = require("path")
    const cmdShim = require(path.join(process.env.NPM_ROOT, "node_modules/cmd-shim"))
    const links = require("child_process").execSync("find node_modules -path \"*/.bin/*\" -type l", { encoding: "utf8" }).split("\n").filter(Boolean)
    ;(async () => {
      for (const link of links) {
        const target = path.resolve(path.dirname(link), fs.readlinkSync(link))
        fs.unlinkSync(link)
        await cmdShim(target, link)
      }
      console.log(`${links.length} Shims erzeugt`)
    })().catch((e) => { console.error(e); process.exit(1) })
  '
  cd "$REPO"
fi

# keine Symlinks im Paket (Windows-ZIP kann sie nicht abbilden)
links="$(find "$PKG/node_modules" -type l | wc -l | tr -d ' ')"
[ "$links" = "0" ] || fail "$links symbolische Verknüpfungen in node_modules"
[ -d "$PKG/node_modules/@next/swc-win32-x64-msvc" ] || fail "@next/swc-win32-x64-msvc fehlt"

# ---------------------------------------------------------------- 3. Bauen + Probestart
MAC_NATIVE="$(cd "$REPO" && find node_modules -maxdepth 2 -type d -name '*darwin*' | sort)"
[ -n "$MAC_NATIVE" ] || fail "keine macOS-Binärdateien in $REPO/node_modules (dort zuerst npm ci ausführen)"
say "Ergänze vorübergehend macOS-Binärdateien für den Build:"
echo "$MAC_NATIVE"
for d in $MAC_NATIVE; do mkdir -p "$PKG/$(dirname "$d")"; cp -c -R "$REPO/$d" "$PKG/$d" 2>/dev/null || cp -R "$REPO/$d" "$PKG/$d"; done

# Start-Vermerk nur mit Lock-Hash → Startskript installiert nicht, baut aber neu
printf '{"lock": "%s"}' "$LOCK_HASH" > "$PKG/.start-stand.json"

if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then fail "Port $PORT ist belegt"; fi
say "Baue und starte Anwendung auf Port $PORT (dauert einige Minuten)"
(cd "$PKG" && exec python3 -B scripts/start.py $PORT --kein-browser --neu-bauen) > "$WORK/run.out" 2>&1 &
START_PID=$!
stop_app() { kill -TERM "$START_PID" 2>/dev/null || true; wait "$START_PID" 2>/dev/null || true; }
trap stop_app EXIT

for _ in $(seq 1 600); do
  grep -q "Anwendung läuft" "$WORK/run.out" && break
  kill -0 "$START_PID" 2>/dev/null || { cat "$WORK/run.out"; fail "Startskript beendet ohne Start"; }
  sleep 1
done
grep -q "Anwendung läuft" "$WORK/run.out" || { cat "$WORK/run.out"; fail "Zeitüberschreitung beim Start"; }
cat "$WORK/run.out"

# ---------------------------------------------------------------- 4. Rauchtest
say "Rauchtest"
for url in / /xml-pruefung; do
  code="$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "http://localhost:$PORT$url")"
  echo "GET $url → $code"; [ "$code" = "200" ] || fail "GET $url liefert $code"
done
for issue in 4.2 5.0 6.0; do
  file="$(ls "$REPO/docs/beispiele/issue-$issue/"*.XML | head -1)"
  answer="$(curl -s --noproxy '*' -X POST -H "Origin: http://localhost:$PORT" --data-binary @"$file" "http://localhost:$PORT/api/xsd-pruefung?issue=$issue")"
  echo "XSD $issue → $answer"
  echo "$answer" | grep -q '"state":"gueltig"' || fail "XSD-Prüfung $issue nicht gültig"
done

stop_app; trap - EXIT
sleep 1
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then fail "Server auf Port $PORT läuft noch"; fi

# ---------------------------------------------------------------- 5. Aufräumen + Start-Vermerk prüfen
say "Entferne macOS-Binärdateien, Protokoll und Build-Cache"
for d in $MAC_NATIVE; do rm -rf "$PKG/$d"; done
rm -rf "$PKG/start.log" "$PKG/scripts/__pycache__" "$PKG/.next/cache" "$PKG/tsconfig.tsbuildinfo"
left="$(find "$PKG/node_modules" -maxdepth 2 -type d -name '*darwin*' | wc -l | tr -d ' ')"
[ "$left" = "0" ] || fail "macOS-Binärdateien noch vorhanden"

(cd "$PKG" && python3 -B -c '
import sys; sys.path.insert(0, "scripts"); import start
s = start.read_state()
i, b = start.needs_install(s), start.needs_build(s, start.project_fingerprint(), False)
print("Start-Vermerk:", s); print("Installation nötig:", i, "| Build nötig:", b)
sys.exit(1 if (i or b) else 0)
') || fail "Start-Vermerk passt nicht — Windows würde installieren oder neu bauen"
rm -rf "$PKG/scripts/__pycache__"

# keine Claude-/Entwicklungsdateien im Paket
for f in "${DEV_FILES[@]}"; do [ ! -e "$PKG/$f" ] || fail "Entwicklungsdatei im Paket: $f"; done
[ -z "$(find "$PKG/src" -name '*.test.ts*' | head -1)" ] || fail "Testdateien in src/"
[ -f "$PKG/.next/BUILD_ID" ] || fail ".next/BUILD_ID fehlt (vorgebaute Anwendung)"

# ---------------------------------------------------------------- 6. ZIP
DATE="$(date +%Y-%m-%d)"
ZIP="$OUT_DIR/$PREFIX-$DATE.zip"
n=2
while [ -e "$ZIP" ]; do ZIP="$OUT_DIR/$PREFIX-$DATE-v$n.zip"; n=$((n + 1)); done
say "Erzeuge $ZIP"
(cd "$WORK" && zip -r -q -X "$ZIP" "$NAME")
ls -la "$ZIP"
unzip -l "$ZIP" | tail -1
echo
echo "FERTIG: $ZIP"
echo "Projektstand: $(git -C "$REPO" log --oneline -1)"
if [ -n "$REUSED" ]; then echo "node_modules: übernommen aus $(basename "$REUSED")"; else echo "node_modules: neu installiert (npm ci win32/x64)"; fi
