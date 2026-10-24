#!/usr/bin/env python3
"""Build allowlisted player exports from private, unformatted connector snapshots.

Inputs must stay outside the public repository. This script does not authenticate,
publish, change stock, or post purchases; the connected maintenance pass does that.
"""
import argparse
from datetime import date
from decimal import Decimal, InvalidOperation
import json
from pathlib import Path
import re


INVENTORY_HEADERS = [
    'Origin', 'Item', 'Quantity', 'Count unit', 'Market price / unit',
    'Market total', 'Resale total', 'Valuation status', 'Price basis',
    'Inventory / ammunition notes', 'Public category', 'Approved public notes',
]
CENT = Decimal('0.01')


def text(value, field):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'{field}: required text missing')
    return value.strip()


def number(value, field):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f'{field}: read UNFORMATTED_VALUE numeric cells')
    try:
        result = Decimal(str(value))
    except InvalidOperation as exc:
        raise ValueError(f'{field}: invalid number') from exc
    if not result.is_finite() or result < 0:
        raise ValueError(f'{field}: nonnegative finite number required')
    return result


def json_number(value):
    return int(value) if value == value.to_integral_value() else float(value)


def values(snapshot):
    rows = snapshot.get('values')
    if not isinstance(rows, list) or not rows or any(not isinstance(r, list) for r in rows):
        raise ValueError('Expected the complete get_spreadsheet_range values response')
    return rows


def build_inventory(snapshot, as_of):
    if date.fromisoformat(as_of).isoformat() != as_of:
        raise ValueError('as-of must be YYYY-MM-DD')
    rows = values(snapshot)
    if len(rows) < 11 or rows[9] != INVENTORY_HEADERS:
        raise ValueError('Expected M5 Shared Inventory A1:L, including public metadata')
    if 'personal purchases excluded' not in str(rows[1]).lower():
        raise ValueError('Shared-pool exclusion is not established')
    if number(rows[2][9], 'resale rate') != Decimal('0.5'):
        raise ValueError('Expected approved 50% resale rate')
    items, names, total, units = [], set(), Decimal(0), 0
    for row_index, raw in enumerate(rows[10:], 11):
        row = raw + [None] * max(0, 12 - len(raw))
        if not any(v not in (None, '') for v in row):
            continue
        name = text(row[1], f'row {row_index} item')
        if name.casefold() in names:
            raise ValueError(f'Duplicate item: {name}')
        names.add(name.casefold())
        quantity = number(row[2], f'{name} quantity')
        if quantity != quantity.to_integral_value():
            raise ValueError(f'{name}: whole quantity required')
        price = number(row[4], f'{name} price')
        if price != price.quantize(CENT):
            raise ValueError(f'{name}: price must use whole credits or cents')
        market = quantity * price
        resale = market / 2
        if number(row[5], f'{name} market total') != market or number(row[6], f'{name} resale total') != resale:
            raise ValueError(f'{name}: calculated totals disagree')
        if row[7] != ('EXPENDED' if quantity == 0 else 'PRICED'):
            raise ValueError(f'{name}: unresolved valuation')
        items.append({
            'item': name, 'quantity': int(quantity),
            'unit': text(row[3], f'{name} count unit'),
            'marketPrice': json_number(price),
            'notes': text(row[11], f'{name} approved PUBLIC notes'),
            'category': text(row[10], f'{name} PUBLIC category'),
        })
        total += market
        units += int(quantity)
    if not items:
        raise ValueError('Empty inventory is not a valid shared-pool export')
    if number(rows[2][2], 'market summary') != total or number(rows[2][6], 'resale summary') != total / 2:
        raise ValueError('Inventory rows disagree with owning summary totals')
    if number(rows[3][2], 'count summary') != units or number(rows[3][6], 'unpriced count') != 0 or number(rows[3][9], 'unknown count') != 0:
        raise ValueError('Inventory incomplete or count summary disagrees')
    return {'updated': as_of, 'scope': 'M5 issue and retained mercenary salvage', 'resaleRate': 0.5, 'items': items}


def build_pharmaceuticals(rule_snapshot, catalog_snapshot):
    rows = values(rule_snapshot)
    if rows[0] != ['Rule ID', 'Applies to', 'Approved player-facing rule']:
        raise ValueError('Expected Pharmaceutical Rules A1:C')
    rules, ids = [], set()
    for row in rows[1:]:
        if not any(v not in (None, '') for v in row):
            continue
        if len(row) < 3 or not re.fullmatch(r'PHARMA-\d{2}', str(row[0])) or row[0] in ids:
            raise ValueError('Missing or duplicate pharmaceutical rule ID')
        ids.add(row[0])
        rules.append(text(row[2], 'player-facing pharmaceutical rule'))
    if len(rules) != 8 or ids != {f'PHARMA-{n:02}' for n in range(1, 9)}:
        raise ValueError('Expected the eight approved shared rules; review schema before extending')
    catalog = values(catalog_snapshot)
    if catalog[0][:2] != ['Category', 'Item / Service'] or len(catalog[0]) != 14:
        raise ValueError('Expected Hub Purchase Catalog A1:N')
    enhancements = {'Ordinary Recovery Aid', 'Borrowed Peace', 'Hard Reset'}
    other_aids = {'SUSTAIN-9', 'Cold Gospel', 'Needlepoint', 'Stillwater'}
    found, hard_reset = set(), None
    for index, raw in enumerate(catalog[1:], 2):
        row = raw + [None] * max(0, 14 - len(raw))
        name = row[1]
        if name not in enhancements | other_aids:
            continue
        if name in found or row[0] != 'PHARMACEUTICALS' or row[11] != 'CANON':
            raise ValueError('Duplicated or unapproved pharmaceutical listing')
        found.add(name)
        expected = ' '.join(rules[1:]) if name in enhancements else rules[0]
        if row[9] != expected:
            raise ValueError(f'{name}: catalog rule formula disagrees with the shared owner')
        if name == 'Hard Reset':
            match = re.fullmatch(r'([\d,]+)cr per treatment', str(row[3]))
            if not match:
                raise ValueError('Review Hard Reset price format before exporting')
            hard_reset = {
                'catalogRow': index, 'category': 'PHARMACEUTICALS', 'item': name,
                'price': int(match[1].replace(',', '')), 'priceLabel': row[3],
                'mechanics': text(row[13], 'Hard Reset player mechanics'),
                'provider': text(row[8], 'Hard Reset provider'),
                'restricted': False, 'canPurchase': False, 'serviceOnly': True,
                'accessState': 'clinic_appointment', 'minimumAccess': '', 'progressStanding': '',
            }
    if found != enhancements | other_aids or not hard_reset or hard_reset['price'] <= 0:
        raise ValueError('Expected all seven approved listings and a valid clinic service')
    return {'category': 'PHARMACEUTICALS', 'serviceListings': [hard_reset], 'rules': rules}


def outputs(inventory, rules, catalog, as_of):
    # Validate BOTH inputs before any output is written.
    equipment = build_inventory(inventory, as_of)
    pharma = build_pharmaceuticals(rules, catalog)
    return {
        'data/shared-equipment.json': json.dumps(equipment, ensure_ascii=False, indent=2) + '\n',
        'pharmaceuticals.js': "(() => {\n  'use strict';\n  // Generated by tools/build-player-equipment.py from approved ledger views.\n  // Do not hand-edit prices, clinic mechanics or shared rules here.\n  window.HubPharmaceuticals = Object.freeze(" + json.dumps(pharma, ensure_ascii=False, indent=2) + ");\n})();\n",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ('inventory', 'rules', 'catalog'):
        parser.add_argument('--' + key, type=Path, required=True)
    parser.add_argument('--as-of', required=True, help='Real export date; does not advance fiction')
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--check', action='store_true', help='Compare outputs without writing')
    args = parser.parse_args()
    try:
        built = outputs(*(json.loads(getattr(args, key).read_text()) for key in ('inventory', 'rules', 'catalog')), args.as_of)
        mismatches = []
        for name, content in built.items():
            target = args.output_dir / name
            if args.check:
                if not target.is_file() or target.read_text() != content:
                    mismatches.append(name)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(content)
        if mismatches:
            raise ValueError('Stale generated files: ' + ', '.join(mismatches))
    except (ValueError, OSError, KeyError, IndexError) as exc:
        parser.exit(1, f'Export refused: {exc}\n')
    print('Player equipment and pharmaceutical exports verified.' if args.check else 'Player equipment and pharmaceutical exports generated.')


if __name__ == '__main__':
    main()
