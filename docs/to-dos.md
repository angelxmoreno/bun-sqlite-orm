# BunSQLiteORM - Enhancement Tracker

## Completed Tasks ✅
1. [x] bun run typecheck shows several errors
2. [X] create COC docs
3. [X] add badges
   1. [X] codecov
   2. [X] sonar cloud
4. [X] add release-it
5. [X] add workflow checks
6. [X] link to license file
7. [X] tests are failing
8. [X] finish the integration tests
9. [X] move test db to test dir and update gitignore

## v1.2.0 Completed Features ✅
1. [X] **Column Indexing Support** → [GitHub Issue #24](https://github.com/angelxmoreno/bun-sqlite-orm/issues/24)
   - Simple column indexes with `@Column({ index: true })`
   - Named indexes with `@Index('name')` decorator
   - Composite indexes with `@Index('name', ['col1', 'col2'])`
   - Unique indexes and auto-generated index names
2. [X] **Boolean Type Conversion** → [GitHub Issue #12](https://github.com/angelxmoreno/bun-sqlite-orm/issues/12)
   - Proper conversion between JavaScript boolean and SQLite INTEGER (1/0)
   - Type-safe boolean handling in `_loadFromRow` method
3. [X] **Date/Timezone Issues** → [GitHub Issue #11](https://github.com/angelxmoreno/bun-sqlite-orm/issues/11)
   - Comprehensive date utility system with timezone awareness
   - Configurable date storage formats (ISO string, unix timestamps)
   - Timezone warning system for ambiguous date strings
4. [X] **Database Initialization Validation** → [GitHub Issue #7](https://github.com/angelxmoreno/bun-sqlite-orm/issues/7)
   - Prevents database operations before DataSource.initialize()
   - Clear error messages with actionable guidance
   - Comprehensive validation across all BaseEntity methods
5. [X] **Parameter Type Safety** → [GitHub Issue #6](https://github.com/angelxmoreno/bun-sqlite-orm/issues/6)
   - Enforced SQLQueryBindings type throughout codebase
   - Type-safe parameter binding with proper validation
6. [X] **Statement Memory Leaks** → [GitHub Issue #5](https://github.com/angelxmoreno/bun-sqlite-orm/issues/5)
   - Proper statement finalization in BaseEntity._executeQuery
   - Memory leak prevention for dynamic queries

## Current Tasks 🚧
1. [ ] Complete PinoDbLogger implementation (moved to v2.0.0)

## Documentation Enhancement Plan 📚

### TypeDoc Integration
- [ ] Add TypeDoc script to package.json: `"docs:generate": "typedoc --out docs-api src/index.ts"`
- [ ] Configure TypeDoc with proper options (theme, includes, excludes)
- [ ] Set up automated API doc generation in CI/CD
- [ ] Export TypeDoc output as markdown for GitBook import

### GitBook Setup
- [ ] Create GitBook account and connect to GitHub repository
- [ ] Set up GitBook project structure:
  - Getting Started guide
  - API Reference (imported from TypeDoc)
  - Tutorial examples
  - Migration guides
  - Best practices
- [ ] Configure GitBook auto-sync with repository
- [ ] Set up custom domain (if desired)

### Documentation Content Strategy
- [ ] Write comprehensive Getting Started guide
- [ ] Create tutorial examples:
  - Basic entity setup
  - Advanced querying
  - Validation patterns
  - Migration strategies
- [ ] Document decorator usage patterns
- [ ] Add troubleshooting guide
- [ ] Create contribution guide for documentation

## GitHub Issues Created 📋
> These items now have dedicated GitHub issues for tracking and implementation

**High Priority Issues:**
- [ ] **Transaction support** → [GitHub Issue #9](https://github.com/angelxmoreno/bun-sqlite-orm/issues/9)
- [ ] **Prepared statement caching** → [GitHub Issue #8](https://github.com/angelxmoreno/bun-sqlite-orm/issues/8)
- [ ] **Custom JSON serialization** → [GitHub Issue #10](https://github.com/angelxmoreno/bun-sqlite-orm/issues/10)

**Medium Priority Issues:**
- [ ] **WAL mode and performance optimization** → [GitHub Issue #13](https://github.com/angelxmoreno/bun-sqlite-orm/issues/13)
- [ ] **Safe integers support** → [GitHub Issue #14](https://github.com/angelxmoreno/bun-sqlite-orm/issues/14)

**Bug Fixes (✅ Completed in v1.2.0):**
- [X] **Statement finalization memory leaks** → [GitHub Issue #5](https://github.com/angelxmoreno/bun-sqlite-orm/issues/5)
- [X] **Parameter type safety** → [GitHub Issue #6](https://github.com/angelxmoreno/bun-sqlite-orm/issues/6)
- [X] **Connection validation** → [GitHub Issue #7](https://github.com/angelxmoreno/bun-sqlite-orm/issues/7)
- [X] **Date conversion issues** → [GitHub Issue #11](https://github.com/angelxmoreno/bun-sqlite-orm/issues/11)
- [X] **Boolean type conversion** → [GitHub Issue #12](https://github.com/angelxmoreno/bun-sqlite-orm/issues/12)
- [X] **Column indexing support** → [GitHub Issue #24](https://github.com/angelxmoreno/bun-sqlite-orm/issues/24)

**Low Priority Features:**
- [ ] **Database serialization/backup** → [GitHub Issue #15](https://github.com/angelxmoreno/bun-sqlite-orm/issues/15)
- [ ] **SQLite extension loading** → [GitHub Issue #16](https://github.com/angelxmoreno/bun-sqlite-orm/issues/16)
- [ ] **BLOB data support** → [GitHub Issue #17](https://github.com/angelxmoreno/bun-sqlite-orm/issues/17)

## Future Enhancement Ideas 🔮
> Items that may warrant GitHub issues in the future

- [ ] Add llm.txt file for AI-friendly project description
- [ ] Performance benchmarking suite
- [ ] Query builder improvements
- [ ] Relationship support (foreign keys, joins)
- [ ] Schema migration tools
- [ ] CLI tooling for common operations
