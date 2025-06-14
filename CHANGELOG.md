# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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