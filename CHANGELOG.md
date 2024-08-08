# DuckDB Connector Changelog
This changelog documents changes between release tags.

## [0.0.21] - 2024-08-8
* Update SDK version

## [0.0.20] - 2024-08-8
* Fix versions in connector-definition

## [0.0.19] - 2024-08-6
* Update workflow to open a PR in ndc-hub

## [0.0.18] - 2024-08-5
* Update SDK to 5.2.0
* Pin version to 0.1.5

## [0.0.17] - 2024-05-7
* Bump Version

## [0.0.16] - 2024-05-6
* Change orderBy to use default casing. (Ordering is case-sensitive and uses underlying implementation which differs from Postgres)

## [0.0.15] - 2024-05-6
* Remove linux/arm/v7 from platforms

## [0.0.14] - 2024-05-6
* Add QEMU to Docker workflow

## [0.0.13] - 2024-05-6
* Bump version

## [0.0.12] - 2024-05-6
* Add Relationships support
* Fix OrderBy across relationships
* Add Filtering on Relationships
* Ship a multi-arch build

## [0.0.11] - 2024-04-17
* Update generate-config to use the proper configuration directory

## [0.0.10] - 2024-04-17
* Update SDK to 4.5.0
* Update packaging to use a Dockerized Command
* Fix generate-config to only re-write the config if the introspection results are different

## [0.0.9] - 2024-03-22
* Initial Version Tag