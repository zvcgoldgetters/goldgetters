import gzip
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from url_manifest import build_manifest


SQL = """INSERT INTO `node` (`nid`) VALUES (2),(1);
INSERT INTO `url_alias` (`pid`, `source`, `alias`, `language`) VALUES (1,'node/1','news','');
INSERT INTO `views_display` VALUES (3,'page_1','page',0,'News','a:2:{s:4:\"path\";s:4:\"news\";}');
"""


class UrlManifestTests(unittest.TestCase):
    def test_manifest_combines_sql_and_crawl_sources_deterministically(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            sql_path = root / "dump.sql.gz"
            with gzip.open(sql_path, "wt", encoding="utf-8") as output:
                output.write(SQL)
            crawl_path = root / "crawl.json"
            crawl_path.write_text(
                json.dumps({"urls": [{"path": "/news", "status": 200, "access_level": "public"}]}),
                encoding="utf-8",
            )

            manifest = build_manifest(sql_path, crawl_path)

        self.assertEqual(manifest["schema_version"], 1)
        self.assertEqual(manifest["sources"], ["sql", "crawl"])
        self.assertEqual([entry["legacy_path"] for entry in manifest["entries"]], ["/news", "/node/1", "/node/2"])
        news = next(entry for entry in manifest["entries"] if entry["legacy_path"] == "/news")
        self.assertEqual(news["source"], "View,alias,crawl")
        self.assertTrue(news["redirect_required"])
        self.assertNotIn("News", json.dumps(manifest["entries"]))

    def test_duplicate_paths_are_merged_and_query_parameters_sorted(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            sql_path = root / "dump.sql.gz"
            with gzip.open(sql_path, "wt", encoding="utf-8") as output:
                output.write("INSERT INTO `node` (`nid`) VALUES (1);\n")
            crawl_path = root / "crawl.json"
            crawl_path.write_text(
                json.dumps({"urls": [{"url": "/node/1", "status": 404, "query_parameters": ["page", "q"]}]}),
                encoding="utf-8",
            )
            entries = build_manifest(sql_path, crawl_path)["entries"]
            entry = next(item for item in entries if item["query_parameters"])
            node_entry = next(item for item in entries if not item["query_parameters"])

        self.assertEqual(entry["query_parameters"], ["page", "q"])
        self.assertEqual(entry["source"], "crawl")
        self.assertEqual(entry["expected_status"], 404)
        self.assertEqual(node_entry["source"], "node")


if __name__ == "__main__":
    unittest.main()
