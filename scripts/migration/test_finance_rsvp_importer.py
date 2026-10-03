import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from finance_rsvp_importer import ImportError, load_manifest, run_import


class FinanceRsvpImporterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.finance = self.root / 'finance.json'
        self.events = self.root / 'rsvp-events.json'
        self.responses = self.root / 'rsvp-responses.jsonl'
        self.finance.write_text(
            json.dumps([{
                'source_id': 'nid:booking-1',
                'data': {'amount': '25.00', 'category': 'membership'},
                'references': [{'collection': 'users', 'source_id': 'uid:7'}],
            }]),
            encoding='utf-8',
        )
        self.events.write_text(json.dumps([{
            'source_id': 'rid:10',
            'data': {'response_deadline': '2026-09-01T12:00:00Z'},
            'references': [{'collection': 'team-events', 'source_id': 'nid:42'}],
        }]), encoding='utf-8')
        self.responses.write_text(json.dumps({
            'source_id': 'invite:11',
            'data': {'response': 'yes', 'guest_count': 1},
            'references': [{'collection': 'rsvp-events', 'source_id': 'rid:10'}],
        }) + '\n', encoding='utf-8')
        self.manifest = self.root / 'manifest.json'
        self.manifest.write_text(json.dumps({'collections': [
            {'name': 'finance', 'path': str(self.finance), 'sha256': hashlib.sha256(self.finance.read_bytes()).hexdigest()},
            {'name': 'rsvp-events', 'path': str(self.events)},
            {'name': 'rsvp-responses', 'path': str(self.responses)},
        ]}), encoding='utf-8')
        self.state = self.root / 'state.json'

    def tearDown(self):
        self.temp.cleanup()

    def test_dry_run_maps_records_and_reports_unresolved_references(self):
        report = run_import(load_manifest(self.manifest), self.state, dry_run=True)
        self.assertEqual(report['collections']['finance']['creates'], 1)
        self.assertEqual(report['collections']['rsvp-responses']['creates'], 1)
        self.assertEqual(len(report['unresolved_references']), 2)
        self.assertFalse(self.state.exists())

    def test_apply_is_repeatable_and_non_destructive(self):
        sources = load_manifest(self.manifest)
        run_import(sources, self.state, dry_run=False)
        report = run_import(sources, self.state, dry_run=False)
        self.assertEqual(report['collections']['finance']['unchanged'], 1)
        saved = json.loads(self.state.read_text(encoding='utf-8'))
        self.assertIn('nid:booking-1', saved['collections']['finance'])

    def test_raw_tokens_are_rejected(self):
        self.responses.write_text(json.dumps({
            'source_id': 'invite:12',
            'data': {'response': 'none', 'token': 'never-store-this'},
        }), encoding='utf-8')
        with self.assertRaises(ImportError):
            run_import(load_manifest(self.manifest), self.state, dry_run=False)
        self.assertFalse(self.state.exists())

    def test_invalid_response_state_is_rejected(self):
        self.responses.write_text(json.dumps({
            'source_id': 'invite:12',
            'data': {'response': 'unknown', 'guest_count': 0},
        }), encoding='utf-8')
        with self.assertRaises(ImportError):
            run_import(load_manifest(self.manifest), self.state, dry_run=True)


if __name__ == '__main__':
    unittest.main()
