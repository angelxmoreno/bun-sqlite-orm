# Pull Request

## Description

Implements complete composite primary key support for BunSQLiteORM, resolving issue #22. This enhancement enables entities to use multiple `@PrimaryColumn()` decorators to create composite primary keys, with full support across all Active Record methods.

## Type of Change

- [x] New feature (non-breaking change which adds functionality)
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [x] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [x] Test addition/improvement

## Changes Made

### Core Implementation
- **SQL Generator Enhancement**: Fixed table creation to generate proper `PRIMARY KEY (col1, col2)` constraints instead of invalid column-level syntax
- **BaseEntity.get() Extension**: Added support for composite key objects alongside existing single key functionality
- **BaseEntity.reload() Update**: Enhanced to automatically work with both single and composite primary keys
- **Type Safety**: Added `CompositeKeyValue` and `PrimaryKeyValue` types for compile-time validation

### Files Modified
- `src/sql/sql-generator.ts` - Fixed composite key SQL generation
- `src/entity/base-entity.ts` - Extended get() and reload() methods for composite keys
- `src/types/index.ts` - Added composite key TypeScript types
- `tests/integration/composite-primary-keys.test.ts` - New comprehensive integration tests (23 test cases)
- `tests/unit/sql/sql-generator-composite-keys.test.ts` - New SQL generation unit tests (8 test cases)
- `tests/unit/entity/base-entity.test.ts` - Updated existing tests for composite key compatibility

### Key Features Added
- **Flexible Primary Key Definition**: Support for multiple `@PrimaryColumn()` decorators
- **Backward Compatibility**: Single primary key entities work exactly as before
- **Dual Notation Support**: Single keys support both `Entity.get(1)` and `Entity.get({ id: 1 })` syntax
- **Comprehensive Validation**: Clear error messages for missing or invalid composite key properties
- **Standards Compliance**: Generated SQL follows SQLite best practices

## Testing

- [x] Tests pass locally (450+ tests including new composite key tests)
- [x] Added tests for new functionality (31 new test cases)
- [x] Updated existing tests if needed
- [x] Manual testing completed

### Test Coverage
- **Unit Tests**: 8 new tests for SQL generation validation
- **Integration Tests**: 23 new tests covering all composite key scenarios
- **Edge Cases**: Comprehensive error handling and validation testing
- **Backward Compatibility**: Verified single key entities remain unchanged

## Checklist

- [x] My code follows the project's style guidelines
- [x] I have performed a self-review of my code
- [x] I have commented my code, particularly in hard-to-understand areas
- [x] I have made corresponding changes to the documentation
- [x] My changes generate no new warnings
- [x] I have added tests that prove my fix is effective or that my feature works
- [x] New and existing unit tests pass locally with my changes

## Breaking Changes

None. This implementation maintains full backward compatibility with existing single primary key entities.

## Additional Notes

### Usage Example
```typescript
@Entity('user_roles')
export class UserRole extends BaseEntity {
    @PrimaryColumn()
    userId!: number;

    @PrimaryColumn()
    roleId!: number;

    @Column()
    assignedBy!: string;
}

// All standard Active Record methods work seamlessly
const userRole = await UserRole.get({ userId: 1, roleId: 2 });
await userRole.reload();
await userRole.save();
await userRole.remove();
```

### SQL Output
Generated SQL follows SQLite standards:
```sql
CREATE TABLE IF NOT EXISTS "user_roles" (
    "userId" INTEGER,
    "roleId" INTEGER,
    "assignedBy" TEXT NOT NULL,
    PRIMARY KEY ("userId", "roleId")
);
```

This feature enables proper many-to-many relationship tables, multi-dimensional data models, and junction tables with composite primary keys, significantly expanding the ORM's capabilities while maintaining simplicity and type safety.