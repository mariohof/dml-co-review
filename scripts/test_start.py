"""Unit-Tests des Startskripts (PROJ-19) — Aufruf: python3 -m unittest discover -s scripts -p "test_*.py" """

import json
import socket
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import start  # noqa: E402


class VersionTests(unittest.TestCase):
    def test_parse_node_version(self):
        self.assertEqual(start.parse_node_version("v20.11.1\n"), (20, 11, 1))
        self.assertEqual(start.parse_node_version("v26.8.1"), (26, 8, 1))
        self.assertIsNone(start.parse_node_version("kein node"))

    def test_node_missing_or_too_old(self):
        with mock.patch.object(start.shutil, "which", return_value=None):
            with self.assertRaisesRegex(start.StartError, "Node.js wurde nicht gefunden"):
                start.find_node()
        with mock.patch.object(start.shutil, "which", return_value="/usr/bin/node"), mock.patch.object(
            start, "run_quiet", return_value=(0, "v18.19.0")
        ):
            with self.assertRaisesRegex(start.StartError, r"Node.js 20 oder neuer wird benötigt \(gefunden: 18.19.0\)"):
                start.find_node()
        with mock.patch.object(start.shutil, "which", return_value="/usr/bin/node"), mock.patch.object(
            start, "run_quiet", return_value=(0, "v20.0.0")
        ):
            self.assertEqual(start.find_node(), ("/usr/bin/node", "/usr/bin/node"))

    def test_xmllint_missing_with_os_hint(self):
        with mock.patch.dict(start.os.environ, {}, clear=True), mock.patch.object(start.shutil, "which", return_value=None):
            for system, expected in [("Darwin", "xcode-select"), ("Linux", "libxml2-utils"), ("Windows", "XMLLINT_PATH")]:
                with mock.patch.object(start.platform, "system", return_value=system):
                    with self.assertRaisesRegex(start.StartError, expected):
                        start.find_xmllint()

    def test_xmllint_from_setting(self):
        with mock.patch.dict(start.os.environ, {"XMLLINT_PATH": "/nicht/da/xmllint"}):
            with self.assertRaisesRegex(start.StartError, "XMLLINT_PATH"):
                start.find_xmllint()


class PortTests(unittest.TestCase):
    def test_busy_and_free_port(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
            server.bind(("127.0.0.1", 0))
            server.listen(1)
            port = server.getsockname()[1]
            self.assertTrue(start.port_in_use(port))
        self.assertFalse(start.port_in_use(port))

    def test_busy_message(self):
        self.assertEqual(
            start.busy_message(8877),
            "Port 8877 ist belegt — läuft die Anwendung bereits? Dann einfach http://localhost:8877 im Browser öffnen.",
        )


class OptionTests(unittest.TestCase):
    def test_defaults_and_options(self):
        args = start.parse_args([])
        self.assertEqual((args.port, args.browser, args.neu_bauen), (8877, True, False))
        args = start.parse_args(["8900", "--kein-browser", "--neu-bauen"])
        self.assertEqual((args.port, args.browser, args.neu_bauen), (8900, False, True))
        self.assertTrue(start.parse_args(["--open"]).browser)
        with self.assertRaises(SystemExit), mock.patch("sys.stderr"):
            start.parse_args(["80"])


class FingerprintTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "src").mkdir()
        (self.root / "src" / "page.tsx").write_text("a", encoding="utf-8")
        (self.root / "package-lock.json").write_text("{}", encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def test_fingerprint_changes_with_project_but_not_with_tests(self):
        first = start.project_fingerprint(self.root)
        (self.root / "src" / "page.test.tsx").write_text("test", encoding="utf-8")
        self.assertEqual(start.project_fingerprint(self.root), first)
        (self.root / "src" / "page.tsx").write_text("b", encoding="utf-8")
        self.assertNotEqual(start.project_fingerprint(self.root), first)
        # Pfade mit Leerzeichen und Umlauten
        (self.root / "public" / "Prüfung Ordner").mkdir(parents=True)
        (self.root / "public" / "Prüfung Ordner" / "ä.txt").write_text("x", encoding="utf-8")
        self.assertIsInstance(start.project_fingerprint(self.root), str)

    def test_install_and_build_only_when_needed(self):
        lock = start.file_digest(self.root / "package-lock.json")
        self.assertTrue(start.needs_install({}, self.root))  # keine node_modules
        (self.root / "node_modules").mkdir()
        self.assertTrue(start.needs_install({"lock": "alt"}, self.root))
        self.assertFalse(start.needs_install({"lock": lock}, self.root))

        fingerprint = start.project_fingerprint(self.root)
        self.assertTrue(start.needs_build({"build": fingerprint}, fingerprint, False, self.root))  # kein Build vorhanden
        (self.root / ".next").mkdir()
        (self.root / ".next" / "BUILD_ID").write_text("x", encoding="utf-8")
        self.assertFalse(start.needs_build({"build": fingerprint}, fingerprint, False, self.root))
        self.assertTrue(start.needs_build({"build": fingerprint}, fingerprint, True, self.root))  # --neu-bauen
        self.assertTrue(start.needs_build({"build": "alt"}, fingerprint, False, self.root))  # Update

    def test_state_roundtrip(self):
        path = self.root / ".start-stand.json"
        self.assertEqual(start.read_state(path), {})
        start.write_state({"lock": "a", "build": "b"}, path)
        self.assertEqual(json.loads(path.read_text(encoding="utf-8")), {"lock": "a", "build": "b"})
        path.write_text("kaputt", encoding="utf-8")
        self.assertEqual(start.read_state(path), {})


class MainTests(unittest.TestCase):
    def test_missing_prerequisite_aborts_before_install_or_start(self):
        with mock.patch.object(start, "find_node", side_effect=start.StartError("Node.js wurde nicht gefunden.")), mock.patch.object(
            start, "install"
        ) as install, mock.patch.object(start, "start_server") as server:
            with self.assertRaises(start.StartError):
                start.main(["--kein-browser"])
            install.assert_not_called()
            server.assert_not_called()

    def test_busy_port_aborts(self):
        with mock.patch.object(start, "find_node", return_value=("node", "npm")), mock.patch.object(
            start, "find_xmllint", return_value="xmllint"
        ), mock.patch.object(start, "port_in_use", return_value=True), mock.patch.object(start, "start_server") as server:
            with self.assertRaisesRegex(start.StartError, "Port 8877 ist belegt"):
                start.main(["--kein-browser"])
            server.assert_not_called()


class WindowsRobustnessTests(unittest.TestCase):
    """Fehler vom Windows-11-Rechner (Firmen-Proxy, portable Node-Installation)."""

    def test_ready_check_ignores_proxy_settings(self):
        import http.server
        import threading

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                self.end_headers()

            def log_message(self, *args):
                pass

        server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        process = mock.Mock()
        process.poll.return_value = None
        try:
            # Proxy zeigt ins Leere — die Prüfung auf localhost darf ihn nicht verwenden
            with mock.patch.dict(start.os.environ, {"HTTP_PROXY": "http://127.0.0.1:9", "http_proxy": "http://127.0.0.1:9"}):
                self.assertTrue(start.wait_until_ready(server.server_address[1], process, timeout=5))
        finally:
            server.shutdown()
            server.server_close()

    def test_found_xmllint_is_passed_to_app_as_full_path(self):
        with mock.patch.dict(start.os.environ, {}, clear=False), mock.patch.object(
            start.shutil, "which", return_value="C:/tools/xmllint/bin/xmllint.exe"
        ), mock.patch.object(start, "run_quiet", return_value=(0, "xmllint using libxml version 20903")):
            start.os.environ.pop("XMLLINT_PATH", None)
            found = start.find_xmllint()
        self.assertTrue(Path(found).is_absolute())
        self.assertTrue(found.endswith("xmllint.exe"))
        with mock.patch.object(start.subprocess, "Popen") as popen, mock.patch.object(Path, "is_file", return_value=True), mock.patch(
            "builtins.open", mock.mock_open()
        ):
            start.start_server("node", 8877, found)
        self.assertEqual(popen.call_args.kwargs["env"]["XMLLINT_PATH"], found)

    def test_build_uses_found_node_directly(self):
        with mock.patch.object(start, "run_logged") as run_logged:
            start.build("C:\\tools\\node\\node.EXE")
        command = run_logged.call_args[0][0]
        self.assertEqual(command[0], "C:\\tools\\node\\node.EXE")
        self.assertEqual(command[1:], [str(start.next_cli()), "build"])


if __name__ == "__main__":
    unittest.main()
