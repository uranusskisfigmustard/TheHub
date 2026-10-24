"""No private ledger fixture is stored in the public repository."""
import copy
import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('builder', Path(__file__).with_name('build-player-equipment.py'))
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


def fixtures():
    inv = {'values': [
        ['M5 SHARED INVENTORY'], ['Shared pool; personal purchases excluded.'],
        ['', '', 100, '', '', '', 50, '', '', .5], ['', '', 2, '', '', '', 0, '', '', 0],
        [], [], [], [], [], builder.INVENTORY_HEADERS,
        ['PRIVATE ORIGIN', 'Example tool', 2, 'kit', 50, 100, 50, 'PRICED', 'PRIVATE PRICE BASIS', 'PRIVATE WARDEN NOTE', 'Tools', 'Approved public description'],
    ]}
    rules = {'values': [['Rule ID', 'Applies to', 'Approved player-facing rule']] + [[f'PHARMA-{i:02}', 'Recovery aids', f'Approved rule {i}.'] for i in range(1, 9)]}
    cat = {'values': [['Category', 'Item / Service'] + [''] * 12]}
    for name in ['Ordinary Recovery Aid', 'Borrowed Peace', 'Hard Reset', 'SUSTAIN-9', 'Cold Gospel', 'Needlepoint', 'Stillwater']:
        note = ' '.join(f'Approved rule {i}.' for i in range(2, 9)) if name in {'Ordinary Recovery Aid', 'Borrowed Peace', 'Hard Reset'} else 'Approved rule 1.'
        cat['values'].append(['PHARMACEUTICALS', name, 'PRIVATE SOURCE', '1,000cr per treatment', '', '', 'PRIVATE APPROVAL', 'PRIVATE ADMIN', 'Clinic', note, '', 'CANON', 'PRIVATE QUALIFICATION', 'Approved benefit and downside.'])
    return inv, rules, cat


class PlayerExportTests(unittest.TestCase):
    def test_public_export_omits_private_columns(self):
        inv, rules, cat = fixtures()
        result = builder.outputs(inv, rules, cat, '2026-10-24')
        self.assertNotIn('PRIVATE', ''.join(result.values()))
        self.assertIn('Approved benefit and downside.', result['pharmaceuticals.js'])

    def test_missing_public_metadata_refuses_export(self):
        inv, _, _ = fixtures()
        inv['values'][10][11] = ''
        with self.assertRaisesRegex(ValueError, 'PUBLIC notes'):
            builder.build_inventory(inv, '2026-10-24')

    def test_duplicate_item_refuses_export(self):
        inv, _, _ = fixtures()
        inv['values'].append(copy.deepcopy(inv['values'][10]))
        inv['values'][-1][1] = 'EXAMPLE TOOL'
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            builder.build_inventory(inv, '2026-10-24')

    def test_invalid_quantity_price_and_unpriced_status_refused(self):
        for column, value in [(2, -.5), (2, 1.5), (2, True), (4, float('nan')), (4, '50cr'), (7, 'PRICE PENDING')]:
            with self.subTest(column=column, value=value):
                inv, _, _ = fixtures()
                inv['values'][10][column] = value
                with self.assertRaises(ValueError):
                    builder.build_inventory(inv, '2026-10-24')

    def test_summary_mismatch_refuses_export(self):
        inv, _, _ = fixtures()
        inv['values'][2][2] = 999
        with self.assertRaisesRegex(ValueError, 'summary totals'):
            builder.build_inventory(inv, '2026-10-24')

    def test_unresolved_count_refuses_export(self):
        inv, _, _ = fixtures()
        inv['values'][3][9] = 1
        with self.assertRaisesRegex(ValueError, 'incomplete'):
            builder.build_inventory(inv, '2026-10-24')

    def test_zero_stock_stays_in_audit_export(self):
        inv, _, _ = fixtures()
        inv['values'][10][2] = inv['values'][10][5] = inv['values'][10][6] = 0
        inv['values'][10][7] = 'EXPENDED'
        inv['values'][2][2] = inv['values'][2][6] = inv['values'][3][2] = 0
        self.assertEqual(builder.build_inventory(inv, '2026-10-24')['items'][0]['quantity'], 0)

    def test_catalog_and_shared_rules_must_agree(self):
        _, rules, cat = fixtures()
        cat['values'][1][9] = 'Stale copied rule'
        with self.assertRaisesRegex(ValueError, 'formula disagrees'):
            builder.build_pharmaceuticals(rules, cat)

    def test_clinic_service_does_not_gain_buy_permission(self):
        _, rules, cat = fixtures()
        result = builder.build_pharmaceuticals(rules, cat)['serviceListings'][0]
        self.assertEqual(result['price'], 1000)
        self.assertFalse(result['canPurchase'])
        self.assertTrue(result['serviceOnly'])

    def test_missing_or_unapproved_drug_refuses_export(self):
        for operation in ['missing', 'unapproved']:
            _, rules, cat = fixtures()
            if operation == 'missing':
                cat['values'].pop()
            else:
                cat['values'][-1][11] = 'PROV'
            with self.assertRaises(ValueError):
                builder.build_pharmaceuticals(rules, cat)


if __name__ == '__main__':
    unittest.main()
