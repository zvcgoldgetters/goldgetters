#!/usr/bin/env python3
"""Reconcile normalized Drupal finance and RSVP exports.

The importer writes a target-neutral checkpoint for a later Payload adapter. It
never stores invitation tokens, preserves source identifiers, upserts records,
and reports missing event/user references without deleting older records.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

SUPPORTED_COLLECTIONS = {'finance', 'rsvp-events', 'rsvp-responses'}
RESPONSE_STATES = {'yes', 'no', 'maybe', 'none'}
SENSITIVE_KEYS = {'token', 'invitation_token', 'raw_token', 'password', 'hash'}


class ImportError(ValueError):
    """Raised when a private migration input violates the import contract."""


def _text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ImportError(f'{label} must be a non-empty string')
    return value.strip()


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise ImportError(f'cannot read {path}: {error}') from error


def load_manifest(path: Path) -> list[dict[str, Any]]:
    raw = _read_json(path)
    collections = raw.get('collections') if isinstance(raw, dict) else raw
    if not isinstance(collections, list) or not collections:
        raise ImportError('manifest must contain a non-empty collections list')
    names: set[str] = set()
    result: list[dict[str, Any]] = []
    for item in collections:
        if not isinstance(item, dict):
            raise ImportError('each manifest collection must be an object')
        name = _text(item.get('name'), 'collection.name')
        if name not in SUPPORTED_COLLECTIONS:
            raise ImportError(f'unsupported collection: {name}')
        if name in names:
            raise ImportError(f'duplicate collection: {name}')
        names.add(name)
        source = Path(_text(item.get('path'), f'{name}.path'))
        checksum = item.get('sha256')
        if checksum is not None:
            checksum = _text(checksum, f'{name}.sha256').lower()
            if len(checksum) != 64 or any(char not in '0123456789abcdef' for char in checksum):
                raise ImportError(f'{name}.sha256 must be a SHA-256 digest')
        result.append({'name': name, 'path': source, 'sha256': checksum})
    return result


def _records(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding='utf-8').strip()
    if not text:
        return []
    try:
        value = json.loads(text)
        values = value if isinstance(value, list) else [value]
    except json.JSONDecodeError:
        try:
            values = [json.loads(line) for line in text.splitlines() if line.strip()]
        except json.JSONDecodeError as error:
            raise ImportError(f'{path}: invalid JSONL: {error}') from error
    if not all(isinstance(value, dict) for value in values):
        raise ImportError(f'{path}: records must be objects')
    return values


def _verify(entry: dict[str, Any]) -> None:
    path = entry['path']
    if not path.is_file():
        raise ImportError(f"{entry['name']}: source file does not exist")
    expected = entry['sha256']
    if expected:
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != expected:
            raise ImportError(f"{entry['name']}: SHA-256 mismatch")


def _source_id(record: dict[str, Any], collection: str, index: int) -> str:
    value = record.get('source_id')
    if value in (None, ''):
        raise ImportError(f'{collection} record {index} is missing source_id')
    return str(value)


def _reject_sensitive(value: Any, location: str = 'record') -> None:
    if isinstance(value, dict):
        for key, nested in value.items():
            if key.lower() in SENSITIVE_KEYS:
                raise ImportError(f'{location} contains prohibited sensitive field: {key}')
            _reject_sensitive(nested, f'{location}.{key}')
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            _reject_sensitive(nested, f'{location}[{index}]')


def _references(record: dict[str, Any]) -> list[tuple[str, str]]:
    raw = record.get('references', [])
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ImportError('references must be a list')
    references: list[tuple[str, str]] = []
    for reference in raw:
        if not isinstance(reference, dict):
            raise ImportError('each reference must be an object')
        references.append(
            (
                _text(reference.get('collection'), 'reference.collection'),
                _text(reference.get('source_id'), 'reference.source_id'),
            )
        )
    return references


def _validate_response(record: dict[str, Any]) -> None:
    data = record.get('data')
    if not isinstance(data, dict):
        raise ImportError('rsvp-responses records require a data object')
    state = data.get('response', 'none')
    if state not in RESPONSE_STATES:
        raise ImportError(f'invalid RSVP response state: {state}')
    guest_count = data.get('guest_count', 0)
    if not isinstance(guest_count, int) or guest_count < 0:
        raise ImportError('RSVP guest_count must be a non-negative integer')


def _load_state(path: Path) -> dict[str, dict[str, dict[str, Any]]]:
    if not path.exists():
        return {}
    value = _read_json(path)
    collections = value.get('collections') if isinstance(value, dict) else None
    if not isinstance(collections, dict):
        raise ImportError('state collections must be an object')
    return collections


def run_import(manifest: list[dict[str, Any]], state_path: Path, *, dry_run: bool) -> dict[str, Any]:
    for entry in manifest:
        _verify(entry)
    source_records = {entry['name']: _records(entry['path']) for entry in manifest}
    before = _load_state(state_path)
    after = json.loads(json.dumps(before))
    available = {
        name: {str(record.get('source_id')) for record in records if record.get('source_id') not in (None, '')}
        for name, records in source_records.items()
    }
    for name, records in before.items():
        available.setdefault(name, set()).update(records)

    counts: dict[str, dict[str, int]] = {}
    unresolved: list[dict[str, str]] = []
    for name, records in source_records.items():
        existing = before.get(name, {})
        target = after.setdefault(name, {})
        counts[name] = {'creates': 0, 'updates': 0, 'unchanged': 0}
        for index, record in enumerate(records, start=1):
            source_id = _source_id(record, name, index)
            _reject_sensitive(record, f'{name}:{source_id}')
            if name == 'rsvp-responses':
                _validate_response(record)
            for target_collection, target_id in _references(record):
                if target_id not in available.get(target_collection, set()):
                    unresolved.append({
                        'collection': name,
                        'source_id': source_id,
                        'target_collection': target_collection,
                        'target_source_id': target_id,
                    })
            previous = existing.get(source_id)
            if previous is None:
                counts[name]['creates'] += 1
            elif previous == record:
                counts[name]['unchanged'] += 1
            else:
                counts[name]['updates'] += 1
            if not dry_run:
                target[source_id] = record

    report = {
        'schema_version': 1,
        'dry_run': dry_run,
        'collections': counts,
        'unresolved_references': unresolved,
        'records_seen': sum(sum(values.values()) for values in counts.values()),
    }
    if not dry_run:
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(
            json.dumps({'schema_version': 1, 'collections': after}, indent=2, sort_keys=True) + '\n',
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
        report = run_import(load_manifest(args.manifest), args.state, dry_run=args.dry_run)
    except ImportError as error:
        print(f'finance/RSVP import failed: {error}', file=sys.stderr)
        return 2
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
