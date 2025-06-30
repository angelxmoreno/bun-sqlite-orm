

# [1.5.0](https://github.com/angelxmoreno/bun-sqlite-orm/compare/v1.4.0...v1.5.0) (2025-06-30)


### Bug Fixes

* addressed CodeRabbit suggestion for collision-prone empty string marker ([f80e84b](https://github.com/angelxmoreno/bun-sqlite-orm/commit/f80e84bfe6ae3416740394931593cb3e6bbc31c7))
* addressed CodeRabbit suggestion for insufficient transformer load error test ([0fd939d](https://github.com/angelxmoreno/bun-sqlite-orm/commit/0fd939dffe334c4036292ee6a097660bf630bdce))
* addressed CodeRabbit suggestion for misleading JSON query test ([292a8de](https://github.com/angelxmoreno/bun-sqlite-orm/commit/292a8deb34de548be047ca7f515f8209c77b2ca0))
* addressed CodeRabbit suggestion for misleading test name ([db4bc69](https://github.com/angelxmoreno/bun-sqlite-orm/commit/db4bc69e0750640ec162edd991c8760d30d600f1))
* implement inheritance metadata collection to resolve entity inheritance issues ([5ca9131](https://github.com/angelxmoreno/bun-sqlite-orm/commit/5ca9131f87af1d4455c1b4f8c935d7a7091400f3)), closes [#51](https://github.com/angelxmoreno/bun-sqlite-orm/issues/51)
* implement proper sequential transaction result chaining ([6f5f025](https://github.com/angelxmoreno/bun-sqlite-orm/commit/6f5f025bf7fd561a129e46b6b91a0c758ec35396))
* let SQLite handle savepoint cleanup during commit automatically ([dfe2cfc](https://github.com/angelxmoreno/bun-sqlite-orm/commit/dfe2cfc0a50346d11ed17d278dcca7e551e90a3a))
* prevent base entities without @Entity decorator from creating unwanted tables ([#50](https://github.com/angelxmoreno/bun-sqlite-orm/issues/50)) ([69e6bcb](https://github.com/angelxmoreno/bun-sqlite-orm/commit/69e6bcb2cf1355a39db6ac4b7f90d0f158509cc2))
* refactor decorator tests to use inline entities and prevent CI metadata pollution ([9e78a38](https://github.com/angelxmoreno/bun-sqlite-orm/commit/9e78a38c1eace200d796af185d07ddfe03efd535)), closes [#50](https://github.com/angelxmoreno/bun-sqlite-orm/issues/50) [#51](https://github.com/angelxmoreno/bun-sqlite-orm/issues/51)
* refactor index decorator tests to use inline entities and eliminate CI failures ([86c70b0](https://github.com/angelxmoreno/bun-sqlite-orm/commit/86c70b079316c270908f3c4966d6ada82f7dbb6c)), closes [#51](https://github.com/angelxmoreno/bun-sqlite-orm/issues/51)
* resolve savepoint hanging issues and enable all savepoint tests ([b10933c](https://github.com/angelxmoreno/bun-sqlite-orm/commit/b10933c05fdb18764403a3dbcd3be59ef78a7fa9))
* resolved global index name conflicts in index decorator tests ([317ed89](https://github.com/angelxmoreno/bun-sqlite-orm/commit/317ed894828b62800b2641c110c57b6d31016085))
* temporarily skip problematic savepoint tests to prevent hanging ([30177ec](https://github.com/angelxmoreno/bun-sqlite-orm/commit/30177ece5bb880ff7a11e74148e5c2c7f5b81262))


### Features

* add comprehensive transaction support with ACID compliance ([8c5927b](https://github.com/angelxmoreno/bun-sqlite-orm/commit/8c5927ba849f1cdd90eb405240e03af3de38bbb2))
* add JSON column support and data transformers ([e66e982](https://github.com/angelxmoreno/bun-sqlite-orm/commit/e66e9823349a6936600d3d0dcc7d256d5aa0474f)), closes [#61](https://github.com/angelxmoreno/bun-sqlite-orm/issues/61)
* implement enhanced error system with base class and entity context ([b0e9294](https://github.com/angelxmoreno/bun-sqlite-orm/commit/b0e929424df0255380d975cb6d9b631f613a39e2)), closes [#57](https://github.com/angelxmoreno/bun-sqlite-orm/issues/57)
* improve instance update() method type safety with Partial<T> ([a6050d8](https://github.com/angelxmoreno/bun-sqlite-orm/commit/a6050d8060ee853a3221c73e0fa5dbe29873f799))

# [1.4.0](https://github.com/angelxmoreno/bun-sqlite-orm/compare/v1.3.0...v1.4.0) (2025-06-25)


### Bug Fixes

* remove unauthorized pr-description.md from repository ([c71a26a](https://github.com/angelxmoreno/bun-sqlite-orm/commit/c71a26ad7e78b61070a7fe37b3f1b2d799caab16))
* replace invalid 'DEFAULT' sqlDefault example with valid 'default_text' ([a50a110](https://github.com/angelxmoreno/bun-sqlite-orm/commit/a50a110dbcff3a17be1c93d20a0ddae941c3e7f2))
* revert unauthorized CHANGELOG.md modifications ([b2d6f8b](https://github.com/angelxmoreno/bun-sqlite-orm/commit/b2d6f8b36432dbbaf23f7b30b346354bf70ca000))


### Features

* enhance SQL expression detection for sqlDefault with case-insensitive support ([db5150d](https://github.com/angelxmoreno/bun-sqlite-orm/commit/db5150d19def9a0cc35376f9975dfb552e044a51))

# [1.3.0](https://github.com/angelxmoreno/bun-sqlite-orm/compare/v1.2.1...v1.3.0) (2025-06-25)


### Bug Fixes

* add columns to test entities to resolve GitHub Actions failures ([69c4e6f](https://github.com/angelxmoreno/bun-sqlite-orm/commit/69c4e6f51e379247857bf6efaffbb7ec317a312d)), closes [#43](https://github.com/angelxmoreno/bun-sqlite-orm/issues/43)
* add columns to test entities to resolve GitHub Actions failures ([cc65c7c](https://github.com/angelxmoreno/bun-sqlite-orm/commit/cc65c7c2dbee2c3d9f5be59bbdd484db3de94bc6)), closes [#43](https://github.com/angelxmoreno/bun-sqlite-orm/issues/43)
* add validation for entities with no columns in SQL generation ([4678398](https://github.com/angelxmoreno/bun-sqlite-orm/commit/467839886fc869bab7a55df452d968e44731a9e2)), closes [#43](https://github.com/angelxmoreno/bun-sqlite-orm/issues/43)
* address TypeScript errors and update documentation ([8b04871](https://github.com/angelxmoreno/bun-sqlite-orm/commit/8b0487174efaddda5d55da408eb1ab4ed0d0ee91))
* correct DataSource creation pattern and resolve entity duplication issues ([186763e](https://github.com/angelxmoreno/bun-sqlite-orm/commit/186763e4619106d5dcc6af9be04570f3f345aaba))
* remove tests from pre-commit hook to resolve conflicts ([baaf299](https://github.com/angelxmoreno/bun-sqlite-orm/commit/baaf299ea1207d31ac12d4dd78525ddde1388eca))
* resolve infinite loop in composite primary key tests ([b68e95a](https://github.com/angelxmoreno/bun-sqlite-orm/commit/b68e95a35b46c1e36fdd7c55228b669920303021))
* resolve table name conflicts in integration tests ([74cd18c](https://github.com/angelxmoreno/bun-sqlite-orm/commit/74cd18c75e462f82345e37f167058a138b8fb237))


### Features

* complete entity JSON serialization with comprehensive tests ([ad535b2](https://github.com/angelxmoreno/bun-sqlite-orm/commit/ad535b2facee0a960ee315612f5613e0b186f621)), closes [#43](https://github.com/angelxmoreno/bun-sqlite-orm/issues/43) [#44](https://github.com/angelxmoreno/bun-sqlite-orm/issues/44) [#10](https://github.com/angelxmoreno/bun-sqlite-orm/issues/10) [#43](https://github.com/angelxmoreno/bun-sqlite-orm/issues/43) [#44](https://github.com/angelxmoreno/bun-sqlite-orm/issues/44)
* implement complete composite primary key support ([8c6bd75](https://github.com/angelxmoreno/bun-sqlite-orm/commit/8c6bd75c784987061099884c998c88396842ec17)), closes [#22](https://github.com/angelxmoreno/bun-sqlite-orm/issues/22) [#22](https://github.com/angelxmoreno/bun-sqlite-orm/issues/22)
* implement custom JSON serialization for entities ([204b834](https://github.com/angelxmoreno/bun-sqlite-orm/commit/204b83478833e441a14d265ea61cf02f8431dac1)), closes [#10](https://github.com/angelxmoreno/bun-sqlite-orm/issues/10)
* implement prepared statement caching for 30-50% performance improvement ([7bea8b6](https://github.com/angelxmoreno/bun-sqlite-orm/commit/7bea8b6f081dd3a42df6dce0c58288c7e8fee2f9))

## [1.2.1](https://github.com/angelxmoreno/bun-sqlite-orm/compare/v1.2.0...v1.2.1) (2025-06-19)

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