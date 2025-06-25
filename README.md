# BunSQLiteORM

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/bun-sqlite-orm?style=for-the-badge)](https://www.npmjs.com/package/bun-sqlite-orm)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white&logoSize=auto)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![NPM License](https://img.shields.io/npm/l/bun-sqlite-orm?style=for-the-badge&color=397acb)](https://opensource.org/licenses/MIT)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=angelxmoreno_bun-sqlite-orm&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=angelxmoreno_bun-sqlite-orm)
[![codecov](https://codecov.io/gh/angelxmoreno/bun-sqlite-orm/branch/main/graph/badge.svg?token=3QKV9IZTNA)](https://codecov.io/gh/angelxmoreno/bun-sqlite-orm)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=angelxmoreno_bun-sqlite-orm&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=angelxmoreno_bun-sqlite-orm)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=angelxmoreno_bun-sqlite-orm&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=angelxmoreno_bun-sqlite-orm)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=angelxmoreno_bun-sqlite-orm&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=angelxmoreno_bun-sqlite-orm)

[![CI](https://github.com/angelxmoreno/bun-sqlite-orm/actions/workflows/pr-check.yml/badge.svg)](https://github.com/angelxmoreno/bun-sqlite-orm/actions/workflows/pr-check.yml)
[![GitHub issues](https://img.shields.io/github/issues/angelxmoreno/bun-sqlite-orm)](https://github.com/angelxmoreno/bun-sqlite-orm/issues)
[![GitHub stars](https://img.shields.io/github/stars/angelxmoreno/bun-sqlite-orm)](https://github.com/angelxmoreno/bun-sqlite-orm/stargazers)

</div>

---

**A lightweight, type-safe TypeScript ORM designed specifically for Bun runtime with native SQLite integration. Features Active Record pattern, decorator-based entities, and comprehensive validation.**

## ✨ Key Features

- 🚀 **Built for Bun** - Leverages Bun's native SQLite performance and capabilities
- 🎯 **TypeScript First** - Complete type safety with decorator-based entity definitions  
- 🔄 **Active Record Pattern** - Intuitive entity lifecycle management with familiar Rails-like syntax
- ✅ **Built-in Validation** - Seamless integration with class-validator decorators
- 🛠️ **Auto Migrations** - Automatic table creation from entity metadata, zero-config setup
- 🔍 **Rich Querying** - Type-safe query methods with find, count, exists, and bulk operations
- ⚡ **Statement Caching** - Automatic prepared statement caching for 30-50% performance improvement
- 📈 **Database Indexing** - Comprehensive index support with simple, composite, and unique indexes
- 📝 **Flexible Primary Keys** - Support for auto-increment, UUID, custom, and composite primary key strategies
- 🔒 **Validation & Safety** - Automatic entity validation with detailed error reporting
- 📊 **Entity State Tracking** - Built-in change tracking and dirty state management
- 🎨 **Decorator Driven** - Clean, declarative entity definitions using TypeScript decorators

## 📦 Installation

```bash
bun add bun-sqlite-orm
```

### Prerequisites

- **Bun** >= 1.1.21
- **TypeScript** >= 5.0.0

## 🚀 Quick Start

### 1. Define Your Entities

Create type-safe entity classes with decorators:

```typescript
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Index } from 'bun-sqlite-orm';
import { IsNotEmpty, IsEmail, MinLength } from 'class-validator';

@Entity('users')
@Index('idx_name_age', ['name', 'age'])  // Composite index for common queries
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    @IsNotEmpty()
    @MinLength(2)
    name!: string;

    @Column({ type: 'text', unique: true, index: true })  // Indexed for fast lookups
    @IsEmail()
    email!: string;

    @Column({ type: 'integer', nullable: true })
    age?: number;

    @Column({ sqlDefault: 'CURRENT_TIMESTAMP' })
    createdAt!: Date;
}
```

### 2. Initialize DataSource

Set up your database connection and entities:

```typescript
import { DataSource } from 'bun-sqlite-orm';
import { User } from './entities/User';

const dataSource = new DataSource({
    database: './database.db', // File path or ':memory:' for in-memory
    entities: [User],
    // Optional: Add custom logger
    // logger: new ConsoleDbLogger()
});

// Initialize and create tables
await dataSource.initialize();
await dataSource.runMigrations(); // Creates tables automatically from entity metadata
```

### 3. Use Active Record Methods

Interact with your data using intuitive Active Record methods:

```typescript
// Create and save entities
const user = User.build({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
});
await user.save(); // Validates and inserts

// Create in one step with validation
const user2 = await User.create({
    name: 'Jane Smith',
    email: 'jane@example.com'
});

// Query methods
const users = await User.find({ age: 30 });           // Find all matching
const user = await User.get(1);                       // Find by primary key
const firstUser = await User.findFirst({ name: 'John' }); // Find first match

// Composite primary key queries
const userRole = await UserRole.get({ userId: 1, roleId: 2 }); // Find by composite key

// Aggregation methods
const totalUsers = await User.count();                // Count all
const adultCount = await User.count({ age: { gte: 18 } }); // Count with conditions
const userExists = await User.exists({ email: 'john@example.com' });

// Update operations
user.age = 31;
await user.save(); // Updates only changed fields

await user.update({ name: 'Johnny Doe', age: 32 }); // Update multiple fields

// Delete operations
await user.remove(); // Delete single entity

// Bulk operations
await User.updateAll({ status: 'active' }, { age: { gte: 18 } });
await User.deleteAll({ status: 'inactive' });
```

## 🎨 Decorators Reference

### Entity Decorators

| Decorator | Description | Example |
|-----------|-------------|---------|
| `@Entity(tableName?)` | Mark class as database entity | `@Entity('users')` |
| `@PrimaryColumn()` | Define primary key column (supports composite keys) | `@PrimaryColumn() id!: string;` |
| `@PrimaryGeneratedColumn(strategy)` | Auto-generated primary key | `@PrimaryGeneratedColumn('uuid')` |
| `@Column(options)` | Define regular column | `@Column({ type: 'text', nullable: true })` |
| `@Index()` | Create index on property | `@Index() @Column() email!: string;` |
| `@Index(name, columns, options)` | Create composite index on class | `@Index('idx_name', ['firstName', 'lastName'])` |

### Column Options

```typescript
@Column({
    type: 'text' | 'integer' | 'real' | 'blob',  // SQLite data types
    nullable?: boolean,        // Allow NULL values (default: false)
    unique?: boolean,          // Add unique constraint (default: false)
    default?: any | (() => any), // JavaScript default value or function
    sqlDefault?: string,       // SQL default expression (e.g., 'CURRENT_TIMESTAMP')
    index?: boolean | string   // Create index: true for auto-named, string for custom name
})
```

### Primary Key Strategies

```typescript
// Auto-incrementing integer
@PrimaryGeneratedColumn('int')
id!: number;

// UUID v4
@PrimaryGeneratedColumn('uuid')
id!: string;

// Manual primary key
@PrimaryColumn()
customId!: string;

// Composite primary keys
@Entity('user_roles')
export class UserRole extends BaseEntity {
    @PrimaryColumn()
    userId!: number;

    @PrimaryColumn()
    roleId!: number;

    @Column()
    assignedAt!: string;
}
```

### Database Indexing

BunSQLiteORM provides comprehensive indexing support to optimize query performance. Indexes are automatically created during table migrations.

#### Column-Level Indexing

Add indexes directly to column definitions:

```typescript
@Entity('users')
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    // Auto-named index: idx_users_email
    @Column({ type: 'text', index: true })
    email!: string;

    // Custom-named index
    @Column({ type: 'text', index: 'idx_custom_username' })
    username!: string;

    @Column({ type: 'text' })
    firstName!: string;

    @Column({ type: 'text' })
    lastName!: string;
}
```

#### Property-Level Indexing

Use the `@Index()` decorator on properties:

```typescript
@Entity('users')
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    // Auto-named index: idx_users_email
    @Index()
    @Column({ type: 'text' })
    email!: string;

    // Custom-named index
    @Index('idx_user_phone')
    @Column({ type: 'text' })
    phone!: string;
}
```

#### Composite Indexes

Create indexes spanning multiple columns using class-level decorators:

```typescript
@Entity('posts')
@Index('idx_author_date', ['authorId', 'createdAt'])              // Regular composite index
@Index('idx_unique_slug_status', ['slug', 'status'], { unique: true }) // Unique composite index
export class Post extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'integer' })
    authorId!: number;

    @Column({ type: 'text' })
    slug!: string;

    @Column({ type: 'text' })
    status!: string;

    @Column({ sqlDefault: 'CURRENT_TIMESTAMP' })
    createdAt!: Date;
}
```

#### Index Options

```typescript
// Index with options
@Index('idx_unique_email', ['email'], { unique: true })

// Available options:
interface IndexOptions {
    unique?: boolean;  // Create unique index (default: false)
}
```

#### Generated Index Names

When not providing custom names, indexes are auto-named using the pattern:
- **Column-level**: `idx_{tableName}_{columnName}`
- **Property-level**: `idx_{tableName}_{propertyName}`

```typescript
@Entity('user_profiles')
export class UserProfile extends BaseEntity {
    @Column({ index: true })        // Creates: idx_user_profiles_email
    email!: string;

    @Index()                        // Creates: idx_user_profiles_phone
    @Column()
    phone!: string;
}
```

## ✅ Validation Integration

BunSQLiteORM integrates seamlessly with [class-validator](https://github.com/typestack/class-validator):

```typescript
import { IsEmail, MinLength, IsOptional, IsInt, Min, Max } from 'class-validator';

@Entity('users')
export class User extends BaseEntity {
    @Column({ type: 'text' })
    @MinLength(2, { message: 'Name must be at least 2 characters' })
    name!: string;

    @Column({ type: 'text', unique: true })
    @IsEmail({}, { message: 'Must be a valid email address' })
    email!: string;

    @Column({ type: 'integer', nullable: true })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(150)
    age?: number;

    @Column({ type: 'text', nullable: true })
    @IsOptional()
    @MinLength(10)
    bio?: string;
}
```

**Validation behavior:**
- Automatically runs on `save()` and `create()` methods
- Throws detailed `ValidationError` on validation failure
- Preserves entity state on validation errors (won't save invalid data)

## 🔑 Composite Primary Keys

BunSQLiteORM provides complete support for composite primary keys, ideal for junction tables, many-to-many relationships, and multi-dimensional data models.

### Defining Composite Primary Keys

Use multiple `@PrimaryColumn()` decorators to create composite primary keys:

```typescript
@Entity('user_roles')
export class UserRole extends BaseEntity {
    @PrimaryColumn()
    userId!: number;

    @PrimaryColumn()
    roleId!: number;

    @Column()
    assignedBy!: string;

    @Column({ sqlDefault: 'CURRENT_TIMESTAMP' })
    assignedAt!: Date;
}

@Entity('order_items')
export class OrderItem extends BaseEntity {
    @PrimaryColumn()
    orderId!: string;

    @PrimaryColumn()
    productSku!: string;

    @Column()
    quantity!: number;

    @Column()
    unitPrice!: number;
}
```

### Working with Composite Keys

All standard Active Record methods work seamlessly with composite primary keys:

```typescript
// Create entities with composite keys
const userRole = UserRole.build({
    userId: 1,
    roleId: 2,
    assignedBy: 'admin',
    assignedAt: new Date()
});
await userRole.save();

// Find by composite primary key
const role = await UserRole.get({ userId: 1, roleId: 2 });

// Update and reload work automatically
role.assignedBy = 'manager';
await role.save();
await role.reload(); // Refreshes from database

// Remove by composite key
await role.remove();

// Query operations with composite key conditions
const userRoles = await UserRole.find({ userId: 1 });
const exists = await UserRole.exists({ userId: 1, roleId: 2 });
const count = await UserRole.count({ userId: 1 });

// Bulk operations
await UserRole.deleteAll({ userId: 1 });
await UserRole.updateAll({ assignedBy: 'system' }, { userId: 1 });
```

### Composite Key Features

- **Type Safety**: Full TypeScript support with compile-time validation
- **Automatic SQL Generation**: Generates proper `PRIMARY KEY (col1, col2)` constraints
- **Backward Compatibility**: Single primary key entities work exactly as before
- **Flexible Object Notation**: Single keys can use either `Entity.get(1)` or `Entity.get({ id: 1 })`
- **Validation**: Comprehensive error messages for missing or invalid key properties
- **Performance**: Optimized queries with proper primary key indexing

### SQL Output

BunSQLiteORM generates standards-compliant SQLite syntax for composite primary keys:

```sql
-- Generated table creation SQL
CREATE TABLE IF NOT EXISTS "user_roles" (
    "userId" INTEGER,
    "roleId" INTEGER,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("userId", "roleId")
);
```

### Error Handling

Composite primary keys include comprehensive validation and clear error messages:

```typescript
try {
    // Missing required key property
    await UserRole.get({ userId: 1 }); // Missing roleId
} catch (error) {
    console.log(error.message); 
    // "Missing primary key property 'roleId' for entity UserRole"
}

try {
    // Invalid key format for composite key entity
    await UserRole.get(123); // Should be an object
} catch (error) {
    console.log(error.message);
    // "Entity UserRole has 2 primary keys. Expected object with keys: userId, roleId"
}
```

## ⚡ Statement Caching

BunSQLiteORM includes automatic prepared statement caching that provides 30-50% performance improvement for repeated queries. Statement caching works transparently - there's no configuration required and no changes needed to your existing code.

### How It Works

The StatementCache automatically:
- **Caches prepared statements** by SQL string for fast reuse
- **Tracks performance metrics** including hit rates and cache statistics
- **Manages resource cleanup** to prevent memory leaks
- **Provides test mode support** for unit test compatibility

### Performance Benefits

```typescript
// These repeated queries will benefit from statement caching:
const users = await User.find({ age: 25 });        // Cache MISS - creates statement
const users2 = await User.find({ age: 25 });       // Cache HIT - reuses statement
const users3 = await User.find({ age: 25 });       // Cache HIT - reuses statement

const count = await User.count({ status: 'active' }); // Cache MISS - new pattern
const count2 = await User.count({ status: 'active' }); // Cache HIT - reuses statement

// Performance improvements of 30-50% for repeated query patterns
```

### Cache Statistics

Access cache performance metrics for monitoring:

```typescript
import { StatementCache } from 'bun-sqlite-orm';

// Get cache statistics
const stats = StatementCache.getStats();
console.log(stats);
// Output: {
//   size: 5,           // Number of cached statements
//   hitCount: 23,      // Number of cache hits
//   missCount: 5,      // Number of cache misses
//   hitRate: 0.82,     // Hit rate (82%)
//   enabled: true      // Cache enabled status
// }
```

### Cache Management

While caching is automatic, you can control it when needed:

```typescript
// Disable caching (for testing or debugging)
StatementCache.setEnabled(false);

// Re-enable caching
StatementCache.setEnabled(true);

// Invalidate cache entries by pattern (useful for schema changes)
StatementCache.invalidate(/user_table/); // Removes statements containing "user_table"

// Clear entire cache
StatementCache.cleanup();

// Reset statistics
StatementCache.resetStats();
```

### Test Mode

For unit testing with mocks, StatementCache provides a test mode that bypasses caching:

```typescript
// In your test setup
StatementCache.setTestMode(true);  // Enables mock compatibility
// ... run tests with mocked database
StatementCache.setTestMode(false); // Restore normal caching
```

### Features

- **Zero Configuration**: Works automatically with no setup required
- **Transparent Operation**: No changes needed to existing code
- **Memory Safe**: Automatic cleanup prevents resource leaks
- **Statistics Monitoring**: Built-in performance tracking
- **Test Friendly**: Special mode for unit test compatibility
- **Pattern-based Invalidation**: Targeted cache clearing for schema changes

## 📊 Entity State Tracking

Track entity changes and state with built-in methods:

```typescript
const user = User.build({ name: 'John', email: 'john@example.com' });

// Check entity state
console.log(user.isNew());     // true (not yet saved)
console.log(user.isChanged()); // false (no changes since creation)

// Make changes
user.name = 'Johnny';
user.age = 25;

// Track changes
console.log(user.isChanged()); // true (has unsaved changes)
console.log(user.getChanges()); 
// Output: { 
//   name: { from: 'John', to: 'Johnny' },
//   age: { from: undefined, to: 25 }
// }

// Save changes
await user.save();
console.log(user.isNew());     // false (now persisted)
console.log(user.isChanged()); // false (changes saved)

// Clean JSON serialization (excludes internal ORM properties)
console.log(user.toJSON());
// Output: { id: 1, name: 'Johnny', email: 'john@example.com', age: 25, createdAt: '...' }

// Works seamlessly with JSON.stringify() for API responses
const apiResponse = { user: user.toJSON(), timestamp: new Date() };
console.log(JSON.stringify(apiResponse)); // Clean output without _isNew, _originalValues
```

## 🔧 Advanced Usage

### Custom Data Types and Defaults

```typescript
@Entity('posts')
export class Post extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text' })
    title!: string;

    @Column({ type: 'text' })
    content!: string;

    @Column({ type: 'text', default: 'draft' })
    status!: string;

    @Column({ type: 'integer', default: 0 })
    viewCount!: number;

    // SQL default - handled by SQLite
    @Column({ sqlDefault: 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    // JavaScript default - handled by application
    @Column({ default: () => new Date() })
    updatedAt!: Date;

    @Column({ type: 'text', default: () => JSON.stringify([]) })
    tags!: string; // Store JSON as text
}
```

#### Default Value Options

**SQL Defaults** (`sqlDefault`): Handled by SQLite in the database
```typescript
@Column({ sqlDefault: 'CURRENT_TIMESTAMP' })
createdAt!: Date;

@Column({ sqlDefault: '0' })
score!: number;

@Column({ sqlDefault: "'active'" }) // Note the quotes for string literals
status!: string;
```

**JavaScript Defaults** (`default`): Handled by the application
```typescript
@Column({ default: () => new Date() })
updatedAt!: Date;

@Column({ default: 'pending' })
status!: string;

@Column({ default: () => Math.random() })
randomValue!: number;
```

### Error Handling

```typescript
import { ValidationError, DatabaseError, EntityNotFoundError } from 'bun-sqlite-orm';

try {
    const user = await User.create({
        name: '', // Invalid: too short
        email: 'invalid-email' // Invalid: not an email
    });
} catch (error) {
    if (error instanceof ValidationError) {
        console.log('Validation failed:', error.errors);
        // Access detailed validation errors
        error.errors.forEach(err => {
            console.log(`${err.property}: ${err.constraints}`);
        });
    }
}

try {
    const user = await User.get(999); // Non-existent ID
} catch (error) {
    if (error instanceof EntityNotFoundError) {
        console.log('User not found');
    }
}
```

## 🛠️ Development

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/angelxmoreno/bun-sqlite-orm.git
cd bun-sqlite-orm

# Install dependencies
bun install

# Run tests
bun test                    # All tests
bun run test:unit          # Unit tests only
bun run test:integration   # Integration tests only
bun run test:coverage      # With coverage report

# Code quality
bun run lint               # Check code style
bun run lint:fix          # Fix auto-fixable issues
bun run typecheck         # TypeScript type checking
```

### Testing

The project maintains high test coverage with comprehensive unit and integration tests:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test complete workflows with real database operations
- **Coverage**: 98%+ line coverage maintained

## 📚 Documentation

- [Architecture Overview](./docs/architecture.md)
- [Testing Strategy](./docs/testing-strategy.md)
- [Base Methods Reference](./docs/base-methods.md)
- [AI Assistant Guide](./llm.txt) - Comprehensive reference for AI assistants and code generation tools

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Links
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Issue Templates](https://github.com/angelxmoreno/bun-sqlite-orm/issues/new/choose)
- [Pull Request Template](./PULL_REQUEST_TEMPLATE.md)

## 📄 License

[MIT © Angel S. Moreno](https://github.com/angelxmoreno)

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh) - The fast all-in-one JavaScript runtime
- Validation powered by [class-validator](https://github.com/typestack/class-validator)
- Dependency injection via [tsyringe](https://github.com/microsoft/tsyringe)
- Inspired by [TypeORM](https://typeorm.io) and [ActiveRecord](https://guides.rubyonrails.org/active_record_basics.html)

---

<div align="center">

**[⭐ Star this repo](https://github.com/angelxmoreno/bun-sqlite-orm/stargazers) | [🐛 Report Bug](https://github.com/angelxmoreno/bun-sqlite-orm/issues) | [💡 Request Feature](https://github.com/angelxmoreno/bun-sqlite-orm/issues)**

</div>