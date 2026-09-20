import json
import tempfile
import unittest
from pathlib import Path

from fixture_tools import FixtureRecord, load_fixture, plan_import


FIXTURE = Path(__file__).parent / "fixtures" / "sample-records.json"


class FixtureToolTests(unittest.TestCase):
    def test_fixture_is_sanitized_and_relationships_are_explicit(self):
        records = load_fixture(FIXTURE)
        self.assertEqual([record.source_id for record in records], ["team:1", "user:1", "user:2"])
        self.assertEqual(records[1].references, ("team:1",))
        self.assertEqual(records[2].references, ("team:missing",))
        self.assertNotIn("password", json.dumps(records, default=lambda value: value.__dict__).lower())

    def test_dry_run_reports_creates_and_does_not_mutate_state(self):
        records = load_fixture(FIXTURE)
        existing = {"legacy:1": {"name": "kept"}}
        report = plan_import(records, existing)
        self.assertEqual(report["counts"], {"creates": 3, "updates": 0, "unchanged": 0, "unresolved": 1})
        self.assertEqual(report["state"], existing)

    def test_apply_rerun_is_idempotent(self):
        records = load_fixture(FIXTURE)
        first = plan_import(records, dry_run=False)
        second = plan_import(records, first["state"], dry_run=False)
        self.assertEqual(first["counts"]["creates"], 3)
        self.assertEqual(second["counts"]["creates"], 0)
        self.assertEqual(second["counts"]["unchanged"], 3)

    def test_changed_record_is_reported_as_update(self):
        records = load_fixture(FIXTURE)
        initial = plan_import(records, dry_run=False)["state"]
        changed = list(records)
        changed[0] = FixtureRecord(
            changed[0].source_id,
            "2026-01-03T00:00:00Z",
            changed[0].entity,
            {"name": "Goldgetters updated"},
            changed[0].references,
        )
        report = plan_import(changed, initial)
        self.assertEqual(report["counts"]["updates"], 1)
        self.assertEqual(report["changes"][0]["status"], "update")

    def test_duplicate_source_ids_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "duplicate.json"
            path.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "records": [
                            {"source_id": "same", "changed_at": "now", "entity": "users", "data": {}},
                            {"source_id": "same", "changed_at": "now", "entity": "users", "data": {}},
                        ],
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "duplicate source_id"):
                load_fixture(path)


if __name__ == "__main__":
    unittest.main()
