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