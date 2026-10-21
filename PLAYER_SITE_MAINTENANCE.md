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

## NPCs & Factions notebook

`contacts.html` is the player directory under Reference. Its only content source
is the curated `data/player-contacts.json`; it must never fetch or fall back to
Warden NPC/faction endpoints or export private records and hide them in the UI.
The entire JSON file, all rendered text, and all source code are public.

Add someone after an actual encounter or established player-facing introduction,
not when a future mission is generated. Use completed play and already-published
between-session scenes. Keep unplayed mission casts and unrevealed affiliations,
motives, statistics and future plans out of this file.

For every note, record the characters who know it and a short public source
label. Use `known` for established experience, `reported` for an attributed claim,
`suspected` only for an actual recorded player theory, and `unconfirmed` for an
unresolved question. Never invent a theory or turn an NPC's claim into truth.
Personal notes remain attributed; the default view collects published notes and
does not claim that every character knows everything. Connections include care,
work and contact; they are not an assertion of employment or secret membership.

Do not link Warden-only source documents from this page or its public data.
Review both names and prose for spoilers before publishing. Then run:

```
python3 tools/check-player-pages.py
python3 tools/check-player-contacts.py
node --check contacts.js
```

Keep the page responsive, keyboard accessible, and test search, character/note
filters, group links, empty results and unavailable/malformed data. Shared shell
navigation supplies the Warden shortcut here too.

Portraits are optional `portrait` paths in the public JSON, restricted to local
`assets/portraits/` images. Use an established matching NPC portrait; review the
image itself for unrevealed information. Keep original artwork and attribution
intact. Missing portraits use initials, and failed images fall back gracefully.
The directory opens one profile at a time; anchors still link directly to people
and groups. Check profile selection and browser history when changing its layout.


## Shared equipment

`equipment.html` is the Shared Equipment page under Gear & Market.
`data/shared-equipment.json` is a curated player-facing snapshot of the
Progression Ledger shared inventory. Update the ledger first, then republish
the approved item names, quantities, unit prices and public notes in this JSON.
The page calculates market totals and 50% resale totals from quantity × unit price.
This is a published snapshot, not a live connection to the private ledger.

Keep one row per item/profile, combine shared issue and salvage counts, and
exclude personal purchases. Quantities can represent kits, sets or full reload
equivalents; explain these in the public notes. Loaded ammunition is included
in weapon value, and spare ammunition has separate entries. Preserve zero-count
expended entries for the optional history view. Never publish private spreadsheet
URLs, Warden notes or price-development conversations.

After changing the data, update its `updated` date and asset cache version.
Run `python3 tools/check-player-pages.py` and `node --check equipment.js`.
