#!/usr/bin/env python3
"""
Startskript des DMRL Management Systems (PROJ-19).

Prüft die Voraussetzungen (Python ≥ 3.9, Node.js ≥ 20, xmllint), installiert und baut die Anwendung nur bei Bedarf,
startet sie im Produktionsmodus nur unter localhost und öffnet den Browser.

Aufruf:  python3 scripts/start.py [PORT] [--open | --kein-browser] [--neu-bauen]
Nur Python-Standardbibliothek.
"""

import sys

MIN_PYTHON = (3, 9)
if sys.version_info < MIN_PYTHON:
    sys.stderr.write(
        "Python %d.%d oder neuer wird benötigt (gefunden: %d.%d). Bitte Python aktualisieren.\n"
        % (MIN_PYTHON[0], MIN_PYTHON[1], sys.version_info[0], sys.version_info[1])
    )
    sys.exit(1)

import argparse  # noqa: E402
import atexit  # noqa: E402
import hashlib  # noqa: E402
import json  # noqa: E402
import os  # noqa: E402
import platform  # noqa: E402
import re  # noqa: E402
import shutil  # noqa: E402
import signal  # noqa: E402
import socket  # noqa: E402
import subprocess  # noqa: E402
import time  # noqa: E402
import urllib.request  # noqa: E402
import webbrowser  # noqa: E402
from pathlib import Path  # noqa: E402
from typing import List, Optional, Tuple  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PORT = 8877
MIN_NODE = 20
STATE_FILE = ROOT / ".start-stand.json"
LOG_FILE = ROOT / "start.log"
READY_TIMEOUT_S = 60

# Was das Ergebnis des Builds beeinflusst (Projektstand). Testdateien zählen nicht dazu.
FINGERPRINT_DIRS = ["src", "public", "schemas"]
FINGERPRINT_FILES = [
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "components.json",
]
IGNORED_PATTERN = re.compile(r"\.test\.(ts|tsx)$|(^|/)\.DS_Store$")


class StartError(Exception):
    """Abbruch mit verständlicher Meldung (Exit-Code 1)."""


# ---------------------------------------------------------------- Ausgabe


def say(message: str, end: str = "\n") -> None:
    print(message, end=end, flush=True)


def step(message: str) -> None:
    say(f"{message} …", end=" ")


def ok(text: str = "ok") -> None:
    say(text)


# ---------------------------------------------------------------- Betriebssystem und Hinweise


def os_name() -> str:
    system = platform.system()
    if system == "Darwin":
        return "macos"
    if system == "Windows":
        return "windows"
    return "linux"


NODE_HINT = {
    "macos": "Node.js (Version 20 oder neuer) installieren: https://nodejs.org (LTS-Installer) oder mit Homebrew: brew install node",
    "windows": "Node.js (Version 20 oder neuer) installieren: https://nodejs.org (LTS-Installer für Windows), danach das Fenster neu öffnen.",
    "linux": "Node.js (Version 20 oder neuer) installieren, z. B. über die Paketverwaltung oder https://nodejs.org (LTS).",
}

XMLLINT_HINT = {
    "macos": "xmllint ist unter macOS normalerweise vorinstalliert. Falls nicht: Xcode-Befehlszeilenwerkzeuge installieren (xcode-select --install).",
    "windows": (
        "xmllint (libxml2) installieren, z. B. das libxml2-Binärpaket für Windows, und den Ordner mit xmllint.exe in den Systempfad "
        "aufnehmen — oder den Pfad in der Umgebungsvariable XMLLINT_PATH angeben (z. B. C:\\libxml2\\bin\\xmllint.exe)."
    ),
    "linux": "xmllint installieren: Paket libxml2-utils (Debian/Ubuntu: sudo apt install libxml2-utils) bzw. libxml2 (Fedora).",
}


# ---------------------------------------------------------------- Voraussetzungen


def parse_node_version(text: str) -> Optional[Tuple[int, int, int]]:
    match = re.search(r"v?(\d+)\.(\d+)\.(\d+)", text)
    return (int(match.group(1)), int(match.group(2)), int(match.group(3))) if match else None


def run_quiet(command: List[str]) -> Tuple[int, str]:
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        return 1, ""
    return result.returncode, (result.stdout or "") + (result.stderr or "")


def find_node() -> Tuple[str, str]:
    node = shutil.which("node")
    npm = shutil.which("npm")
    hint = NODE_HINT[os_name()]
    if not node or not npm:
        raise StartError(f"Node.js wurde nicht gefunden.\n{hint}")
    code, output = run_quiet([node, "--version"])
    version = parse_node_version(output) if code == 0 else None
    if not version:
        raise StartError(f"Die Version von Node.js konnte nicht ermittelt werden.\n{hint}")
    if version[0] < MIN_NODE:
        raise StartError(f"Node.js {MIN_NODE} oder neuer wird benötigt (gefunden: {'.'.join(map(str, version))}).\n{hint}")
    return node, npm


def find_xmllint() -> str:
    """Gleiche Einstellung wie die XSD-Prüfung der App (PROJ-11): XMLLINT_PATH, sonst Systempfad."""
    configured = os.environ.get("XMLLINT_PATH")
    program = configured or shutil.which("xmllint")
    hint = XMLLINT_HINT[os_name()]
    if not program:
        raise StartError(f"xmllint wurde nicht gefunden (wird für die XSD-Prüfung benötigt).\n{hint}")
    code, _ = run_quiet([program, "--version"])
    if code != 0:
        where = f" unter „{configured}“ (XMLLINT_PATH)" if configured else ""
        raise StartError(f"xmllint{where} lässt sich nicht ausführen.\n{hint}")
    return program


# ---------------------------------------------------------------- Port


def port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.settimeout(0.5)
        if probe.connect_ex((host, port)) == 0:
            return True
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        try:
            server.bind((host, port))
        except OSError:
            return True
    return False


def busy_message(port: int) -> str:
    return f"Port {port} ist belegt — läuft die Anwendung bereits? Dann einfach http://localhost:{port} im Browser öffnen."


# ---------------------------------------------------------------- Stand-Vermerk (Update-Erkennung)


def file_digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else "-"


def project_fingerprint(root: Path = ROOT) -> str:
    """Fingerabdruck des Projektstands: Pfade und Inhalte aller build-relevanten Dateien."""
    digest = hashlib.sha256()
    files: List[Path] = []
    for name in FINGERPRINT_DIRS:
        base = root / name
        if base.is_dir():
            files.extend(p for p in base.rglob("*") if p.is_file())
    files.extend(root / name for name in FINGERPRINT_FILES if (root / name).is_file())
    for path in sorted(files, key=lambda p: p.relative_to(root).as_posix()):
        relative = path.relative_to(root).as_posix()
        if IGNORED_PATTERN.search(relative):
            continue
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def read_state(path: Path = STATE_FILE) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def write_state(state: dict, path: Path = STATE_FILE) -> None:
    path.write_text(json.dumps(state, indent=2), encoding="utf-8")


def needs_install(state: dict, root: Path = ROOT) -> bool:
    return not (root / "node_modules").is_dir() or state.get("lock") != file_digest(root / "package-lock.json")


def needs_build(state: dict, fingerprint: str, force: bool, root: Path = ROOT) -> bool:
    return force or not (root / ".next" / "BUILD_ID").is_file() or state.get("build") != fingerprint


# ---------------------------------------------------------------- Installieren, Bauen


NETWORK_PATTERN = re.compile(r"ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|network|getaddrinfo", re.IGNORECASE)


def app_env() -> dict:
    env = dict(os.environ)
    env["NEXT_TELEMETRY_DISABLED"] = "1"
    return env


def run_logged(command: List[str], title: str) -> None:
    """Ausführliche Ausgabe in die Protokolldatei; bei Fehler die letzten Zeilen anzeigen."""
    with open(LOG_FILE, "a", encoding="utf-8") as log:
        log.write(f"\n===== {time.strftime('%Y-%m-%d %H:%M:%S')} — {title}: {' '.join(command)}\n")
        log.flush()
        code = subprocess.call(command, cwd=ROOT, env=app_env(), stdout=log, stderr=subprocess.STDOUT)
    if code != 0:
        tail = LOG_FILE.read_text(encoding="utf-8", errors="replace").splitlines()[-15:]
        raise StartError(f"{title} ist fehlgeschlagen.\n--- letzte Zeilen aus {LOG_FILE.name} ---\n" + "\n".join(tail) + f"\n--- vollständig: {LOG_FILE}")


def install(npm: str) -> None:
    try:
        run_logged([npm, "ci", "--no-audit", "--no-fund"], "Installation der Pakete")
    except StartError as error:
        log = LOG_FILE.read_text(encoding="utf-8", errors="replace")[-4000:]
        if NETWORK_PATTERN.search(log):
            raise StartError(f"{error}\n\nFür den ersten Start ist eine Internetverbindung nötig.") from None
        raise


def next_cli() -> Path:
    return ROOT / "node_modules" / "next" / "dist" / "bin" / "next"


def build(node: str) -> None:
    # Direkt mit dem gefundenen Node bauen statt „npm run build“: die npm-Hilfsdateien (.cmd) suchen „node“ erneut
    # im Systempfad, was z. B. bei einer portablen Node-Installation unter Windows scheitert.
    try:
        run_logged([node, str(next_cli()), "build"], "Bauen der Anwendung")
    except StartError as error:
        raise StartError(f"{error}\n\nTipp: Mit „--neu-bauen“ wird der Build vollständig neu erstellt.") from None


# ---------------------------------------------------------------- Starten und Beenden

_server: Optional[subprocess.Popen] = None


def stop_server() -> None:
    global _server
    process, _server = _server, None
    if not process or process.poll() is not None:
        return
    try:
        if os_name() == "windows":
            subprocess.call(["taskkill", "/F", "/T", "/PID", str(process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        try:
            if os_name() != "windows":
                os.killpg(process.pid, signal.SIGKILL)
            else:
                process.kill()
        except OSError:
            pass


def start_server(node: str, port: int) -> subprocess.Popen:
    next_bin = next_cli()
    if not next_bin.is_file():
        raise StartError("Next.js wurde nicht gefunden. Bitte mit „--neu-bauen“ erneut starten.")
    # nur an localhost gebunden (127.0.0.1) — aus dem Netzwerk nicht erreichbar
    command = [node, str(next_bin), "start", "-H", "127.0.0.1", "-p", str(port)]
    kwargs: dict = {"cwd": ROOT, "env": app_env()}
    if os_name() != "windows":
        kwargs["start_new_session"] = True  # eigene Prozessgruppe → sauber mitstoppen
    with open(LOG_FILE, "a", encoding="utf-8") as log:
        log.write(f"\n===== {time.strftime('%Y-%m-%d %H:%M:%S')} — Start: {' '.join(command)}\n")
    log_handle = open(LOG_FILE, "a", encoding="utf-8")
    return subprocess.Popen(command, stdout=log_handle, stderr=subprocess.STDOUT, **kwargs)


# Ohne Proxy: Python übernimmt sonst Proxy-Einstellungen (HTTP_PROXY, unter Windows auch die Registry) und würde
# die Anfrage an localhost über einen Firmen-Proxy leiten — die laufende Anwendung gälte dann als „nicht gestartet“.
LOCAL_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def wait_until_ready(port: int, process: subprocess.Popen, timeout: float = READY_TIMEOUT_S) -> bool:
    deadline = time.monotonic() + timeout
    url = f"http://127.0.0.1:{port}/anmelden"
    while time.monotonic() < deadline:
        if process.poll() is not None:
            return False
        try:
            with LOCAL_OPENER.open(url, timeout=2) as response:  # noqa: S310 (nur localhost)
                if response.status < 500:
                    return True
        except OSError:
            pass
        time.sleep(0.5)
    return False


def install_signal_handlers() -> None:
    def handler(_signum, _frame):
        raise KeyboardInterrupt

    # SIGINT ausdrücklich setzen: ein geerbtes „ignorieren" (z. B. Start aus einem Hintergrundprozess) würde Strg+C sonst verschlucken
    for name in ("SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"):
        sig = getattr(signal, name, None)
        if sig is not None:
            try:
                signal.signal(sig, handler)
            except (OSError, ValueError):
                pass


# ---------------------------------------------------------------- Ablauf


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Startet das DMRL Management System lokal.")
    parser.add_argument("port", nargs="?", type=int, default=DEFAULT_PORT, help=f"Port (Standard {DEFAULT_PORT})")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--open", dest="browser", action="store_true", default=True, help="Browser öffnen (Standard)")
    group.add_argument("--kein-browser", dest="browser", action="store_false", help="keinen Browser öffnen")
    parser.add_argument("--neu-bauen", action="store_true", help="Anwendung neu bauen")
    args = parser.parse_args(argv)
    if not 1024 <= args.port <= 65535:
        parser.error("Der Port muss zwischen 1024 und 65535 liegen.")
    return args


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    os.chdir(ROOT)  # Schemas werden relativ zum Projektordner gesucht (PROJ-11)
    say("DMRL Management System — Lokaler Start")

    step("Prüfe Voraussetzungen")
    node, npm = find_node()
    find_xmllint()
    ok()

    step(f"Prüfe Port {args.port}")
    if port_in_use(args.port):
        say("belegt")
        raise StartError(busy_message(args.port))
    ok("frei")
    if args.port != DEFAULT_PORT:
        say(f"Hinweis: Unter Port {args.port} gilt im Browser ein eigener Datenbestand (die Daten von Port {DEFAULT_PORT} sind dort nicht sichtbar).")

    state = read_state()
    if needs_install(state):
        step("Installiere Pakete (einmalig, kann einige Minuten dauern)")
        install(npm)
        state["lock"] = file_digest(ROOT / "package-lock.json")
        state.pop("build", None)
        write_state(state)
        ok()

    fingerprint = project_fingerprint()
    if needs_build(state, fingerprint, args.neu_bauen):
        step("Baue Anwendung (kann einige Minuten dauern)")
        if args.neu_bauen:
            shutil.rmtree(ROOT / ".next", ignore_errors=True)
        build(node)
        state["build"] = fingerprint
        write_state(state)
        ok()
    else:
        say("Anwendung ist aktuell — kein Neubau nötig.")

    step("Starte Anwendung")
    global _server
    install_signal_handlers()
    atexit.register(stop_server)
    _server = start_server(node, args.port)
    if not wait_until_ready(args.port, _server):
        stop_server()
        raise StartError(f"Die Anwendung ist nicht gestartet. Details in {LOG_FILE}.\nTipp: Mit „--neu-bauen“ erneut versuchen.")
    ok()

    url = f"http://localhost:{args.port}"
    if args.browser:
        try:
            opened = webbrowser.open(url)
        except webbrowser.Error:
            opened = False
        if not opened:
            say(f"Der Browser konnte nicht geöffnet werden — bitte {url} manuell aufrufen.")
    say(f"\nAnwendung läuft unter {url} — Beenden mit Strg+C oder Fenster schließen")

    try:
        while _server and _server.poll() is None:
            time.sleep(0.5)
    except KeyboardInterrupt:
        say("\nBeende Anwendung …", end=" ")
        stop_server()
        ok("beendet. Die Daten bleiben im Browser erhalten.")
        return 0
    raise StartError(f"Die Anwendung wurde unerwartet beendet. Details in {LOG_FILE}.")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except StartError as error:
        say(f"\nFEHLER: {error}")
        sys.exit(1)
    except KeyboardInterrupt:
        stop_server()
        sys.exit(130)
