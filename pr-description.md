# Pull Request

## Description

Fixed sqlDefault type restriction to support numeric, boolean, and null values in addition to strings. Previously, the `sqlDefault` property only accepted string values, forcing users to use workarounds like `sqlDefault: '0'` instead of the more natural `sqlDefault: 0`.

Closes #48

## Type of Change

- [x] Bug fix (non-breaking change which fixes an issue)
- [x] New feature (non-breaking change which adds functionality)
- [x] Documentation update
- [x] Test addition/improvement

## Changes Made

### Core Type System
- **Updated `ColumnOptions.sqlDefault`** in `src/types/index.ts` to accept `string | number | boolean | null` instead of just `string`
- **Updated `ColumnMetadata.sqlDefault`** in `src/types/index.ts` to match the new type signature

### SQL Generation
- **Added `formatSqlDefaultValue()` method** in `src/sql/sql-generator.ts` to properly format different value types:
  - Numbers: rendered without quotes (`0`, `3.14`, `-1.5`)
  - Booleans: converted to SQLite integers (`true` → `1`, `false` → `0`)
  - Null: rendered as `NULL`
  - Strings: smart handling - SQL expressions (like `CURRENT_TIMESTAMP`) used as-is, literals properly quoted and escaped
- **Modified `generateCreateTable()`** to use the new formatting method for SQL defaults

### Entity Data Loading
- **Enhanced `_loadFromRow()` method** in `src/entity/base-entity.ts` to properly handle explicit null values:
  - Fields with `sqlDefault: null` now correctly receive `null` instead of `undefined`
  - Preserves existing behavior for optional fields without explicit null defaults

### Documentation
- **Updated README.md** to show comprehensive examples of new sqlDefault capabilities
- **Updated llm.txt** to reflect the expanded type support
- **Added clear examples** for numeric, boolean, and null defaults

### Testing
- **Created comprehensive integration tests** in `tests/integration/sql-defaults.test.ts`:
  - Tests for numeric integer and real defaults
  - Tests for boolean defaults (true/false)
  - Tests for explicit null defaults
  - Tests for string literal defaults
  - Tests for manual override capabilities
- **Added unit tests** in `tests/unit/sql/sql-generator-sqldefault.test.ts`:
  - SQL generation verification for all supported types
  - Edge case handling and mixed type scenarios

## Testing

- [x] Tests pass locally (499 tests passing)
- [x] Added tests for new functionality
- [x] Updated existing tests if needed  
- [x] Manual testing completed

### Test Coverage
- **13 new integration tests** covering all sqlDefault value types
- **5 new unit tests** for SQL generation verification
- **All existing tests continue to pass** (499/499 passing)

## Usage Examples

### Before (Limited to strings)
```typescript
@Column({ type: 'integer', sqlDefault: '0' })    // Awkward string wrapper
publicRepos: number;

@Column({ type: 'integer', sqlDefault: '1' })    // Unnatural syntax
isActive: boolean;
```

### After (Natural type support)
```typescript
@Column({ type: 'integer', sqlDefault: 0 })      // Natural numeric syntax
publicRepos: number;

@Column({ type: 'integer', sqlDefault: true })   // Natural boolean syntax
isActive: boolean;

@Column({ type: 'real', sqlDefault: 3.14 })      // Floating point support
pi: number;

@Column({ nullable: true, sqlDefault: null })    // Explicit null defaults
optionalField?: string;

@Column({ sqlDefault: 'CURRENT_TIMESTAMP' })     // SQL expressions still work
createdAt: Date;
```

## Checklist

- [x] My code follows the project's style guidelines
- [x] I have performed a self-review of my code
- [x] I have commented my code, particularly in hard-to-understand areas
- [x] I have made corresponding changes to the documentation
- [x] My changes generate no new warnings
- [x] I have added tests that prove my fix is effective or that my feature works
- [x] New and existing unit tests pass locally with my changes

## Breaking Changes

This is a **non-breaking change**. All existing code using string sqlDefault values continues to work exactly as before. The change only expands the accepted types.

## Additional Notes

### Implementation Details
- The SQL generator intelligently detects SQL expressions vs. string literals
- Boolean values are automatically converted to SQLite's integer representation (0/1)
- Null handling preserves the distinction between explicit null defaults and missing optional fields
- All value formatting follows SQLite best practices for type safety

### Performance Impact
- No performance impact on existing functionality
- New formatting logic only executes during table creation (migrations)
- Statement caching and query performance remain unchanged