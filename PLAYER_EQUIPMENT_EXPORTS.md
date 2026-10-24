# Player equipment and pharmaceutical exports

The Progression Ledger owns these records. This maintenance exporter uses the
existing connected Google Drive and GitHub tools. No new service account,
public spreadsheet, backend deployment or player permission is needed.

## Sources and scope

- **Equipment** owns shared stock. **M5 Shared Inventory** derives quantities,
  prices and totals. Columns K/L hold the approved public category/notes seeded
  from the existing public file. Origin, price basis and internal inventory notes
  in A/I/J are never exported. A new item needs public metadata before export.
- **Pharmaceutical Rules** owns the eight shared player-facing rules.
  The catalog's repeated Mechanics / Campaign Note fields link to those rules.
  Item-specific benefits, downsides, prices and purchase limits stay in the
  existing catalog. The generated clinic fallback reads Hard Reset's price,
  provider and player mechanics from that catalog; it stays appointment-only.
- Outputs: `data/shared-equipment.json` and `pharmaceuticals.js`.
  `purchases.js` already uses the latter for the visible rules and clinic listing.

## Connected maintenance pass

After an authorized relevant edit, fetch fresh metadata and the complete owning
tab bounds. Read these ranges with `get_spreadsheet_range`, rendering
`UNFORMATTED_VALUE`, and save the returned structured JSON **outside this public
repository**:

1. `M5 Shared Inventory`, A1:L through its last used row (currently row 37).
2. `Pharmaceutical Rules`, A1:C9.
3. `Hub Purchase Catalog`, A1:N through its current catalog bounds.

The input JSON is the complete `range`, `majorDimension`, `values` response.
Do not use a partial range, a formatted-value/currency-string export or a
hand-copied public file as the source. Never commit any private input snapshot.

Run from a working copy of this repository:

```bash
python3 tools/build-player-equipment.py \
  --inventory /private/inventory.json \
  --rules /private/rules.json \
  --catalog /private/catalog.json \
  --as-of YYYY-MM-DD --output-dir .
python3 -m unittest discover -s tools -p test_player_equipment.py
node --check pharmaceuticals.js
```

The date is the real export date, not a fictional time advance. The exporter
checks quantities, prices, row totals, owner summary totals, duplicate names,
approved metadata and catalog/shared-rule agreement before writing either file.
It refuses missing/unpriced stock and inconsistent source snapshots.

Compare item identities, quantities, prices, approved notes and drug mechanics
with the before-state. Commit both generated outputs together with any related
cache-version change, then read them back through GitHub. `--check` performs the
same build and compares the existing files without writing them.

This is a connected maintenance path, **not a new background scheduler**. Future
owner changes must run this export as part of their existing completion check;
CI tests the exporter but has no private-Drive access and cannot prove freshness.
This exporter never changes inventory, posts a purchase, releases funds, resumes
News or publishes private source columns.
