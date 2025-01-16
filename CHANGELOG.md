# DuckDB Connector Changelog
This changelog documents changes between release tags.

## [0.2.0] - 2025-01-15
Implement Aggregates

* Basic Aggregates
    * star_count
    * single_column
    * single_column distinct

* Numeric Aggregates:
    * sum
    * avg
    * max
    * min
    * stddev
    * stddev_samp
    * stddev_pop
    * variance
    * var_samp
    * var_pop

* String Aggregates:
    * group_concat
    * group_concat_distinct
    * group_concat_include_nulls

* Previously, LIKE would automatically wrap the string with %% to do a full-text search, now we allow users to use % on their own so LIKE has full functionality.

* Add BigDecimal scalar type for arbitrary precision decimals so aggregation functions like SUM don't overflow


## [0.1.8] - 2025-01-15
* Enable Aggregates

## [0.1.7] - 2025-01-15
* Fix filtering across relationships

## [0.1.6] - 2025-01-15
* Fix github workflow

## [0.1.5] - 2025-01-15
* Fix order by LOWER cast

## [0.1.4] - 2025-01-08
* Update to fix a bug to add support for UBigInt, HugeInt, UHugeInt
* Add support for Timestamps with Timezone
* Fix object type mapping on JOINS
* Cast ORDER BY columns to lowercase so that field sorting yields A a B b rather than A B a b

## [0.1.3] - 2025-01-08
* Bugfix for query builder

## [0.1.2] - 2025-01-08
* Fix packaging

## [0.1.1] - 2025-01-08
* Add table comments to descriptions
* Special case Timestamps and BigInt filtering

## [0.1.0] - 2024-08-22
* Update Documentation for ndc-hub

## [0.0.22] - 2024-08-13
* Update workflow to publish to registry

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