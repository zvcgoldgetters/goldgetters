import json
import sqlite3
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from importer import JsonTarget, Record, StateStore, run_import


class ImporterTests(unittest.TestCase):
    def make_store(self, directory: str) -> tuple[StateStore, JsonTarget]:
        root = Path(directory)
        return StateStore(root / "state.sqlite"), JsonTarget(root / "target.json")

    def test_dry_run_reports_plan_without_mutating_target_or_records(self):
        with TemporaryDirectory() as directory:
            store, target = self.make_store(directory)
            report = run_import(
                [Record("node:1", "2026-01-01T00:00:00Z", "news", {"title": "Hello"})],
                store,
                target,
                dry_run=True,
            )
            self.assertEqual(report["counts"]["created"], 1)
            self.assertEqual(target.records, {})
            self.assertIsNone(store.record("node:1"))
            store.close()

    def test_incremental_watermark_and_idempotent_rerun(self):
        records = [
            Record("node:1", "2026-01-01T00:00:00Z", "news", {"title": "Hello"}),
            Record("node:2", "2026-01-02T00:00:00Z", "news", {"title": "World"}),
        ]
        with TemporaryDirectory() as directory:
            store, target = self.make_store(directory)
            first = run_import(records, store, target)
            second = run_import(records, store, target, incremental=True)
            self.assertEqual(first["counts"]["created"], 2)
            self.assertEqual(second["counts"]["selected"], 0)
            self.assertEqual(store.watermark(), records[-1].changed_at)
            store.close()

    def test_retry_and_failure_isolation(self):
        records = [
            Record("node:1", "2026-01-01T00:00:00Z", "news", {"title": "Good"}),
            Record("node:2", "2026-01-02T00:00:00Z", "news", {"title": "Bad"}),
        ]
        attempts: dict[str, int] = {}

        def handler(target: JsonTarget, record: Record) -> str:
            attempts[record.source_id] = attempts.get(record.source_id, 0) + 1
            if record.source_id == "node:2":
                raise RuntimeError("simulated target failure")
            return target.apply(record)

        with TemporaryDirectory() as directory:
            store, target = self.make_store(directory)
            report = run_import(records, store, target, max_attempts=2, handler=handler)
            self.assertEqual(report["counts"]["created"], 1)
            self.assertEqual(report["counts"]["failed"], 1)
            self.assertEqual(attempts["node:2"], 2)
            self.assertIn("node:1", target.records)
            self.assertNotIn("node:2", target.records)
            store.close()

    def test_unresolved_references_are_reported_without_blocking_record(self):
        with TemporaryDirectory() as directory:
            store, target = self.make_store(directory)
            report = run_import(
                [Record("node:1", "2026-01-01T00:00:00Z", "news", {"title": "Hello"}, ("node:missing",))],
                store,
                target,
            )
            self.assertEqual(report["counts"]["unresolved"], 1)
            self.assertEqual(report["warnings"][0]["unresolved_references"], ["node:missing"])
            self.assertIn("node:1", target.records)
            store.close()

    def test_state_is_sqlite_and_report_is_json_serializable(self):
        with TemporaryDirectory() as directory:
            store, target = self.make_store(directory)
            report = run_import([], store, target)
            json.dumps(report)
            row = store.connection.execute("SELECT status FROM import_runs").fetchone()
            self.assertEqual(row[0], "completed")
            self.assertIsInstance(store.connection, sqlite3.Connection)
            store.close()


if __name__ == "__main__":
    unittest.main()
