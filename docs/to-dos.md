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

## Current Tasks 🚧
1. [ ] finish the integration tests
2. [ ] move test db to test dir and update gitignore

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

**Bug Fixes:**
- [ ] **Statement finalization memory leaks** → [GitHub Issue #5](https://github.com/angelxmoreno/bun-sqlite-orm/issues/5)
- [ ] **Parameter type safety** → [GitHub Issue #6](https://github.com/angelxmoreno/bun-sqlite-orm/issues/6)
- [ ] **Connection validation** → [GitHub Issue #7](https://github.com/angelxmoreno/bun-sqlite-orm/issues/7)
- [ ] **Date conversion issues** → [GitHub Issue #11](https://github.com/angelxmoreno/bun-sqlite-orm/issues/11)
- [ ] **Boolean type conversion** → [GitHub Issue #12](https://github.com/angelxmoreno/bun-sqlite-orm/issues/12)

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
