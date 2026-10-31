#!/usr/bin/env python3
"""Run safe, repeatable Drupal-to-Payload import preparation.

The foundation deliberately keeps source adapters and Payload writes separate:
normalized JSON/JSONL records are reconciled into a local state store first.
A future Payload adapter can consume the same ``ImportReport`` contract.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
ENVIRONMENTS = {'local', 'development', 'staging', 'production'}


class ImportConfigError(ValueError):
    """Raised when configuration or a source artifact is unsafe to use."""


@dataclass(frozen=True)
class Artifact:
    name: str
    path: Path
    size: int
    sha256: str


@dataclass(frozen=True)
class Collection:
    name: str
    path: Path


@dataclass(frozen=True)
class ImportConfig:
    environment: str
    manifest_id: str
    artifacts: tuple[Artifact, ...]
    collections: tuple[Collection, ...]
    state_path: Path
    report_path: Path | None = None


def _required_string(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ImportConfigError(f'{name} must be a non-empty string')
    return value.strip()


def load_config(path: Path) -> ImportConfig:
    try:
        raw = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise ImportConfigError(f'cannot read config: {error}') from error
    if raw.get('schema_version') != SCHEMA_VERSION:
        raise ImportConfigError(f'unsupported schema_version: {raw.get("schema_version")!r}')
    environment = _required_string(raw.get('environment'), 'environment')
    if environment not in ENVIRONMENTS:
        raise ImportConfigError(f'environment must be one of {sorted(ENVIRONMENTS)}')
    artifacts: list[Artifact] = []
    for item in raw.get('artifacts', []):
        if not isinstance(item, dict):
            raise ImportConfigError('each artifact must be an object')
        raw_size = item.get('size')
        if not isinstance(raw_size, int) or raw_size < 0:
            raise ImportConfigError('artifact.size must be a non-negative integer')
        checksum = _required_string(item.get('sha256'), 'artifact.sha256')
        if len(checksum) != 64 or any(character not in '0123456789abcdef' for character in checksum.lower()):
            raise ImportConfigError('artifact.sha256 must be 64 hexadecimal characters')
        artifact = Artifact(
            _required_string(item.get('name'), 'artifact.name'),
            Path(_required_string(item.get('path'), 'artifact.path')),
            raw_size,
            checksum,
        )
        artifacts.append(artifact)
    collections = tuple(
        Collection(_required_string(item.get('name'), 'collection.name'), Path(_required_string(item.get('path'), 'collection.path')))
        for item in raw.get('collections', [])
        if isinstance(item, dict)
    )
    if not collections:
        raise ImportConfigError('at least one collection is required')
    state_path = Path(_required_string(raw.get('state_path'), 'state_path'))
    report = raw.get('report_path')
    return ImportConfig(environment, _required_string(raw.get('manifest_id'), 'manifest_id'), tuple(artifacts), collections, state_path, Path(report) if report else None)


def verify_artifacts(config: ImportConfig) -> None:
    for artifact in config.artifacts:
        if not artifact.path.is_file():
            raise ImportConfigError(f'artifact does not exist: {artifact.name}')
        if artifact.path.stat().st_size != artifact.size:
            raise ImportConfigError(f'artifact size mismatch: {artifact.name}')
        digest = hashlib.sha256(artifact.path.read_bytes()).hexdigest()
        if digest != artifact.sha256:
            raise ImportConfigError(f'artifact checksum mismatch: {artifact.name}')


def _records(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding='utf-8').strip()
    if not text:
        return []
    try:
        data = json.loads(text)
        values = data if isinstance(data, list) else [data]
    except json.JSONDecodeError:
        values = [json.loads(line) for line in text.splitlines() if line.strip()]
    if not all(isinstance(value, dict) for value in values):
        raise ImportConfigError(f'{path}: records must be JSON objects')
    return values


def _load_state(path: Path) -> dict[str, dict[str, dict[str, Any]]]:
    if not path.exists():
        return {}
    try:
        value = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise ImportConfigError(f'cannot read state: {error}') from error
    return value.get('collections', {})


def _record_id(record: dict[str, Any], index: int) -> str:
    value = record.get('source_id')
    if value is None or value == '':
        raise ImportConfigError(f'record {index} is missing stable source_id')
    return str(value)


def _counts() -> dict[str, int]:
    return {'creates': 0, 'updates': 0, 'unchanged': 0, 'skipped': 0, 'unresolved_references': 0}


def build_report(config: ImportConfig, *, dry_run: bool = True) -> dict[str, Any]:
    return _run(config, dry_run=dry_run, write=False)


def run_import(config: ImportConfig, *, dry_run: bool) -> dict[str, Any]:
    return _run(config, dry_run=dry_run, write=not dry_run)


def _run(config: ImportConfig, *, dry_run: bool, write: bool) -> dict[str, Any]:
    verify_artifacts(config)
    state = _load_state(config.state_path)
    next_state = json.loads(json.dumps(state))
    counts: dict[str, dict[str, int]] = {}
    warnings: list[str] = []
    for collection in config.collections:
        existing = state.setdefault(collection.name, {})
        target = next_state.setdefault(collection.name, {})
        collection_counts = counts.setdefault(collection.name, _counts())
        for index, record in enumerate(_records(collection.path), start=1):
            source_id = _record_id(record, index)
            if not isinstance(record.get('data'), dict):
                collection_counts['skipped'] += 1
                warnings.append(f'{collection.name}:{source_id} has no data object')
                continue
            previous = existing.get(source_id)
            if previous is None:
                collection_counts['creates'] += 1
            elif previous == record:
                collection_counts['unchanged'] += 1
            else:
                collection_counts['updates'] += 1
            if write:
                target[source_id] = record
    run_id = f'import-{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")}-{uuid.uuid4().hex[:8]}'
    report: dict[str, Any] = {
        'schema_version': SCHEMA_VERSION,
        'run_id': run_id,
        'started_at': datetime.now(timezone.utc).isoformat(),
        'finished_at': datetime.now(timezone.utc).isoformat(),
        'environment': config.environment,
        'manifest_id': config.manifest_id,
        'dry_run': dry_run,
        'counts': counts,
        'reconciliation': {
            'collections': len(config.collections),
            'records_seen': sum(sum(values.values()) - values['unresolved_references'] for values in counts.values()),
            'warnings': len(warnings),
        },
        'warnings': warnings,
    }
    if write:
        config.state_path.parent.mkdir(parents=True, exist_ok=True)
        config.state_path.write_text(json.dumps({'schema_version': SCHEMA_VERSION, 'collections': next_state}, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    if config.report_path:
        config.report_path.parent.mkdir(parents=True, exist_ok=True)
        config.report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--dry-run', action='store_true', help='report changes without writing the state store')
    args = parser.parse_args(argv)
    try:
        report = run_import(load_config(args.config), dry_run=args.dry_run)
    except ImportConfigError as error:
        print(f'import failed: {error}', file=sys.stderr)
        return 2
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
