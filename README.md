# BunSQLiteORM

A lightweight TypeScript ORM for Bun runtime with Bun SQLite, featuring Active Record pattern and decorator-based entities.

## Features

- 🚀 **Built for Bun** - Optimized for Bun's SQLite integration and performance
- 🎯 **TypeScript First** - Full type safety with decorator-based entity definitions  
- 🔄 **Active Record Pattern** - Intuitive entity lifecycle management
- ✅ **Built-in Validation** - Seamless integration with class-validator
- 🛠️ **Auto Migrations** - Automatic table creation from entity metadata
- 🔍 **Rich Querying** - Type-safe queries with find, count, exists methods
- 📝 **Multiple PK Strategies** - Auto-increment, UUID, and manual primary keys

## Installation

```bash
bun add bun-sqlite-orm
```

## Quick Start

### 1. Define Your Entities

```typescript
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from 'bun-sqlite-orm';
import { IsNotEmpty, IsEmail } from 'class-validator';

@Entity('users')
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    @IsNotEmpty()
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

```typescript
import { DataSource } from 'bun-sqlite-orm';
import { User } from './entities/User';

const dataSource = new DataSource({
    database: './database.db', // or ':memory:' for in-memory
    entities: [User],
});

await dataSource.initialize();
await dataSource.runMigrations(); // Creates tables automatically
```

### 3. Use Active Record Methods

```typescript
// Create and save
const user = User.build({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
});
await user.save();

// Or create in one step
const user2 = await User.create({
    name: 'Jane Smith',
    email: 'jane@example.com'
});

// Find entities
const users = await User.find({ age: 30 });
const user = await User.get(1); // Find by ID
const firstUser = await User.findFirst({ name: 'John' });

// Count and existence
const count = await User.count();
const exists = await User.exists({ email: 'john@example.com' });

// Update and delete
user.age = 31;
await user.save();

await user.remove();

// Bulk operations
await User.updateAll({ age: 25 }, { age: 30 });
await User.deleteAll({ age: 25 });
```

## Decorators

### Entity Decorators

- `@Entity(tableName?)` - Mark a class as a database entity
- `@PrimaryColumn(type)` - Define a primary key column
- `@PrimaryGeneratedColumn('int' | 'uuid')` - Auto-generated primary key
- `@Column(options)` - Define a regular column

### Column Options

```typescript
@Column({
    type: 'text' | 'integer' | 'real' | 'blob',
    nullable?: boolean,
    unique?: boolean,
    default?: any | (() => any)
})
```

## Validation

BunSQLiteORM integrates seamlessly with class-validator:

```typescript
import { IsEmail, MinLength, IsOptional } from 'class-validator';

@Entity('users')
export class User extends BaseEntity {
    @Column({ type: 'text' })
    @MinLength(2)
    name!: string;

    @Column({ type: 'text', unique: true })
    @IsEmail()
    email!: string;

    @Column({ type: 'text', nullable: true })
    @IsOptional()
    bio?: string;
}
```

Validation runs automatically on `save()` and throws `ValidationError` on failure.

## Entity State Tracking

```typescript
const user = User.build({ name: 'John', email: 'john@example.com' });

console.log(user.isNew()); // true
console.log(user.isChanged()); // false

user.name = 'Johnny';
console.log(user.isChanged()); // true
console.log(user.getChanges()); // { name: { from: 'John', to: 'Johnny' } }

await user.save();
console.log(user.isNew()); // false
console.log(user.isChanged()); // false
```

## Requirements

- Bun >= 1.1.21
- TypeScript >= 5.0.0

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run specific test suites
bun run test:unit
bun run test:integration

# Lint code
bun run lint
bun run lint:fix

# Type check
bun run typecheck
```

## License

MIT © Angel S. Moreno