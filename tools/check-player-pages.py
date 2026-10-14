#!/usr/bin/env python3
"""Check that every player-facing HTML page inherits the Warden shortcut.

Run from any directory: python3 tools/check-player-pages.py

New player pages belong at the repository root, must be registered in
player-routes.js, and must use the shared player shell and stylesheet.
Exemptions are deliberately explicit; adding a new standalone template
requires reviewing this list.
"""

from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
NON_PLAYER_HTML = {
    "board-core.html",       # Historical page template
    "board-layer-v1.html",   # Historical page template
    "terminal-trial.html",   # Test-only interface
    "warden.html",
    "warden-base-v1.html",
    "warden-v11.html",
    "warden-audio.html",
}
ROUTE_RE = re.compile(
    r"\{\s*id:\s*'([^']+)',\s*label:\s*'[^']+',\s*href:\s*'([^']+)'",
    re.S,
)


class PlayerPageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.page_id = None
        self.shell_mount = False
        self.scripts = []
        self.stylesheets = []
        self.shortcuts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "body":
            self.page_id = attrs.get("data-page")
        if attrs.get("id") == "playerShell":
            self.shell_mount = True
        if tag == "script" and attrs.get("src"):
            self.scripts.append(Path(urlsplit(attrs["src"]).path).name)
        if tag == "link" and "stylesheet" in (attrs.get("rel") or "").split():
            self.stylesheets.append(Path(urlsplit(attrs.get("href") or "").path).name)
        if tag == "a" and "warden-shortcut" in (attrs.get("class") or "").split():
            self.shortcuts.append(attrs.get("href"))


def run():
    errors = []
    routes_path = ROOT / "player-routes.js"
    shell_path = ROOT / "player-shell.js"
    css_path = ROOT / "player-shell.css"
    for path in (routes_path, shell_path, css_path):
        if not path.is_file():
            errors.append(f"Missing shared player asset: {path.name}")
    if errors:
        return errors, 0

    routes = ROUTE_RE.findall(routes_path.read_text(encoding="utf-8"))
    if not routes:
        errors.append("No pages could be parsed from player-routes.js")
    route_files = {}
    for page_id, href in routes:
        target = urlsplit(href).path
        if target in ("", ".", "./"):
            target = "index.html"
        elif "/" in target:
            errors.append(f"Route {page_id!r} is not a root player page: {href}")
            continue
        if target in route_files:
            errors.append(f"Two routes map to the same page: {target}")
        route_files[target] = page_id

    shell = shell_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8")
    expected_shell = (
        "function installWardenShortcut()",
        "document.querySelector('a.warden-shortcut')",
        "shortcut.href = 'warden.html'",
        "shortcut.textContent = '//'",
        "document.body.appendChild(shortcut)",
        "installWardenShortcut();",
    )
    for fragment in expected_shell:
        if fragment not in shell:
            errors.append(f"Shared shell has lost Warden shortcut behavior: {fragment}")
    if not re.search(r"\.warden-shortcut\s*\{[^}]*position:\s*fixed", css, re.S):
        errors.append("Shared CSS no longer positions the Warden shortcut")

    player_files = sorted(
        path for path in ROOT.glob("*.html")
        if path.name not in NON_PLAYER_HTML
    )
    discovered = {path.name for path in player_files}
    for name in sorted(set(route_files) - discovered):
        errors.append(f"Player route refers to a missing HTML page: {name}")
    for path in player_files:
        page = PlayerPageParser()
        page.feed(path.read_text(encoding="utf-8"))
        if path.name not in route_files:
            errors.append(f"{path.name}: not registered in player-routes.js")
        if not page.page_id:
            errors.append(f"{path.name}: <body> missing data-page")
        elif page.page_id != route_files.get(path.name):
            errors.append(
                f"{path.name}: data-page={page.page_id!r} does not match its route"
            )
        if not page.shell_mount:
            errors.append(f"{path.name}: missing #playerShell mount")
        if "player-shell.css" not in page.stylesheets:
            errors.append(f"{path.name}: missing shared player-shell.css")
        if "player-routes.js" not in page.scripts:
            errors.append(f"{path.name}: missing player-routes.js")
        if "player-shell.js" not in page.scripts:
            errors.append(f"{path.name}: missing player-shell.js (and Warden link)")
        if "player-routes.js" in page.scripts and "player-shell.js" in page.scripts:
            if page.scripts.index("player-routes.js") > page.scripts.index("player-shell.js"):
                errors.append(f"{path.name}: player-routes.js must load before player-shell.js")
        if len(page.shortcuts) > 1:
            errors.append(f"{path.name}: multiple static Warden shortcuts")
        if any(href != "warden.html" for href in page.shortcuts):
            errors.append(f"{path.name}: Warden shortcut has an incorrect destination")

    return errors, len(player_files)


if __name__ == "__main__":
    problems, count = run()
    if problems:
        for problem in problems:
            print(f"ERROR: {problem}", file=sys.stderr)
        sys.exit(1)
    print(f"OK: all {count} player pages inherit one Warden console shortcut.")
