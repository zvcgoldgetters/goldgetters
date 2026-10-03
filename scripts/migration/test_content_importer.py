import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from content_importer import ContentImportError, load_sources, run_import


class ContentImporterTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.news = self.root / 'news.json'
        self.matches = self.root / 'matches.jsonl'
        self.news.write_text(
            json.dumps([{'source_id': 'nid:1', 'data': {'title': 'Match report'}}]),
            encoding='utf-8',
        )
        self.matches.write_text(
            json.dumps(
                {
                    'source_id': 'nid:2',
                    'data': {'title': 'Goldgetters v Rivals'},
                    'references': [{'collection': 'news', 'source_id': 'nid:1'}],
                }
            )
            + '\n'
            + json.dumps(
                {
                    'source_id': 'nid:3',
                    'data': {'title': 'Missing venue match'},
                    'references': [{'collection': 'venues', 'source_id': 'nid:404'}],
                }
            )
            + '\n',
            encoding='utf-8',
        )
        self.manifest = self.root / 'manifest.json'
        self.manifest.write_text(
            json.dumps(
                {
                    'collections': [
                        {
                            'name': 'news',
                            'path': str(self.news),
                            'sha256': hashlib.sha256(self.news.read_bytes()).hexdigest(),
                        },
                        {'name': 'matches', 'path': str(self.matches)},
                    ]
                }
            ),
            encoding='utf-8',
        )
        self.state = self.root / 'state.json'

    def tearDown(self):
        self.directory.cleanup()

    def test_manifest_rejects_unknown_collection(self):
        path = self.root / 'bad.json'
        path.write_text(
            json.dumps({'collections': [{'name': 'users', 'path': 'x'}]}),
            encoding='utf-8',
        )
        with self.assertRaises(ContentImportError):
            load_sources(path)

    def test_dry_run_reports_relationships_without_writing(self):
        report = run_import(load_sources(self.manifest), self.state, dry_run=True)
        self.assertEqual(report['collections']['news']['creates'], 1)
        self.assertEqual(report['collections']['matches']['creates'], 2)
        self.assertEqual(len(report['unresolved_references']), 1)
        self.assertFalse(self.state.exists())

    def test_apply_is_repeatable_and_non_destructive(self):
        sources = load_sources(self.manifest)
        first = run_import(sources, self.state, dry_run=False)
        second = run_import(sources, self.state, dry_run=False)
        self.assertEqual(first['collections']['matches']['creates'], 2)
        self.assertEqual(second['collections']['news']['unchanged'], 1)
        state = json.loads(self.state.read_text(encoding='utf-8'))
        self.assertEqual(sorted(state['collections']['matches']), ['nid:2', 'nid:3'])

    def test_checksum_mismatch_aborts_before_writes(self):
        manifest = json.loads(self.manifest.read_text(encoding='utf-8'))
        manifest['collections'][0]['sha256'] = '0' * 64
        self.manifest.write_text(json.dumps(manifest), encoding='utf-8')
        with self.assertRaises(ContentImportError):
            run_import(load_sources(self.manifest), self.state, dry_run=False)
        self.assertFalse(self.state.exists())


if __name__ == '__main__':
    unittest.main()
