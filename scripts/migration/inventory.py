#!/usr/bin/env python3
"""Generate a non-sensitive inventory from Drupal SQL and files exports.

The report contains schema, row counts, and archive metadata only. It never
parses or writes row values, credentials, hashes, tokens, or file contents.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
import tarfile
from collections import Counter
from pathlib import Path
from typing import Iterable

CREATE_TABLE_RE = re.compile(
    r"CREATE TABLE `(?P<name>[^`]+)`\s*\((?P<body>.*)\)\s*(?:ENGINE=.*)?$",
    re.DOTALL | re.IGNORECASE,
)
INSERT_RE = re.compile(
    r"INSERT INTO `(?P<name>[^`]+)`.*?VALUES\s*(?P<values>.*)$",
    re.DOTALL | re.IGNORECASE,
)
COLUMN_RE = re.compile(r"^\s*`(?P<name>[^`]+)`\s+(?P<definition>.+?)\s*,?\s*$")

RELEVANT_EXACT = {
    "block",
    "comment",
    "file_managed",
    "field_config",
    "field_config_instance",
    "menu_links",
    "menu_router",
    "node",
    "node_revision",
    "node_type",
    "permission",
    "redirect",
    "role",
    "rsvp",
    "rsvp_invite",
    "rsvp_realname",
    "url_alias",
    "users",
    "views_display",
    "views_view",
}
RELEVANT_PREFIXES = (
    "field_data_",
    "field_revision_",
    "field_deleted_",
    "taxonomy_",
    "watchdog",
    "wedstrijd",
    "ndmt_wedstrijd",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_relevant(name: str) -> bool:
    return name in RELEVANT_EXACT or name.startswith(RELEVANT_PREFIXES)


def sql_statements(dump: str) -> Iterable[str]:
    """Yield statements while preserving semicolons inside SQL strings."""
    start = 0
    quoted = False
    escaped = False
    for index, character in enumerate(dump):
        if quoted:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == "'":
                quoted = False
        elif character == "'":
            quoted = True
        elif character == ";":
            yield dump[start:index].strip()
            start = index + 1
    remainder = dump[start:].strip()
    if remainder:
        yield remainder


def parse_columns(body: str) -> list[dict[str, str | None]]:
    columns: list[dict[str, str | None]] = []
    for line in body.splitlines():
        match = COLUMN_RE.match(line)
        if not match:
            continue
        definition = match.group("definition").rstrip(",")
        columns.append(
            {
                "name": match.group("name"),
                "definition": definition,
            }
        )
    return columns


def count_value_tuples(values: str) -> int:
    """Count top-level tuples in an INSERT VALUES clause without decoding values."""
    depth = 0
    tuples = 0
    quoted = False
    escaped = False
    for character in values:
        if quoted:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == "'":
                quoted = False
            continue
        if character == "'":
            quoted = True
        elif character == "(":
            depth += 1
            if depth == 1:
                tuples += 1
        elif character == ")" and depth:
            depth -= 1
    return tuples


def sql_inventory(path: Path) -> dict:
    with gzip.open(path, "rt", encoding="utf-8", errors="replace") as source:
        dump = source.read()

    tables: dict[str, dict] = {}
    for statement in sql_statements(dump):
        match = CREATE_TABLE_RE.search(statement)
        if not match:
            continue
        name = match.group("name")
        if is_relevant(name):
            tables[name] = {"columns": parse_columns(match.group("body")), "row_count": 0}

    for statement in sql_statements(dump):
        match = INSERT_RE.search(statement)
        if not match:
            continue
        name = match.group("name")
        if name in tables:
            tables[name]["row_count"] += count_value_tuples(match.group("values"))

    field_storage = sorted(
        name.removeprefix("field_data_")
        for name in tables
        if name.startswith("field_data_")
    )
    content_types = sorted(
        name.removeprefix("field_data_").split("_", 1)[0]
        for name in tables
        if name.startswith("field_data_")
    )
    return {
        "sha256": sha256(path),
        "size_bytes": path.stat().st_size,
        "tables": dict(sorted(tables.items())),
        "field_storage_tables": field_storage,
        "field_storage_prefixes": sorted(set(content_types)),
    }


def classify_archive_member(name: str) -> str:
    lowered = name.lower()
    if "/styles/" in lowered or "/derivatives/" in lowered or "/cache/" in lowered:
        return "generated_or_cache"
    if name.endswith("/"):
        return "directory"
    return "source_candidate"


def archive_inventory(path: Path) -> dict:
    categories = Counter()
    extensions = Counter()
    file_count = 0
    file_bytes = 0
    with tarfile.open(path, mode="r:gz") as archive:
        for member in archive:
            category = classify_archive_member(member.name)
            categories[category] += 1
            if not member.isdir():
                file_count += 1
                file_bytes += member.size
                suffix = Path(member.name).suffix.lower() or "[none]"
                extensions[suffix] += 1
    return {
        "sha256": sha256(path),
        "size_bytes": path.stat().st_size,
        "file_count": file_count,
        "file_bytes": file_bytes,
        "categories": dict(sorted(categories.items())),
        "extensions": dict(sorted(extensions.items())),
    }


def build_report(sql_path: Path, archive_path: Path) -> dict:
    return {
        "schema_version": 1,
        "sql_export": {"path": sql_path.name, **sql_inventory(sql_path)},
        "files_export": {"path": archive_path.name, **archive_inventory(archive_path)},
    }


def main(arguments: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sql", type=Path, required=True)
    parser.add_argument("--files", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    options = parser.parse_args(arguments)
    report = build_report(options.sql, options.files)
    options.output.parent.mkdir(parents=True, exist_ok=True)
    options.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
