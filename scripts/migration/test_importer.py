import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from importer import build_report, load_config, run_import


class ImporterTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        source = self.root / 'users.json'
        source.write_text(
            json.dumps(
                [
                    {'source_id': 'uid:1', 'updated_at': '2026-01-01T00:00:00Z', 'data': {'name': 'Robin'}},
                    {'source_id': 'uid:2', 'updated_at': '2026-01-01T00:00:00Z', 'data': {'name': 'Sam'}},
                ]
            ),
            encoding='utf-8',
        )
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        self.config = self.root / 'config.json'
        self.config.write_text(
            json.dumps(
                {
                    'schema_version': 1,
                    'environment': 'local',
                    'manifest_id': 'manifest-test',
                    'artifacts': [{'name': 'users', 'path': str(source), 'size': source.stat().st_size, 'sha256': digest}],
                    'collections': [{'name': 'users', 'path': str(source)}],
                    'state_path': str(self.root / 'state.json'),
                }
            ),
            encoding='utf-8',
        )

    def tearDown(self):
        self.directory.cleanup()

    def test_config_requires_matching_artifact_checksum(self):
        config = load_config(self.config)
        self.assertEqual(config.manifest_id, 'manifest-test')
        self.assertEqual(config.artifacts[0].name, 'users')

    def test_dry_run_reports_creates_without_writing_state(self):
        report = run_import(load_config(self.config), dry_run=True)
        self.assertEqual(report['counts']['users']['creates'], 2)
        self.assertEqual(report['counts']['users']['updates'], 0)
        self.assertEqual(report['dry_run'], True)
        self.assertFalse((self.root / 'state.json').exists())

    def test_apply_is_repeatable_and_reports_unchanged_records(self):
        config = load_config(self.config)
        first = run_import(config, dry_run=False)
        second = run_import(config, dry_run=False)
        self.assertEqual(first['counts']['users']['creates'], 2)
        self.assertEqual(second['counts']['users']['unchanged'], 2)
        self.assertEqual(second['counts']['users']['creates'], 0)

    def test_report_contains_run_identity_and_reconciliation_summary(self):
        report = build_report(load_config(self.config), dry_run=True)
        self.assertEqual(report['manifest_id'], 'manifest-test')
        self.assertTrue(report['run_id'].startswith('import-'))
        self.assertIn('reconciliation', report)


if __name__ == '__main__':
    unittest.main()
