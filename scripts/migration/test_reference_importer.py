import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from reference_importer import ReferenceImportError, load_sources, run_import


class ReferenceImporterTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.users = self.root / 'users.json'
        self.teams = self.root / 'teams.jsonl'
        self.users.write_text(
            json.dumps([
                {'source_id': 'uid:1', 'data': {'name': 'Robin'}},
            ]),
            encoding='utf-8',
        )
        self.teams.write_text(
            json.dumps({
                'source_id': 'nid:10',
                'data': {'name': 'Goldgetters'},
                'references': [{'collection': 'users', 'source_id': 'uid:1'}],
            }) + '\n' + json.dumps({
                'source_id': 'nid:11',
                'data': {'name': 'Missing reference'},
                'references': [{'collection': 'venues', 'source_id': 'nid:404'}],
            }) + '\n',
            encoding='utf-8',
        )
        self.manifest = self.root / 'manifest.json'
        self.manifest.write_text(json.dumps({'collections': [
            {'name': 'users', 'path': str(self.users), 'sha256': hashlib.sha256(self.users.read_bytes()).hexdigest()},
            {'name': 'teams', 'path': str(self.teams)},
        ]}), encoding='utf-8')
        self.state = self.root / 'state.json'

    def tearDown(self):
        self.directory.cleanup()

    def test_manifest_rejects_unknown_collection(self):
        path = self.root / 'bad.json'
        path.write_text(json.dumps({'collections': [{'name': 'matches', 'path': 'x'}]}), encoding='utf-8')
        with self.assertRaises(ReferenceImportError):
            load_sources(path)

    def test_dry_run_reports_reference_resolution_without_writing(self):
        report = run_import(load_sources(self.manifest), self.state, dry_run=True)
        self.assertEqual(report['collections']['users']['creates'], 1)
        self.assertEqual(report['collections']['teams']['creates'], 2)
        self.assertEqual(len(report['unresolved_references']), 1)
        self.assertFalse(self.state.exists())

    def test_apply_is_repeatable_and_does_not_delete_absent_records(self):
        sources = load_sources(self.manifest)
        first = run_import(sources, self.state, dry_run=False)
        second = run_import(sources, self.state, dry_run=False)
        self.assertEqual(first['collections']['teams']['creates'], 2)
        self.assertEqual(second['collections']['users']['unchanged'], 1)
        state = json.loads(self.state.read_text(encoding='utf-8'))
        self.assertEqual(sorted(state['collections']['teams']), ['nid:10', 'nid:11'])

    def test_checksum_mismatch_aborts_before_writes(self):
        manifest = json.loads(self.manifest.read_text(encoding='utf-8'))
        manifest['collections'][0]['sha256'] = '0' * 64
        self.manifest.write_text(json.dumps(manifest), encoding='utf-8')
        with self.assertRaises(ReferenceImportError):
            run_import(load_sources(self.manifest), self.state, dry_run=False)
        self.assertFalse(self.state.exists())


if __name__ == '__main__':
    unittest.main()
