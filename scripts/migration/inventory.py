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


def value_tuples(values: str) -> list[str]:
    """Return raw tuple bodies without decoding arbitrary source values."""
    tuples: list[str] = []
    start = None
    depth = 0
    quoted = False
    escaped = False
    for index, character in enumerate(values):
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
                start = index + 1
        elif character == ")" and depth:
            depth -= 1
            if depth == 0 and start is not None:
                tuples.append(values[start:index])
                start = None
    return tuples


def tuple_fields(tuple_body: str) -> list[str]:
    fields: list[str] = []
    start = 0
    quoted = False
    escaped = False
    for index, character in enumerate(tuple_body):
        if quoted:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == "'":
                quoted = False
        elif character == "'":
            quoted = True
        elif character == ",":
            fields.append(tuple_body[start:index].strip())
            start = index + 1
    fields.append(tuple_body[start:].strip())
    return fields


def safe_scalar(raw: str) -> str | int | None:
    raw = raw.strip()
    if raw.upper() == "NULL":
        return None
    if raw.startswith("0x") or raw.startswith("0X"):
        return "<binary>"
    if len(raw) >= 2 and raw[0] == "'" and raw[-1] == "'":
        return raw[1:-1].replace("\\'", "'").replace("\\\\", "\\")
    try:
        return int(raw)
    except ValueError:
        return "<redacted>"


def selected_rows(
    dump: str,
    table: str,
    columns: list[str],
    output_columns: list[str] | None = None,
) -> list[dict]:
    rows: list[dict] = []
    for statement in sql_statements(dump):
        match = INSERT_RE.search(statement)
        if not match or match.group("name") != table:
            continue
        for raw_tuple in value_tuples(match.group("values")):
            values = tuple_fields(raw_tuple)
            if len(values) != len(columns):
                continue
            row = {column: safe_scalar(value) for column, value in zip(columns, values)}
            if output_columns is not None:
                row = {column: row[column] for column in output_columns}
            rows.append(row)
    return rows


def reference_target(table: str, column: str) -> tuple[str, str] | None:
    name = column.lower()
    if name == "entity_id" and table.startswith("field_"):
        return "node.nid", "field storage entity ID"
    for suffix, target in (
        ("_uid", "users.uid"),
        ("_fid", "file_managed.fid"),
        ("_nid", "node.nid"),
        ("_tid", "taxonomy_term_data.tid"),
    ):
        if name.endswith(suffix):
            return target, f"column suffix {suffix}"
    if name in {"uid", "fid", "nid", "tid"}:
        return {
            "uid": "users.uid",
            "fid": "file_managed.fid",
            "nid": "node.nid",
            "tid": "taxonomy_term_data.tid",
        }[name], "conventional Drupal identifier"
    return None


def reference_candidates(tables: dict[str, dict]) -> list[dict[str, str]]:
    candidates: list[dict[str, str]] = []
    for table, definition in tables.items():
        for column in definition["columns"]:
            target = reference_target(table, column["name"])
            if target:
                target_table, reason = target
                candidates.append(
                    {
                        "table": table,
                        "column": column["name"],
                        "target": target_table,
                        "reason": reason,
                    }
                )
    return candidates


def build_field_mapping(field_definitions: list[dict], field_instances: list[dict]) -> list[dict]:
    definitions = {row["id"]: row for row in field_definitions}
    mapping: list[dict] = []
    for instance in field_instances:
        definition = definitions.get(instance["field_id"])
        if not definition:
            continue
        mapping.append(
            {
                "bundle": instance["bundle"],
                "entity_type": instance["entity_type"],
                "field_name": instance["field_name"],
                "type": definition["type"],
                "module": definition["module"],
                "cardinality": definition["cardinality"],
                "translatable": definition["translatable"],
                "deleted": instance["deleted"] or definition["deleted"],
            }
        )
    return sorted(mapping, key=lambda row: (row["entity_type"], row["bundle"], row["field_name"]))


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
    field_definitions = selected_rows(
        dump,
        "field_config",
        [
            "id",
            "field_name",
            "type",
            "module",
            "active",
            "storage_type",
            "storage_module",
            "storage_active",
            "locked",
            "data",
            "cardinality",
            "translatable",
            "deleted",
        ],
        ["id", "field_name", "type", "module", "active", "cardinality", "translatable", "deleted"],
    )
    field_instances = selected_rows(
        dump,
        "field_config_instance",
        ["id", "field_id", "field_name", "entity_type", "bundle", "data", "deleted"],
    )
    node_types = selected_rows(
        dump,
        "node_type",
        [
            "type",
            "name",
            "base",
            "module",
            "description",
            "help",
            "has_title",
            "title_label",
            "custom",
            "modified",
            "locked",
            "disabled",
            "orig_type",
        ],
        ["type", "name", "base", "module", "has_title", "custom", "disabled"],
    )
    field_mapping = build_field_mapping(field_definitions, field_instances)
    return {
        "sha256": sha256(path),
        "size_bytes": path.stat().st_size,
        "tables": dict(sorted(tables.items())),
        "field_storage_tables": field_storage,
        "field_storage_prefixes": sorted(set(content_types)),
        "field_definitions": field_definitions,
        "field_instances": field_instances,
        "field_mapping": field_mapping,
        "reference_candidates": reference_candidates(tables),
        "node_types": node_types,
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
