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
- 📝 **Flexible Primary Keys** - Support for auto-increment, UUID, and custom primary key strategies
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
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from 'bun-sqlite-orm';
import { IsNotEmpty, IsEmail, MinLength } from 'class-validator';

@Entity('users')
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    @IsNotEmpty()
    @MinLength(2)
    name!: string;

    @Column({ type: 'text', unique: true })
    @IsEmail()
    email!: string;

    @Column({ type: 'integer', nullable: true })
    age?: number;

    @Column({ type: 'text', default: () => new Date().toISOString() })
    createdAt!: string;
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
| `@PrimaryColumn()` | Define primary key column | `@PrimaryColumn() id!: string;` |
| `@PrimaryGeneratedColumn(strategy)` | Auto-generated primary key | `@PrimaryGeneratedColumn('uuid')` |
| `@Column(options)` | Define regular column | `@Column({ type: 'text', nullable: true })` |

### Column Options

```typescript
@Column({
    type: 'text' | 'integer' | 'real' | 'blob',  // SQLite data types
    nullable?: boolean,        // Allow NULL values (default: false)
    unique?: boolean,          // Add unique constraint (default: false)
    default?: any | (() => any) // Default value or function
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

    @Column({ type: 'text', default: () => new Date().toISOString() })
    publishedAt!: string;

    @Column({ type: 'text', default: () => JSON.stringify([]) })
    tags!: string; // Store JSON as text
}
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
- [Quality Tools Setup](./docs/quality-tools-setup.md)
- [Base Methods Reference](./docs/base-methods.md)

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