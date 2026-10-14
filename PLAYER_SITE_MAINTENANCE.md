# Player console page checklist

All player-facing pages in TheHub must expose the unobtrusive bottom-right
"//" link to warden.html. This is a standing site rule.

The link is owned by **player-shell.js** and styled in **player-shell.css**.
Do not manually copy it to new pages: the shared shell adds it automatically
and avoids duplicates from the older Contracts and Classifieds markup.

When adding a player page:

1. Put its HTML in the repository root.
2. Register its page ID, URL, and navigation group in player-routes.js.
3. Give its <body> the matching data-page attribute and include
   <div id="playerShell"></div>.
4. Load player-shell.css, player-routes.js, and player-shell.js;
   player-routes.js must load before player-shell.js.
5. Update script/style cache versions as appropriate, and check mobile layout.
6. Run: python3 tools/check-player-pages.py

GitHub Actions runs this check on changes to player pages or shared navigation
assets and flags missing or broken shortcut wiring. It also ensures that newly
added root HTML pages cannot silently be omitted from the player navigation.
Only the listed legacy Warden, template, and test HTML files are exempt.

GitHub Actions detects problems but does not, by itself, prevent direct pushes
or deployment unless repository protections require its check to pass.
