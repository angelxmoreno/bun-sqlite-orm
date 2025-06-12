# Testing Strategy

## Overview

TypeBunOrm uses **file-based testing** with real SQLite database files to ensure full integration testing, including migration execution and database operations.

## Test Database Setup

### Database File Management
```typescript
// Test setup - unique database file per test run
const testDbPath = `./test-${Date.now()}-${Math.random().toString(36)}.db`;

const testDataSource = new DataSource({
  database: testDbPath,
  entities: [User, Post, Comment],
  migrations: ["./migrations/*.ts"]
});
```

### Test Lifecycle
```typescript
describe("User Entity Tests", () => {
  let testDataSource: DataSource;
  let testDbPath: string;

  beforeAll(async () => {
    // Create unique test database
    testDbPath = `./test-${Date.now()}-${Math.random().toString(36)}.db`;
    
    testDataSource = new DataSource({
      database: testDbPath,
      entities: [User, Post],
      migrations: ["./migrations/*.ts"]
    });
    
    // Initialize and run migrations
    await testDataSource.initialize();
    await testDataSource.runMigrations();
  });

  afterAll(async () => {
    // Clean up
    await testDataSource.destroy();
    
    // Delete test database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  beforeEach(async () => {
    // Clear data between tests (optional)
    await User.deleteAll({});
    await Post.deleteAll({});
  });
});
```

## Error Handling Tests

### Validation Error Testing
```typescript
it("should throw ValidationError with details on invalid data", async () => {
  const user = new User();
  user.email = "invalid-email"; // Invalid email format
  
  await expect(user.save()).rejects.toThrow(ValidationError);
  
  try {
    await user.save();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toContainEqual({
      property: "email",
      message: "email must be a valid email"
    });
  }
});
```

### Database Constraint Testing
```typescript
it("should throw DatabaseError on unique constraint violation", async () => {
  await User.create({ email: "test@example.com" });
  
  await expect(
    User.create({ email: "test@example.com" }) // Duplicate email
  ).rejects.toThrow(DatabaseError);
});
```

## Benefits of File-Based Testing

### Integration Testing
- **Real Database Operations** - Tests actual SQLite interactions, not mocks
- **Migration Validation** - Ensures migrations work correctly
- **Constraint Testing** - Validates database-level constraints
- **Performance Testing** - Real I/O operations reveal performance issues

### Realistic Test Environment
- **Same Database Engine** - Tests run against actual Bun:SQLite
- **File System Interactions** - Tests database file creation/deletion
- **Transaction Testing** - Real transaction behavior
- **Concurrency Testing** - Actual database locking behavior

## Test Organization

### Test Structure
```
tests/
├── unit/
│   ├── entities/
│   │   ├── user.test.ts
│   │   └── post.test.ts
│   ├── migrations/
│   │   └── migration-generator.test.ts
│   └── metadata/
│       └── metadata-container.test.ts
├── integration/
│   ├── active-record.test.ts
│   ├── relationships.test.ts
│   └── migrations.test.ts
└── helpers/
    ├── test-datasource.ts
    └── test-utils.ts
```

### Test Utilities
```typescript
// test/helpers/test-datasource.ts
export async function createTestDataSource(entities: Function[]) {
  const testDbPath = `./test-${Date.now()}-${Math.random().toString(36)}.db`;
  
  const dataSource = new DataSource({
    database: testDbPath,
    entities,
    migrations: ["./migrations/*.ts"]
  });
  
  await dataSource.initialize();
  await dataSource.runMigrations();
  
  return { dataSource, testDbPath };
}

export async function cleanupTestDatabase(dataSource: DataSource, testDbPath: string) {
  await dataSource.destroy();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}
```

## Testing Framework

Uses **Bun Testing Framework** for optimal performance and Bun ecosystem integration:

```typescript
import { test, expect, describe, beforeAll, afterAll, beforeEach } from "bun:test";

describe("User Active Record", () => {
  // Test implementation
});
```

### Unit Testing with Mocks

For isolated unit testing of internal components, use Bun's `mock()` function:

```typescript
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { typeBunContainer } from '../../../src/container';

describe('BaseEntity', () => {
    let originalResolve: typeof typeBunContainer.resolve;

    beforeEach(() => {
        // Store original resolve method
        originalResolve = typeBunContainer.resolve;
        
        // Override with mock
        typeBunContainer.resolve = mock((token: string) => {
            switch (token) {
                case 'DatabaseConnection':
                    return mockDb as unknown as Database;
                case 'MetadataContainer':
                    return mockMetadataContainer as unknown as MetadataContainer;
                default:
                    throw new Error(`Unknown token: ${token}`);
            }
        }) as typeof typeBunContainer.resolve;
    });

    afterEach(() => {
        // Restore original resolve method to prevent test interference
        typeBunContainer.resolve = originalResolve;
    });
});
```

#### Key Mocking Guidelines:

1. **Always Restore Mocks**: Use `afterEach` to restore original methods
2. **Type-Safe Mocking**: Use `as unknown as TargetType` for type assertions
3. **Container Isolation**: Mock container.resolve properly to prevent global state issues
4. **Private Access**: Use `as unknown as` for accessing private methods/properties in tests

```typescript
// Accessing private properties for testing
(entity as unknown as { _isNew: boolean })._isNew = false;
(entity as unknown as { _loadFromRow: (row: Record<string, unknown>) => void })._loadFromRow(row);
```

#### Mock Type Patterns:

```typescript
// Proper mock interfaces
let mockDatabase: {
    query: ReturnType<typeof mock>;
    exec: ReturnType<typeof mock>;
    close: ReturnType<typeof mock>;
};

// Typed mock functions
mockDatabase = {
    query: mock(() => ({
        get: mock(),
        all: mock(),
        run: mock(() => ({ changes: 1, lastInsertRowid: 1 })),
    })),
    exec: mock(),
    close: mock(),
};
```

#### Async Testing Best Practices:

```typescript
// Don't await expect().rejects.toThrow() - it's unnecessary
expect(TestEntity.get(999)).rejects.toThrow(EntityNotFoundError);

// Don't await expect().resolves.toBe() - it's unnecessary  
expect(dataSource.destroy()).resolves.toBeUndefined();

// Only await actual async operations
await entity.save();
const result = await TestEntity.find({ name: 'test' });
```

#### TypeScript Compatibility:

```typescript
// For mocking global objects like Reflect.getMetadata
const originalGetMetadata = Reflect.getMetadata;
Reflect.getMetadata = mock((key: unknown, target: object, property?: string | symbol) => {
    if (key === 'design:type' && property === 'createdAt') {
        return Date;
    }
    if (property !== undefined) {
        return originalGetMetadata?.(key, target, property);
    }
    return originalGetMetadata?.(key, target);
}) as typeof Reflect.getMetadata;
```

#### Code Quality Guidelines:

1. **No `any` Types**: Use proper typed interfaces and `ReturnType<typeof mock>`
2. **Import Organization**: Use `import type` for type-only imports
3. **Biome Linting**: All tests must pass `npx biome check` without errors
4. **Test Isolation**: Each test file should not affect global state for other tests

## Test Data Management

### Isolated Test Data
- Each test file gets its own database
- Tests don't interfere with each other
- Parallel test execution supported

### Test Data Cleanup
- Database files automatically deleted after tests
- Optional data clearing between tests within same file
- No persistent test data pollution