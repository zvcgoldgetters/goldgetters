#!/usr/bin/env python3
"""Incremental, resumable, failure-isolated migration importer.

The command deliberately consumes a sanitized JSON record stream rather than
Drupal credentials or a database connection.  A production adapter can map
Drupal rows to the same record contract without changing the run/state logic.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable


@dataclass(frozen=True)
class Record:
    source_id: str
    changed_at: str
    entity: str
    data: dict[str, Any]
    references: tuple[str, ...] = ()


def load_records(path: Path) -> list[Record]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = payload.get("records", payload) if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        raise ValueError("source must be a JSON list or an object containing records")
    records: list[Record] = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("each source record must be an object")
        source_id = str(row.get("source_id", "")).strip()
        changed_at = str(row.get("changed_at", "")).strip()
        entity = str(row.get("entity", "")).strip()
        if not source_id or not changed_at or not entity:
            raise ValueError("records require source_id, changed_at, and entity")
        data = row.get("data", {})
        if not isinstance(data, dict):
            raise ValueError(f"record {source_id} data must be an object")
        references = row.get("references", [])
        if not isinstance(references, list) or not all(isinstance(value, str) for value in references):
            raise ValueError(f"record {source_id} references must be a list of strings")
        records.append(Record(source_id, changed_at, entity, data, tuple(references)))
    return records


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def record_hash(record: Record) -> str:
    return hashlib.sha256(canonical_json(record.data).encode("utf-8")).hexdigest()


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class StateStore:
    def __init__(self, path: Path):
        self.connection = sqlite3.connect(path)
        self.connection.row_factory = sqlite3.Row
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS importer_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS imported_records (
              source_id TEXT PRIMARY KEY, entity TEXT NOT NULL, changed_at TEXT NOT NULL,
              record_hash TEXT NOT NULL, status TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS import_runs (
              run_id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT,
              watermark_before TEXT, watermark_after TEXT, dry_run INTEGER NOT NULL,
              status TEXT NOT NULL, report_path TEXT
            );
            """
        )
        self.connection.commit()

    def watermark(self) -> str | None:
        row = self.connection.execute("SELECT value FROM importer_metadata WHERE key = 'watermark'").fetchone()
        return str(row[0]) if row else None

    def record(self, source_id: str) -> sqlite3.Row | None:
        return self.connection.execute("SELECT * FROM imported_records WHERE source_id = ?", (source_id,)).fetchone()

    def begin_run(self, run_id: str, dry_run: bool, before: str | None) -> None:
        self.connection.execute(
            "INSERT INTO import_runs(run_id, started_at, watermark_before, dry_run, status) VALUES (?, ?, ?, ?, ?)",
            (run_id, iso_now(), before, int(dry_run), "running"),
        )
        self.connection.commit()

    def save_record(self, record: Record, status: str) -> None:
        self.connection.execute(
            """INSERT INTO imported_records(source_id, entity, changed_at, record_hash, status, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(source_id) DO UPDATE SET entity=excluded.entity,
               changed_at=excluded.changed_at, record_hash=excluded.record_hash,
               status=excluded.status, updated_at=excluded.updated_at""",
            (record.source_id, record.entity, record.changed_at, record_hash(record), status, iso_now()),
        )

    def finish_run(self, run_id: str, status: str, after: str | None, report_path: str | None) -> None:
        self.connection.execute(
            "UPDATE import_runs SET finished_at=?, watermark_after=?, status=?, report_path=? WHERE run_id=?",
            (iso_now(), after, status, report_path, run_id),
        )
        self.connection.commit()

    def set_watermark(self, value: str) -> None:
        self.connection.execute(
            """INSERT INTO importer_metadata(key, value) VALUES ('watermark', ?)
               ON CONFLICT(key) DO UPDATE SET value=excluded.value""",
            (value,),
        )

    def close(self) -> None:
        self.connection.close()


class JsonTarget:
    def __init__(self, path: Path):
        self.path = path
        payload = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        self.records: dict[str, dict[str, Any]] = payload if isinstance(payload, dict) else {}

    def apply(self, record: Record) -> str:
        previous = self.records.get(record.source_id)
        if previous is not None and canonical_json(previous.get("data", {})) == canonical_json(record.data):
            return "unchanged"
        self.records[record.source_id] = {
            "entity": record.entity,
            "changed_at": record.changed_at,
            "data": record.data,
        }
        return "update" if previous is not None else "create"

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix=f".{self.path.name}.", dir=self.path.parent, text=True)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as output:
                json.dump(self.records, output, indent=2, sort_keys=True)
                output.write("\n")
            os.replace(temporary, self.path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


def run_import(
    records: Iterable[Record],
    state: StateStore,
    target: JsonTarget,
    *,
    dry_run: bool = False,
    incremental: bool = False,
    max_attempts: int = 3,
    handler: Callable[[JsonTarget, Record], str] | None = None,
) -> dict[str, Any]:
    if max_attempts < 1:
        raise ValueError("max_attempts must be positive")
    all_records = list(records)
    known_ids = {record.source_id for record in all_records}
    before = state.watermark()
    selected = [record for record in all_records if not incremental or before is None or record.changed_at > before]
    run_id = hashlib.sha256(f"{iso_now()}:{len(selected)}".encode()).hexdigest()[:16]
    state.begin_run(run_id, dry_run, before)
    report: dict[str, Any] = {
        "schema_version": 1, "run_id": run_id, "started_at": iso_now(),
        "dry_run": dry_run, "incremental": incremental, "watermark_before": before,
        "counts": {key: 0 for key in ("selected", "created", "updated", "unchanged", "skipped", "failed", "unresolved")},
        "records": [], "warnings": [], "errors": [],
    }
    report["counts"]["selected"] = len(selected)
    apply_handler = handler or (lambda destination, record: destination.apply(record))
    successful_times: list[str] = []
    try:
        for record in selected:
            prior = state.record(record.source_id)
            if prior is not None and prior["record_hash"] == record_hash(record):
                report["counts"]["unchanged"] += 1
                report["records"].append({"source_id": record.source_id, "status": "unchanged"})
                successful_times.append(record.changed_at)
                continue
            unresolved = sorted(reference for reference in record.references if reference not in known_ids and state.record(reference) is None)
            if unresolved:
                report["counts"]["unresolved"] += len(unresolved)
                report["warnings"].append({"source_id": record.source_id, "unresolved_references": unresolved})
            if dry_run:
                status = "update" if prior is not None else "create"
            else:
                status = "skipped"
                for attempt in range(1, max_attempts + 1):
                    try:
                        status = apply_handler(target, record)
                        break
                    except Exception as error:  # isolate one bad record from the batch
                        if attempt == max_attempts:
                            report["counts"]["failed"] += 1
                            report["errors"].append({"source_id": record.source_id, "attempts": attempt, "error": str(error)})
                        else:
                            time.sleep(0)
                if status == "skipped":
                    report["counts"]["skipped"] += 1
                    report["records"].append({"source_id": record.source_id, "status": "skipped"})
                    continue
            report["counts"]["created" if status == "create" else "updated"] += 1
            report["records"].append({"source_id": record.source_id, "status": status})
            if not dry_run:
                state.save_record(record, "imported")
            successful_times.append(record.changed_at)
        after = max(successful_times, default=before)
        if not dry_run and after is not None:
            state.set_watermark(after)
            target.save()
        state.finish_run(run_id, "completed" if not report["errors"] else "completed_with_errors", after, None)
    except Exception:
        state.finish_run(run_id, "failed", before, None)
        raise
    report["watermark_after"] = after
    report["finished_at"] = iso_now()
    report["missing_source_ids"] = sorted(set(target.records) - known_ids)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="sanitized JSON record export")
    parser.add_argument("--state", type=Path, required=True, help="SQLite importer state database")
    parser.add_argument("--target", type=Path, required=True, help="JSON target used by the reference adapter")
    parser.add_argument("--output", type=Path, required=True, help="audit report path")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--incremental", action="store_true")
    parser.add_argument("--max-attempts", type=int, default=3)
    args = parser.parse_args()
    store = StateStore(args.state)
    try:
        report = run_import(load_records(args.source), store, JsonTarget(args.target), dry_run=args.dry_run, incremental=args.incremental, max_attempts=args.max_attempts)
    finally:
        store.close()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0 if not report["errors"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
