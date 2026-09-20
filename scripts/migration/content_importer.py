#!/usr/bin/env python3
"""Import normalized Drupal content and match data into a safe checkpoint.

The checkpoint is target-neutral and can be consumed by a future Payload
adapter. It validates source files, preserves stable IDs, resolves references
across content collections, and never deletes records absent from an export.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

SUPPORTED_COLLECTIONS = {
    'news',
    'reports',
    'previews',
    'photo-albums',
    'sponsors',
    'matches',
    'team-events',
    'match-events',
}


class ContentImportError(ValueError):
    """Raised for invalid manifests, source records, or state."""


@dataclass(frozen=True)
class CollectionSource:
    name: str
    path: Path
    sha256: str | None = None


def _string(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ContentImportError(f'{name} must be a non-empty string')
    return value.strip()


def load_sources(path: Path) -> tuple[CollectionSource, ...]:
    try:
        raw = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise ContentImportError(f'cannot read manifest: {error}') from error
    values = raw.get('collections') if isinstance(raw, dict) else raw
    if not isinstance(values, list) or not values:
        raise ContentImportError('manifest must contain a non-empty collections list')
    sources: list[CollectionSource] = []
    for item in values:
        if not isinstance(item, dict):
            raise ContentImportError('each collection must be an object')
        name = _string(item.get('name'), 'collection.name')
        if name not in SUPPORTED_COLLECTIONS:
            raise ContentImportError(f'unsupported content collection: {name}')
        checksum = item.get('sha256')
        if checksum is not None:
            checksum = _string(checksum, f'{name}.sha256').lower()
            if len(checksum) != 64 or any(char not in '0123456789abcdef' for char in checksum):
                raise ContentImportError(f'{name}.sha256 must be 64 hexadecimal characters')
        sources.append(CollectionSource(name, Path(_string(item.get('path'), f'{name}.path')), checksum))
    if len({source.name for source in sources}) != len(sources):
        raise ContentImportError('each content collection may appear only once')
    return tuple(sources)


def _records(path: Path) -> list[dict[str, Any]]:
    try:
        text = path.read_text(encoding='utf-8').strip()
    except OSError as error:
        raise ContentImportError(f'cannot read {path}: {error}') from error
    if not text:
        return []
    try:
        value = json.loads(text)
        values = value if isinstance(value, list) else [value]
    except json.JSONDecodeError:
        try:
            values = [json.loads(line) for line in text.splitlines() if line.strip()]
        except json.JSONDecodeError as error:
            raise ContentImportError(f'{path}: invalid JSONL: {error}') from error
    if not all(isinstance(item, dict) for item in values):
        raise ContentImportError(f'{path}: every record must be an object')
    return values


def _verify(source: CollectionSource) -> None:
    if not source.path.is_file():
        raise ContentImportError(f'{source.name}: source file does not exist')
    if source.sha256:
        digest = hashlib.sha256(source.path.read_bytes()).hexdigest()
        if digest != source.sha256:
            raise ContentImportError(f'{source.name}: SHA-256 mismatch')


def _load_state(path: Path) -> dict[str, dict[str, dict[str, Any]]]:
    if not path.exists():
        return {}
    try:
        value = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise ContentImportError(f'cannot read state store: {error}') from error
    collections = value.get('collections') if isinstance(value, dict) else None
    if not isinstance(collections, dict):
        raise ContentImportError('state store collections must be an object')
    return collections


def _source_id(record: dict[str, Any], collection: str, index: int) -> str:
    value = record.get('source_id')
    if value is None or value == '':
        raise ContentImportError(f'{collection} record {index} is missing stable source_id')
    return str(value)


def _references(record: dict[str, Any]) -> list[tuple[str, str]]:
    raw = record.get('references', [])
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ContentImportError('record references must be a list')
    result: list[tuple[str, str]] = []
    for reference in raw:
        if not isinstance(reference, dict):
            raise ContentImportError('each reference must be an object')
        result.append(
            (
                _string(reference.get('collection'), 'reference.collection'),
                _string(reference.get('source_id'), 'reference.source_id'),
            )
        )
    return result


def run_import(
    sources: tuple[CollectionSource, ...], state_path: Path, *, dry_run: bool
) -> dict[str, Any]:
    for source in sources:
        _verify(source)
    before = _load_state(state_path)
    after = json.loads(json.dumps(before))
    loaded = {source.name: _records(source.path) for source in sources}
    available = {name: set(records) for name, records in before.items()}
    for name, records in loaded.items():
        available.setdefault(name, set()).update(
            str(record['source_id'])
            for record in records
            if record.get('source_id') not in (None, '')
        )

    counts: dict[str, dict[str, int]] = {}
    unresolved: list[dict[str, str]] = []
    for source in sources:
        existing = before.get(source.name, {})
        target = after.setdefault(source.name, {})
        summary = counts[source.name] = {
            'creates': 0,
            'updates': 0,
            'unchanged': 0,
            'skipped': 0,
        }
        for index, record in enumerate(loaded[source.name], start=1):
            source_id = _source_id(record, source.name, index)
            data = record.get('data')
            if not isinstance(data, dict):
                summary['skipped'] += 1
                continue
            for target_collection, target_id in _references(record):
                if target_collection not in SUPPORTED_COLLECTIONS or target_id not in available.get(target_collection, set()):
                    unresolved.append(
                        {
                            'collection': source.name,
                            'source_id': source_id,
                            'target_collection': target_collection,
                            'target_source_id': target_id,
                        }
                    )
            previous = existing.get(source_id)
            if previous is None:
                summary['creates'] += 1
            elif previous == record:
                summary['unchanged'] += 1
            else:
                summary['updates'] += 1
            if not dry_run:
                target[source_id] = record

    report = {
        'schema_version': 1,
        'dry_run': dry_run,
        'collections': counts,
        'unresolved_references': unresolved,
        'records_seen': sum(sum(summary.values()) for summary in counts.values()),
        'records_with_unresolved_references': len({
            (item['collection'], item['source_id']) for item in unresolved
        }),
    }
    if not dry_run:
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(
            json.dumps({'schema_version': 1, 'collections': after}, indent=2, sort_keys=True)
            + '\n',
            encoding='utf-8',
        )
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--state', type=Path, required=True)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args(argv)
    try:
        report = run_import(load_sources(args.manifest), args.state, dry_run=args.dry_run)
    except ContentImportError as error:
        print(f'content import failed: {error}', file=sys.stderr)
        return 2
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
