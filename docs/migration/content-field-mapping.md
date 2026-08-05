# Drupal content and field inventory

Generated from the private Drupal export by `scripts/migration/inventory.py`.
This document contains schema metadata only; no source row values or secrets are included.

## Source content types

| Machine name       | Label            | Status   |
| ------------------ | ---------------- | -------- |
| `article`          | Artikel          | active   |
| `blikvanger`       | Blikvanger       | active   |
| `boeking`          | Boeking          | active   |
| `forum`            | Forumonderwerp   | active   |
| `fotoalbum`        | Fotoalbum        | active   |
| `klassement`       | Klassement       | active   |
| `liga`             | Liga             | active   |
| `page`             | Basispagina      | active   |
| `panel`            | Panel            | disabled |
| `ploeg`            | Ploeg            | active   |
| `poll`             | Enquête          | active   |
| `seizoen`          | Seizoen          | active   |
| `sponsor`          | Sponsor          | active   |
| `voorbeschouwing`  | Voorbeschouwing  | active   |
| `wedstrijd`        | Wedstrijd        | active   |
| `wedstrijdverslag` | Wedstrijdverslag | active   |
| `zaal`             | Zaal             | active   |

## Node field mapping

| Bundle             | Drupal field                       | Drupal type               | Cardinality | Translatable | Payload review direction               |
| ------------------ | ---------------------------------- | ------------------------- | ----------: | -----------: | -------------------------------------- |
| `article`          | `body`                             | `text_with_summary`       |           1 |          yes | richText (review HTML conversion)      |
| `article`          | `field_artikel_image`              | `image`                   |           1 |          yes | upload (media)                         |
| `article`          | `field_blikvanger`                 | `node_reference`          |           1 |           no | review source type                     |
| `blikvanger`       | `field_blikvanger_afbeelding`      | `image`                   |           1 |           no | upload (media)                         |
| `boeking`          | `field_boeking_bedrag`             | `number_decimal`          |           1 |          yes | review source type                     |
| `boeking`          | `field_boeking_categorie`          | `list_text`               |           1 |           no | select or relationship (review values) |
| `boeking`          | `field_boeking_datum`              | `date`                    |           1 |          yes | date                                   |
| `boeking`          | `field_boeking_opmerking`          | `text`                    |           1 |           no | text                                   |
| `boeking`          | `field_boeking_seizoen`            | `node_reference`          |           1 |          yes | review source type                     |
| `boeking`          | `field_boeking_speler`             | `user_reference`          |           1 |          yes | review source type                     |
| `boeking`          | `field_boeking_status`             | `list_boolean`            |           1 |          yes | review source type                     |
| `boeking`          | `field_boeking_type`               | `list_text`               |           1 |          yes | select or relationship (review values) |
| `boeking`          | `field_boeking_wedstrijd`          | `node_reference`          |           1 |          yes | review source type                     |
| `forum`            | `body`                             | `text_with_summary`       |           1 |          yes | richText (review HTML conversion)      |
| `forum`            | `taxonomy_forums`                  | `taxonomy_term_reference` |           1 |           no | relationship                           |
| `fotoalbum`        | `field_datum_van_evenement`        | `datetime`                |           1 |           no | date                                   |
| `fotoalbum`        | `field_fotoalbum_fotograaf`        | `user_reference`          |           1 |           no | review source type                     |
| `fotoalbum`        | `field_fotoalbum_fotos`            | `image`                   |        many |          yes | upload (media)                         |
| `fotoalbum`        | `field_fotoalbum_wedstrijd`        | `node_reference`          |           1 |          yes | review source type                     |
| `klassement`       | `field_klassement_datum`           | `date`                    |           1 |          yes | date                                   |
| `klassement`       | `field_klassement_hash`            | `text`                    |           1 |          yes | text                                   |
| `klassement`       | `field_klassement_seizoen`         | `node_reference`          |           1 |          yes | review source type                     |
| `klassement`       | `field_klassement_tabel`           | `tablefield`              |           1 |          yes | review source type                     |
| `klassement`       | `field_klassement_thuisvoordeel`   | `number_float`            |           1 |           no | review source type                     |
| `klassement`       | `field_klassement_uitslagen`       | `tablefield`              |           1 |           no | review source type                     |
| `klassement`       | `field_klassement_voorspelling`    | `tablefield`              |           1 |           no | review source type                     |
| `liga`             | `field_liga_logo`                  | `image`                   |           1 |          yes | upload (media)                         |
| `liga`             | `field_liga_type`                  | `list_text`               |           1 |          yes | select or relationship (review values) |
| `liga`             | `field_liga_website`               | `link_field`              |           1 |          yes | text or group (review URL/title)       |
| `page`             | `body`                             | `text_with_summary`       |           1 |          yes | richText (review HTML conversion)      |
| `page`             | `field_blikvanger`                 | `node_reference`          |           1 |           no | review source type                     |
| `page`             | `field_pagina_image`               | `image`                   |           1 |          yes | upload (media)                         |
| `ploeg`            | `field_naam_liga_zemst`            | `text`                    |           1 |           no | text                                   |
| `ploeg`            | `field_ploeg_contact`              | `text`                    |           1 |          yes | text                                   |
| `ploeg`            | `field_ploeg_email`                | `email`                   |           1 |          yes | email                                  |
| `ploeg`            | `field_ploeg_image`                | `image`                   |           1 |          yes | upload (media)                         |
| `ploeg`            | `field_ploeg_logo`                 | `image`                   |           1 |          yes | upload (media)                         |
| `ploeg`            | `field_ploeg_telefoon`             | `text`                    |           1 |          yes | text                                   |
| `ploeg`            | `field_ploeg_website`              | `link_field`              |           1 |          yes | text or group (review URL/title)       |
| `seizoen`          | `field_grafiek_klassement`         | `text_long`               |           1 |           no | textarea                               |
| `seizoen`          | `field_grafiek_vorm`               | `text`                    |           1 |           no | text                                   |
| `seizoen`          | `field_seizoen_dalers`             | `number_integer`          |           1 |          yes | review source type                     |
| `seizoen`          | `field_seizoen_klassement_url`     | `text`                    |           1 |          yes | text                                   |
| `seizoen`          | `field_seizoen_periode`            | `date`                    |           1 |          yes | date                                   |
| `seizoen`          | `field_seizoen_ploegen`            | `node_reference`          |        many |           no | review source type                     |
| `seizoen`          | `field_seizoen_reeks`              | `text`                    |           1 |          yes | text                                   |
| `seizoen`          | `field_seizoen_stijgers`           | `number_integer`          |           1 |          yes | review source type                     |
| `sponsor`          | `field_sponsor_logo`               | `image`                   |           1 |          yes | upload (media)                         |
| `sponsor`          | `field_sponsor_website`            | `link_field`              |           1 |          yes | text or group (review URL/title)       |
| `voorbeschouwing`  | `body`                             | `text_with_summary`       |           1 |          yes | richText (review HTML conversion)      |
| `voorbeschouwing`  | `field_voorbeschouwing_wedstrijd`  | `node_reference`          |           1 |           no | review source type                     |
| `wedstrijd`        | `field_blikvanger`                 | `node_reference`          |           1 |           no | review source type                     |
| `wedstrijd`        | `field_wedstrijd_afgevaardigde`    | `user_reference`          |        many |          yes | review source type                     |
| `wedstrijd`        | `field_wedstrijd_bezoekers`        | `node_reference`          |           1 |          yes | review source type                     |
| `wedstrijd`        | `field_wedstrijd_datum`            | `date`                    |           1 |          yes | date                                   |
| `wedstrijd`        | `field_wedstrijd_doelpunten_bezoe` | `number_integer`          |           1 |          yes | review source type                     |
| `wedstrijd`        | `field_wedstrijd_doelpunten_thuis` | `number_integer`          |           1 |          yes | review source type                     |
| `wedstrijd`        | `field_wedstrijd_forfait`          | `list_boolean`            |           1 |           no | review source type                     |
| `wedstrijd`        | `field_wedstrijd_image`            | `image`                   |           1 |          yes | upload (media)                         |
| `wedstrijd`        | `field_wedstrijd_liga`             | `node_reference`          |           1 |          yes | review source type                     |
| `wedstrijd`        | `field_wedstrijd_organisator`      | `user_reference`          |           1 |           no | review source type                     |
| `wedstrijd`        | `field_wedstrijd_reserve`          | `user_reference`          |        many |          yes | review source type                     |
| `wedstrijd`        | `field_wedstrijd_scheids_opmerkin` | `text`                    |           1 |           no | text                                   |
| `wedstrijd`        | `field_wedstrijd_scheids_score`    | `number_integer`          |           1 |           no | review source type                     |
| `wedstrijd`        | `field_wedstrijd_scheidsrechter`   | `text`                    |           1 |           no | text                                   |
| `wedstrijd`        | `field_wedstrijd_seizoen`          | `node_reference`          |           1 |          yes | review source type                     |
| `wedstrijd`        | `field_wedstrijd_thuisploeg`       | `node_reference`          |           1 |          yes | review source type                     |
| `wedstrijd`        | `field_wedstrijd_uitgesteld`       | `list_boolean`            |           1 |           no | review source type                     |
| `wedstrijd`        | `field_wedstrijd_uitnodiging`      | `text_long`               |           1 |          yes | textarea                               |
| `wedstrijd`        | `field_wedstrijd_verloop`          | `tablefield`              |           1 |          yes | review source type                     |
| `wedstrijd`        | `field_wedstrijd_verslag`          | `node_reference`          |           1 |          yes | review source type                     |
| `wedstrijd`        | `field_wedstrijd_zaal`             | `node_reference`          |           1 |          yes | review source type                     |
| `wedstrijdverslag` | `body`                             | `text_with_summary`       |           1 |          yes | richText (review HTML conversion)      |
| `wedstrijdverslag` | `field_blikvanger`                 | `node_reference`          |           1 |           no | review source type                     |
| `wedstrijdverslag` | `field_wedstrijdverslag_wedstrijd` | `node_reference`          |           1 |          yes | review source type                     |
| `zaal`             | `field_zaal_adres`                 | `embed_gmap`              |           1 |          yes | review source type                     |
| `zaal`             | `field_zaal_id`                    | `number_integer`          |           1 |           no | review source type                     |
| `zaal`             | `field_zaal_id_ligazemst`          | `number_integer`          |           1 |           no | review source type                     |
| `zaal`             | `field_zaal_image`                 | `image`                   |           1 |          yes | upload (media)                         |
| `zaal`             | `field_zaal_website`               | `link_field`              |           1 |          yes | text or group (review URL/title)       |

## Reference candidates

The inventory identified **311** foreign-key-like schema references. These are candidates for Payload relationships and must be validated against actual source rows during importer development.

| Target                   | Candidate count |
| ------------------------ | --------------: |
| `file_managed.fid`       |              33 |
| `node.nid`               |             254 |
| `taxonomy_term_data.tid` |               5 |
| `users.uid`              |              19 |

## Expected unresolved references and exclusions

- Missing Drupal references must be reported, not silently dropped.
- Historical players/users may remain valid references even when inactive.
- Generated image styles, caches, deferred `ndmt_wedstrijd`, forum, comments, and klassement data follow the exclusions in `docs/migration/decisions.md`.
- `field_config.data` and instance display configuration are serialized Drupal metadata; the inventory intentionally records it as `<binary>` and does not decode it.
- Payload collection definitions require review before implementation, especially rich text, media, links, taxonomy references, and fields with cardinality `-1`.
