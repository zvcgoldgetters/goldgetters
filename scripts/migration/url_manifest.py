#!/usr/bin/env python3
"""Generate a deterministic, non-sensitive legacy URL manifest.

The SQL and crawl inputs are private migration inputs. The output is intended
for a private reconciliation directory and contains URL metadata only.
"""

from __future__ import annotations

import argparse
import gzip
import json
import re
from pathlib import Path
from typing import Iterable

from inventory import CREATE_TABLE_RE, parse_columns, selected_rows, sql_statements

PATH_RE = re.compile(r's:\d+:"path";s:\d+:"([^"]*)"')


def table_rows(dump: str, table: str, columns: list[str]) -> list[dict]:
    """Read selected columns using the table schema, including full dumps."""
    for statement in sql_statements(dump):
        match = CREATE_TABLE_RE.search(statement)
        if match and match.group("name") == table:
            schema_columns = [
                column["name"]
                for column in parse_columns(match.group("body"))
                if column["name"] is not None
            ]
            if all(column in schema_columns for column in columns):
                return selected_rows(dump, table, schema_columns, columns)
    # Small fixtures and hand-produced extracts may omit CREATE TABLE.
    return selected_rows(dump, table, columns)


def normalize_path(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    path = value.strip()
    if not path:
        return None
    if not path.startswith(("/", "?")):
        path = "/" + path
    return path


def entry(
    path: object,
    source: str,
    *,
    target_drupal_id: str | None = None,
    expected_status: int = 200,
    access_level: str = "unknown",
    redirect_required: bool = False,
    replacement_route: str | None = None,
    query_parameters: list[str] | None = None,
) -> dict | None:
    normalized = normalize_path(path)
    if normalized is None:
        return None
    return {
        "legacy_path": normalized,
        "query_parameters": sorted(query_parameters or []),
        "source": source,
        "target_drupal_id": target_drupal_id,
        "expected_status": expected_status,
        "access_level": access_level,
        "replacement_route": replacement_route,
        "redirect_required": redirect_required,
        "migration_status": "unclassified",
    }


def sql_entries(dump: str) -> list[dict]:
    entries: list[dict] = []

    node_rows = table_rows(dump, "node", ["nid"])
    for row in node_rows:
        item = entry(
            f"/node/{row['nid']}",
            "node",
            target_drupal_id=f"node:{row['nid']}",
        )
        if item:
            entries.append(item)

    alias_rows = table_rows(dump, "url_alias", ["pid", "source", "alias", "language"])
    for row in alias_rows:
        item = entry(
            row["alias"],
            "alias",
            target_drupal_id=str(row["source"]),
            redirect_required=True,
        )
        if item:
            entries.append(item)

    redirect_rows = table_rows(
        dump,
        "redirect",
        [
            "rid",
            "hash",
            "type",
            "uid",
            "source",
            "source_options",
            "redirect",
            "redirect_options",
            "language",
            "status_code",
            "last_used",
            "count",
        ],
    )
    for row in redirect_rows:
        status = row["status_code"] if isinstance(row["status_code"], int) else 301
        item = entry(
            row["source"],
            "redirect",
            target_drupal_id=str(row["redirect"]),
            expected_status=status,
            redirect_required=True,
        )
        if item:
            entries.append(item)

    menu_rows = table_rows(
        dump,
        "menu_links",
        [
            "mlid",
            "menu_name",
            "plid",
            "link_path",
            "router_path",
            "link_title",
            "options",
            "module",
            "hidden",
            "external",
            "has_children",
            "expanded",
            "weight",
            "depth",
            "customized",
            "p1",
            "p2",
            "p3",
            "p4",
            "p5",
            "p6",
            "p7",
            "p8",
            "p9",
            "updated",
        ],
    )
    for row in menu_rows:
        item = entry(row["link_path"], "menu", access_level="menu")
        if item:
            entries.append(item)

    route_rows = table_rows(
        dump,
        "menu_router",
        [
            "path",
            "load_functions",
            "to_arg_functions",
            "access_callback",
            "access_arguments",
            "page_callback",
            "page_arguments",
            "delivery_callback",
            "fit",
            "number_parts",
            "tab_parent",
            "tab_root",
            "title",
            "title_callback",
            "title_arguments",
            "type",
            "weight",
            "include_file",
        ],
    )
    for row in route_rows:
        item = entry(row["path"], "route", access_level="callback")
        if item:
            entries.append(item)

    view_rows = table_rows(
        dump,
        "views_display",
        ["vid", "id", "display_plugin", "position", "display_title", "display_options"],
    )
    for row in view_rows:
        options = row["display_options"] if isinstance(row["display_options"], str) else ""
        for path in PATH_RE.findall(options):
            item = entry(
                path,
                "View",
                target_drupal_id=f"view:{row['vid']}:{row['id']}",
                access_level="view",
            )
            if item:
                entries.append(item)

    return entries


def crawl_entries(path: Path | None) -> list[dict]:
    if path is None:
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    records = data.get("urls", data) if isinstance(data, dict) else data
    if not isinstance(records, list):
        raise ValueError("crawl JSON must be a list or an object with a 'urls' list")
    entries: list[dict] = []
    for record in records:
        if not isinstance(record, dict):
            continue
        item = entry(
            record.get("path", record.get("url")),
            "crawl",
            expected_status=record.get("status", record.get("expected_status", 200)),
            access_level=record.get("access_level", "crawl"),
            query_parameters=record.get("query_parameters", []),
        )
        if item:
            entries.append(item)
    return entries


def deduplicate(entries: Iterable[dict]) -> list[dict]:
    merged: dict[tuple[str, tuple[str, ...]], dict] = {}
    for item in entries:
        key = (item["legacy_path"], tuple(item["query_parameters"]))
        current = merged.get(key)
        if current is None:
            merged[key] = item
            continue
        sources = sorted(set(current["source"].split(",")) | {item["source"]})
        current["source"] = ",".join(sources)
        current["redirect_required"] |= item["redirect_required"]
        if current["target_drupal_id"] is None:
            current["target_drupal_id"] = item["target_drupal_id"]
        if current["expected_status"] == 200 and item["expected_status"] != 200:
            current["expected_status"] = item["expected_status"]
    return sorted(merged.values(), key=lambda item: (item["legacy_path"], item["query_parameters"]))


def build_manifest(sql_path: Path, crawl_path: Path | None = None) -> dict:
    with gzip.open(sql_path, "rt", encoding="utf-8", errors="replace") as source:
        dump = source.read()
    return {
        "schema_version": 1,
        "sources": ["sql", *(["crawl"] if crawl_path else [])],
        "entries": deduplicate([*sql_entries(dump), *crawl_entries(crawl_path)]),
    }


def main(arguments: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sql", type=Path, required=True)
    parser.add_argument("--crawl", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    options = parser.parse_args(arguments)
    options.output.parent.mkdir(parents=True, exist_ok=True)
    options.output.write_text(
        json.dumps(build_manifest(options.sql, options.crawl), indent=2) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
