

# [1.2.0](https://github.com/angelxmoreno/bun-sqlite-orm/compare/v1.1.0...v1.2.0) (2025-06-19)


### Bug Fixes

* add conditional validation for bulk operations in QueryBuilder ([195e1d4](https://github.com/angelxmoreno/bun-sqlite-orm/commit/195e1d44e4fcc1ccea82ab926662ad5d080d13ea))
* add lint:fix to release-it after:bump hook ([a6d81d9](https://github.com/angelxmoreno/bun-sqlite-orm/commit/a6d81d9b434b16b25576fb59effeeb7a9c971702))
* add proper SQL identifier quoting in generateIndexes method ([49191ad](https://github.com/angelxmoreno/bun-sqlite-orm/commit/49191ad0c4070d977bf3a0f7bd1a00f7af631b62))
* add validation for composite primary keys in get() and reload() methods ([d68cc4f](https://github.com/angelxmoreno/bun-sqlite-orm/commit/d68cc4fd8ad7e3ec4537329a2659f8ab37d32aff))
* add validation to buildSetClause to prevent invalid SQL generation ([36ddbf5](https://github.com/angelxmoreno/bun-sqlite-orm/commit/36ddbf51f50b7f991d55f5bd0d73430b96394484))
* add validation to prevent INSERT with empty data ([39fcfaf](https://github.com/angelxmoreno/bun-sqlite-orm/commit/39fcfafbd9ac60f75c27a8b4e0a02ca8d3991a91))
* address CodeRabbitAI feedback and improve test quality ([ec07ad9](https://github.com/angelxmoreno/bun-sqlite-orm/commit/ec07ad9eb67fdad48e4be2ef1cff5082d85f998c))
* fixed [#5](https://github.com/angelxmoreno/bun-sqlite-orm/issues/5) Prepared statements not finalized causing memory leaks ([3d2f35d](https://github.com/angelxmoreno/bun-sqlite-orm/commit/3d2f35dcfebc804eeaacbdd62d20004427a47672))
* fixed [#6](https://github.com/angelxmoreno/bun-sqlite-orm/issues/6) Parameter binding uses unsafe types instead of SQLQueryBindings ([d52f4fd](https://github.com/angelxmoreno/bun-sqlite-orm/commit/d52f4fdd3ce39b55f3dffa3b1793ce844a9f0602))
* fixed Boolean conversion is too permissive ([001abdb](https://github.com/angelxmoreno/bun-sqlite-orm/commit/001abdb54dfdcc20758d2d2184991e371bde467f))
* fixed boolean type conversion ([53cff50](https://github.com/angelxmoreno/bun-sqlite-orm/commit/53cff507d423ec303f5581b6993d7a15f39c5b91))
* prevent database operations before DataSource initialization ([48c08e5](https://github.com/angelxmoreno/bun-sqlite-orm/commit/48c08e51f862ac7e4456eba010fe97ba1d2a64f7)), closes [#7](https://github.com/angelxmoreno/bun-sqlite-orm/issues/7)
* resolve date conversion timezone issues in entity handling ([f4fd917](https://github.com/angelxmoreno/bun-sqlite-orm/commit/f4fd9171ffc0d15e0e89b297dc858d82a3c829e4)), closes [#11](https://github.com/angelxmoreno/bun-sqlite-orm/issues/11)
* resolve TypeScript compilation errors in index decorator ([6a86288](https://github.com/angelxmoreno/bun-sqlite-orm/commit/6a8628858d57f18b0003c6c6536913053dbea72f))


### Features

* add clear() method to MetadataContainer for test isolation ([f31a004](https://github.com/angelxmoreno/bun-sqlite-orm/commit/f31a004d2389cbbb324b8e414b7e14043a4c3043))
* add column-level unique index support to @Column decorator ([1e03166](https://github.com/angelxmoreno/bun-sqlite-orm/commit/1e03166f08781398c253698148e255c1b5dcf44c))
* add comprehensive validation for composite index columns array ([bba9580](https://github.com/angelxmoreno/bun-sqlite-orm/commit/bba9580909a4be6aab83669d5a83d63595387f85))
* add missing overloads for property-level Index decorator with options ([37d0606](https://github.com/angelxmoreno/bun-sqlite-orm/commit/37d06067c2e44c529d98929f0ac03d82f8d0a6b7))
* add SQL defaults support with sqlDefault option ([1417151](https://github.com/angelxmoreno/bun-sqlite-orm/commit/1417151607b0a67ac06e3c14e5f5f46637f84639))
* implement comprehensive column indexing support ([ab74128](https://github.com/angelxmoreno/bun-sqlite-orm/commit/ab741284409d8e247838d6167a42d9c462f33e22))
* implement global index name uniqueness enforcement ([1cafe68](https://github.com/angelxmoreno/bun-sqlite-orm/commit/1cafe688e720d259ea40f3ac16adaa9e6b25f899))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-06-14

### Bug Fixes
* downgrade release-it to Node.js v20 compatible version ([aa19cbb](https://github.com/angelxmoreno/bun-sqlite-orm/commit/aa19cbb9d3770fb86d91e117ccda573cc0939177))
* resolve TypeScript compilation errors in GitHub Actions ([fd3b90a](https://github.com/angelxmoreno/bun-sqlite-orm/commit/fd3b90a07d5479737b5d1c2fb647ac14bb7cc1b5))
* update to non-deprecated SonarQube scan action ([9c8596d](https://github.com/angelxmoreno/bun-sqlite-orm/commit/9c8596dba4cf365bdd0e59d66049214ab424a6e0))

### Features
* add automated release management with release-it ([ec3dc8f](https://github.com/angelxmoreno/bun-sqlite-orm/commit/ec3dc8f6b2db0a198f4b4a1feed19102dfa1837b))
* created classes for datasource orchestration ([4cb5a6d](https://github.com/angelxmoreno/bun-sqlite-orm/commit/4cb5a6d66310c05b995889fecdf794550ee23bf8))
* integrate SonarCloud and Codecov quality tools ([a8a9f94](https://github.com/angelxmoreno/bun-sqlite-orm/commit/a8a9f9444f9f758f418117568d69103dcf171629))
* integrated linters ([c4ce766](https://github.com/angelxmoreno/bun-sqlite-orm/commit/c4ce76639c2be829cdc9e16f984a95d7058b96e9))

### Added
- Initial release of BunSQLiteORM
- Active Record pattern implementation
- TypeScript decorator-based entity definitions
- Built-in validation with class-validator
- Auto migrations and table creation
- Multiple primary key strategies (auto-increment, UUID, manual)
- Entity state tracking and change detection
- Comprehensive test suite with 98%+ coverage
- SonarCloud and Codecov integration
- Professional documentation and contributor guidelines

### Features
- `@Entity`, `@Column`, `@PrimaryColumn`, `@PrimaryGeneratedColumn` decorators
- BaseEntity with full Active Record methods (find, get, save, remove, etc.)
- DataSource for database connection management
- Automatic table creation from entity metadata
- Type-safe query methods
- Bulk operations (updateAll, deleteAll)
- Entity validation with detailed error reporting
- Support for nullable and unique columns
- Default value support (static and function-based)

## [1.0.0] - 2024-01-XX

### Added
- Initial stable release