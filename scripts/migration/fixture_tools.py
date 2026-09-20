#!/usr/bin/env python3
"""Load sanitized importer fixtures and build deterministic dry-run plans.

This module intentionally has no Payload or Drupal dependency. It gives source
adapters and importer tests one small, stable record contract to exercise.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


@dataclass(frozen=True)
class FixtureRecord:
    source_id: str
    changed_at: str
    entity: str
    data: dict[str, Any]
    references: tuple[str, ...]


def load_fixture(path: Path) -> list[FixtureRecord]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or payload.get("schema_version") != 1:
        raise ValueError("fixture schema_version must be 1")
    raw_records = payload.get("records")
    if not isinstance(raw_records, list):
        raise ValueError("fixture records must be a list")

    records: list[FixtureRecord] = []
    seen: set[str] = set()
    for index, raw in enumerate(raw_records, start=1):
        if not isinstance(raw, dict):
            raise ValueError(f"record {index} must be an object")
        def required_text(key: str) -> str:
            value = raw.get(key)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"record {index} requires source_id, changed_at, and entity")
            return value.strip()

        source_id = required_text("source_id")
        changed_at = required_text("changed_at")
        entity = required_text("entity")
        if source_id in seen:
            raise ValueError(f"duplicate source_id: {source_id}")
        seen.add(source_id)
        data = raw.get("data")
        references = raw.get("references", [])
        if not isinstance(data, dict):
            raise ValueError(f"record {source_id} data must be an object")
        if not isinstance(references, list) or not all(isinstance(value, str) for value in references):
            raise ValueError(f"record {source_id} references must be a list of strings")
        records.append(
            FixtureRecord(
                source_id,
                changed_at,
                entity,
                data,
                tuple(references),
            )
        )
    return records


def plan_import(
    records: Iterable[FixtureRecord],
    existing: dict[str, dict[str, Any]] | None = None,
    *,
    dry_run: bool = True,
) -> dict[str, Any]:
    """Return a repeatable create/update/unchanged plan without mutating input."""
    previous = dict(existing or {})
    source_records = list(records)
    source_ids = {record.source_id for record in source_records}
    counts = {name: 0 for name in ("creates", "updates", "unchanged", "unresolved")}
    changes: list[dict[str, Any]] = []
    next_state = dict(previous)

    for record in source_records:
        prior = previous.get(record.source_id)
        if prior is None:
            status = "create"
            counts["creates"] += 1
        elif prior == record.data:
            status = "unchanged"
            counts["unchanged"] += 1
        else:
            status = "update"
            counts["updates"] += 1
        unresolved = sorted(reference for reference in record.references if reference not in source_ids and reference not in previous)
        counts["unresolved"] += len(unresolved)
        changes.append({"source_id": record.source_id, "status": status, "unresolved": unresolved})
        if not dry_run:
            next_state[record.source_id] = record.data

    return {"counts": counts, "changes": changes, "state": next_state if not dry_run else previous}
