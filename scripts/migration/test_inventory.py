import gzip
import json
import tarfile
import unittest
from io import BytesIO
from pathlib import Path

from inventory import build_field_mapping, build_report, count_value_tuples, reference_target, views_inventory


SQL = """CREATE TABLE `node` (
  `nid` int(10) unsigned NOT NULL,
  `type` varchar(32) NOT NULL,
  PRIMARY KEY (`nid`)
) ENGINE=InnoDB;
CREATE TABLE `field_data_field_title` (
  `entity_id` int(10) NOT NULL,
  `field_title_value` varchar(255) DEFAULT NULL
) ENGINE=InnoDB;
CREATE TABLE `cache_bootstrap` (`cid` varchar(255)) ENGINE=InnoDB;
INSERT INTO `node` (`nid`, `type`) VALUES
(1,'article'),
(2,'page');
INSERT INTO `field_data_field_title` VALUES (1,'A title with (parentheses; and semicolon)');
CREATE TABLE `views_view` (
  `vid` int(10) unsigned NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(255) NOT NULL,
  `tag` varchar(80) NOT NULL,
  `base_table` varchar(128) NOT NULL,
  `human_name` varchar(255) NOT NULL,
  `core` int(10) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE `views_display` (
  `vid` int(10) unsigned NOT NULL,
  `id` varchar(64) NOT NULL,
  `display_plugin` varchar(64) NOT NULL,
  `position` int(10) NOT NULL,
  `display_title` varchar(255) NOT NULL,
  `display_options` longtext NOT NULL
) ENGINE=InnoDB;
INSERT INTO `views_view` VALUES (1,'news','Private description','default','node','News','7');
INSERT INTO `views_display` VALUES (1,'page_1','page',0,'News page','a:2:{s:4:"path";s:10:"news";s:7:"access";a:0:{}}');
"""


def create_exports(tmp_path: Path) -> tuple[Path, Path]:
    sql_path = tmp_path / "mysql.sql.gz"
    with gzip.open(sql_path, "wt", encoding="utf-8") as output:
        output.write(SQL)

    archive_path = tmp_path / "goldgetters-files.tar.gz"
    with tarfile.open(archive_path, "w:gz") as archive:
        source = b"image"
        info = tarfile.TarInfo("files/images/photo.jpg")
        info.size = len(source)
        archive.addfile(info, BytesIO(source))
        generated = b"derivative"
        info = tarfile.TarInfo("files/styles/thumbnail/photo.jpg")
        info.size = len(generated)
        archive.addfile(info, BytesIO(generated))
    return sql_path, archive_path


class InventoryTests(unittest.TestCase):
    def test_count_value_tuples_ignores_parentheses_inside_strings(self):
        self.assertEqual(count_value_tuples("(1,'x(y)'),(2,'z')"), 2)

    def test_build_report_contains_schema_counts_and_archive_metadata(self):
        with self.subTest("temporary exports"):
            from tempfile import TemporaryDirectory

            with TemporaryDirectory() as directory:
                sql_path, archive_path = create_exports(Path(directory))
                report = build_report(sql_path, archive_path)

        self.assertEqual(report["schema_version"], 1)
        self.assertEqual(report["sql_export"]["tables"]["node"]["row_count"], 2)
        self.assertEqual(
            report["sql_export"]["tables"]["field_data_field_title"]["row_count"],
            1,
        )
        self.assertNotIn("cache_bootstrap", report["sql_export"]["tables"])
        self.assertEqual(report["files_export"]["file_count"], 2)
        self.assertEqual(report["files_export"]["categories"]["generated_or_cache"], 1)
        self.assertEqual(report["files_export"]["extensions"][".jpg"], 2)

    def test_field_mapping_joins_definitions_to_bundles(self):
        mapping = build_field_mapping(
            [
                {
                    "id": 1,
                    "field_name": "field_logo",
                    "type": "image",
                    "module": "image",
                    "cardinality": 1,
                    "translatable": 0,
                    "deleted": 0,
                }
            ],
            [
                {
                    "field_id": 1,
                    "field_name": "field_logo",
                    "entity_type": "node",
                    "bundle": "team",
                    "deleted": 0,
                }
            ],
        )
        self.assertEqual(mapping[0]["bundle"], "team")
        self.assertEqual(mapping[0]["type"], "image")

    def test_reference_target_identifies_drupal_foreign_key_conventions(self):
        self.assertEqual(reference_target("field_data_field_logo", "field_logo_fid")[0], "file_managed.fid")
        self.assertEqual(reference_target("field_data_field_title", "entity_id")[0], "node.nid")

    def test_views_inventory_keeps_metadata_but_not_serialized_values(self):
        views = views_inventory(SQL)
        self.assertEqual(views["view_count"], 1)
        self.assertEqual(views["display_count"], 1)
        self.assertEqual(views["displays"][0]["display_plugin"], "page")
        self.assertIn("path", views["displays"][0]["display_options_keys"])
        self.assertNotIn("news", json.dumps(views["displays"][0]["display_options_keys"]))

    def test_report_is_json_serializable(self):
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as directory:
            sql_path, archive_path = create_exports(Path(directory))
            json.dumps(build_report(sql_path, archive_path))


if __name__ == "__main__":
    unittest.main()
