# Pull Request

## Description

This PR implements comprehensive database indexing support for TypeBunOrm, adding the ability to create simple, composite, and unique indexes on entities to optimize query performance. The implementation includes column-level indexing via `@Column({ index: true })`, property-level indexing via `@Index()` decorator, and class-level composite indexing via `@Index('name', ['col1', 'col2'])`.

## Type of Change

- [x] New feature (non-breaking change which adds functionality)
- [x] Documentation update
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test addition/improvement

## Changes Made

### Core Implementation
- **Added `IndexOptions` and `IndexMetadata` interfaces** - Type definitions for index configuration and metadata storage
- **Extended `ColumnOptions` with `index?: boolean | string`** - Allows column-level index creation with auto-generated or custom names
- **Created `@Index()` decorator** - Supports both property-level and class-level usage for composite indexes
- **Enhanced `MetadataContainer`** - Added index storage, validation, and smart table name handling for auto-generated index names
- **Extended `SqlGenerator`** - Added `generateIndexes()` method to create SQL CREATE INDEX statements
- **Updated `DataSource`** - Modified to create indexes automatically after table creation during migrations
- **Added `getSqlGenerator()` method** - Public accessor for testing purposes

### Index Types Supported
- **Column-level indexes**: `@Column({ index: true })` and `@Column({ index: 'custom_name' })`
- **Property-level indexes**: `@Index()` and `@Index('custom_name')`
- **Composite indexes**: `@Index('idx_name', ['column1', 'column2'])`
- **Unique indexes**: `@Index('idx_name', ['column'], { unique: true })`

### Smart Features
- **Auto-generated index names** following pattern `idx_{tableName}_{columnName}`
- **Duplicate index name validation** within entities
- **Table name synchronization** - Index names update automatically when `@Entity` decorator overrides table names
- **Comprehensive error handling** with descriptive error messages

### Testing
- **Integration tests** with real SQLite database operations verifying index creation and performance
- **Unit tests** for decorator functionality, error cases, and edge conditions
- **SQL generation tests** ensuring correct CREATE INDEX statement generation

### Documentation
- **Comprehensive README updates** with examples for all index types
- **Updated decorators reference** including `@Index` decorator and column index option
- **Added indexing section** with column-level, property-level, and composite index examples
- **Updated features.md** marking indexing as completed
- **Enhanced quick start example** demonstrating indexing usage

## Testing

- [x] Tests pass locally (314/314 tests passing)
- [x] Added tests for new functionality (14 new tests specifically for indexing)
- [x] Updated existing tests if needed (added `indexes: []` to EntityMetadata mocks)
- [x] Manual testing completed (verified index creation in SQLite)

### Test Coverage
- **Integration tests**: 6 comprehensive tests covering real database operations
- **Unit tests**: 8 focused tests for decorator behavior and error handling
- **Existing tests**: All 314 tests continue to pass with zero regressions

## Checklist

- [x] My code follows the project's style guidelines (Biome formatting and linting passes)
- [x] I have performed a self-review of my code
- [x] I have commented my code, particularly in hard-to-understand areas
- [x] I have made corresponding changes to the documentation (README.md and docs/features.md)
- [x] My changes generate no new warnings (TypeScript compilation clean)
- [x] I have added tests that prove my fix is effective or that my feature works
- [x] New and existing unit tests pass locally with my changes

## Breaking Changes

This is a **non-breaking change**. All existing functionality remains unchanged:
- Existing entities continue to work without modification
- No changes to existing decorator APIs
- Backward compatible with all current usage patterns
- Index creation is opt-in via new decorators and options

## Additional Notes

### Performance Impact
- Indexes are created during table migration phase, not affecting runtime performance
- Query performance improvements expected for indexed columns
- No overhead for entities not using indexes

### Implementation Highlights

**Decorator Design**: The `@Index` decorator uses TypeScript function overloads to support multiple usage patterns:
```typescript
@Index()                                    // Property-level with auto name
@Index('custom_name')                       // Property-level with custom name  
@Index('name', ['col1', 'col2'])           // Class-level composite
@Index('name', ['col1'], { unique: true }) // Class-level with options
```

**Smart Index Naming**: Auto-generated names handle table name changes gracefully:
```typescript
@Entity('users')           // Table name override
class UserEntity {
  @Column({ index: true }) // Creates: idx_users_email (not idx_userentity_email)
  email!: string;
}
```

**SQL Generation**: Generates clean, standards-compliant SQLite INDEX statements:
```sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_slug ON posts (slug);
CREATE INDEX IF NOT EXISTS idx_author_date ON posts (authorId, createdAt);
```

### Files Changed Summary
- **12 files changed**: 750 insertions, 7 deletions
- **New files**: 3 (index decorator, integration tests, unit tests)
- **Documentation**: Comprehensive updates to README and features documentation
- **Zero breaking changes**: All existing functionality preserved

This implementation establishes a solid foundation for database performance optimization while maintaining TypeBunOrm's commitment to type safety and developer experience.