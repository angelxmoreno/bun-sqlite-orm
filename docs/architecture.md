# bun-sqlite-orm Architecture

## Overview

bun-sqlite-orm uses a clean, dependency injection-based architecture that keeps the user-facing API simple while maintaining flexibility and testability internally.

## Core Components

### DataSource
The main entry point that users interact with. Handles all internal setup and configuration.

```typescript
const dataSource = new DataSource({
  database: "./app.db",
  entities: [User, Post, Comment]
});

await dataSource.initialize();

// Entities are now ready to use
const user = await User.create({ email: "test@example.com" });
```

**Responsibilities:**
- Create and configure child DI container
- Register database connection
- Initialize MetadataContainer
- Process entity decorators and populate metadata
- Set up BaseEntity with container reference
- Auto-create tables from entity metadata

### Dependency Injection Container

Uses **tsyringe** with a **child container** to isolate bun-sqlite-orm services from user's container.

```typescript
// DataSource creates child container internally
const typeBunContainer = container.createChildContainer();

// Registers services transparently
typeBunContainer.register("DatabaseConnection", { 
  useFactory: () => new Database(options.database) 
});

typeBunContainer.register("MetadataContainer", { 
  useClass: MetadataContainer 
});
```

**Benefits:**
- **Isolation** - No conflicts with user's DI setup
- **Testability** - Easy to mock services for testing
- **Clean separation** - Library internals stay internal

### MetadataContainer

Single source of truth for all entity metadata. Registered in the DI container.

```typescript
class MetadataContainer {
  private entities = new Map<Function, EntityMetadata>();
  
  addEntity(entityClass: Function) {
    // Process decorators and store metadata
  }
  
  getEntityMetadata(entityClass: Function): EntityMetadata {
    return this.entities.get(entityClass);
  }
  
  getAllEntities(): EntityMetadata[] {
    return Array.from(this.entities.values());
  }
}
```

**Responsibilities:**
- Store entity table names, column definitions, relationships
- Provide metadata for SQL generation
- Source data for migration generation
- Validate entity configurations

### BaseEntity

Active Record base class that uses DI container for database operations with statement caching.

```typescript
class BaseEntity {
  private static container: DependencyContainer = bunContainer; // Default to main container
  
  static setContainer(container: DependencyContainer) {
    this.container = container;
  }
  
  // Private helper for executing queries with cached prepared statements
  private static _executeQuery<T>(sql: string, params: SQLQueryBindings[], method: 'get' | 'all' | 'run'): T {
    const db = this.container.resolve<Database>("DatabaseConnection");
    // Use StatementCache for optimized prepared statement reuse
    return StatementCache.executeQuery<T>(db, sql, params, method);
  }
  
  static async create(data: any) {
    const db = this.container.resolve<Database>("DatabaseConnection");
    const metadata = this.container.resolve<MetadataContainer>("MetadataContainer");
    // Perform database operations using cached statements...
  }
  
  async save() {
    const db = BaseEntity.container.resolve<Database>("DatabaseConnection");
    const metadata = BaseEntity.container.resolve<MetadataContainer>("MetadataContainer");
    // Perform database operations using cached statements...
  }
}
```

### StatementCache

The StatementCache provides automatic prepared statement caching for significant performance improvements.

```typescript
class StatementCache {
  private static cache = new Map<string, Statement>();
  private static hitCount = 0;
  private static missCount = 0;
  private static enabled = true;
  private static testMode = false;

  static executeQuery<T>(db: Database, sql: string, params: SQLQueryBindings[], method: 'get' | 'all' | 'run'): T {
    // In test mode, use the database directly to support mocks
    if (StatementCache.testMode) {
      const statement = db.prepare(sql);
      try {
        return statement[method](...params) as T;
      } finally {
        statement.finalize();
      }
    }
    
    const statement = StatementCache.getStatement(db, sql);
    return statement[method](...params) as T;
  }

  static getStatement(db: Database, sql: string): Statement {
    if (StatementCache.cache.has(sql)) {
      StatementCache.hitCount++;
      return StatementCache.cache.get(sql)!;
    }

    // Cache miss - create new statement
    StatementCache.missCount++;
    const statement = db.prepare(sql);
    StatementCache.cache.set(sql, statement);
    return statement;
  }
}
```

**Benefits:**
- **30-50% performance improvement** for repeated queries
- **Automatic resource management** with proper cleanup
- **Test mode support** for unit test compatibility with mocks
- **Statistics tracking** for monitoring cache performance
- **Pattern-based invalidation** for schema changes

## Data Flow

1. **Initialization:**
   - User creates DataSource with configuration
   - DataSource.initialize() creates child container
   - Database connection and MetadataContainer registered
   - Entity decorators processed, metadata stored
   - Tables automatically created from entity metadata
   - BaseEntity configured with container
   - StatementCache initialized and ready

2. **Runtime Operations:**
   - User calls static/instance methods on entities
   - BaseEntity resolves services from container
   - MetadataContainer provides schema information
   - **StatementCache caches prepared statements** for reuse
   - Database operations executed via Bun:SQLite with cached statements

3. **Auto-Migration:**
   - Tables are automatically created during DataSource.initialize()
   - Schema is synchronized with entity metadata
   - No manual migration files needed

4. **Statement Caching Flow:**
   - SQL query generated from entity operations
   - StatementCache checks for existing prepared statement
   - **Cache HIT**: Reuse existing statement (performance boost)
   - **Cache MISS**: Create new statement and cache it
   - Statement executed with parameters
   - Statistics updated for monitoring

## Auto-Migration System

bun-sqlite-orm uses **automatic schema synchronization** where entity decorators define the database schema, and tables are created automatically during initialization.

### How Auto-Migration Works

1. **Entity Processing**
   - During `DataSource.initialize()`, all entity classes are processed
   - Decorators (`@Entity`, `@Column`, `@Index`, etc.) are read to build metadata
   - Table schemas are generated from entity metadata

2. **Table Creation**
   ```typescript
   // Tables are created automatically based on entity definitions
   @Entity('users')
   class User extends BaseEntity {
     @PrimaryGeneratedColumn()
     id!: number;
     
     @Column({ type: 'text', unique: true })
     @Index('idx_users_email')
     email!: string;
     
     @Column({ type: 'text' })
     name!: string;
   }
   
   // After dataSource.initialize(), 'users' table exists with:
   // - id INTEGER PRIMARY KEY AUTOINCREMENT
   // - email TEXT UNIQUE
   // - name TEXT
   // - INDEX idx_users_email ON users(email)
   ```

3. **Schema Synchronization**
   - Tables are created if they don't exist
   - Indexes are created based on `@Index` decorators and column `index: true` options
   - No manual migration files needed

### Benefits
- **Zero configuration** - Just define entities and run
- **Entity files are source of truth** - Database schema follows entity definitions  
- **No migration files** - Schema is automatically synchronized
- **Fast development** - No need to write or manage migrations
- **Type safety** - Schema is always in sync with TypeScript definitions

## Architecture Benefits

- **Clean API** - Users only see DataSource and entities
- **Transparent DI** - All dependency injection happens internally
- **High Performance** - Automatic statement caching provides 30-50% speed improvements
- **ACID Transactions** - Full transaction support with automatic rollback and nested savepoints
- **Enhanced Error System** - Comprehensive error handling with base class and entity context
- **Testable** - Easy to mock database and metadata for tests
- **Isolated** - No pollution of user's DI container
- **Single Source of Truth** - Entity files drive everything
- **TypeORM-like** - Familiar patterns for existing TypeORM users
- **Memory Safe** - Automatic resource cleanup prevents statement leaks

## Logging System

bun-sqlite-orm uses a flexible logging system with a **DbLogger interface** for extensibility.

### Logger Configuration
```typescript
interface DbLogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

const dataSource = new DataSource({
  database: "./app.db",
  entities: [User],
  logger: new PinoDbLogger({ writeToFile: true }) // Optional
});
```

### Built-in Loggers
- **NullLogger** - Silent (default when no logger provided)
- **ConsoleDbLogger** - Basic console.log implementation
- **PinoDbLogger** - Production-ready with file output support

### Log Levels
- **DEBUG** - All SQL queries + execution times
- **INFO** - Entity saves, creates, major operations  
- **WARN** - Validation errors, performance warnings, deprecation notices
- **ERROR** - Database errors, connection failures, migration failures

## Transaction System

bun-sqlite-orm provides comprehensive transaction support for atomic database operations with automatic rollback on errors.

### Transaction API

The DataSource provides multiple transaction methods for different use cases:

```typescript
// Basic transaction with automatic commit/rollback
const result = await dataSource.transaction(async (tx) => {
  const user = await User.create({ name: 'John' });
  const post = await Post.create({ title: 'Hello', userId: user.id });
  return { user, post };
});

// Parallel operations within a transaction
const [users, posts] = await dataSource.transactionParallel([
  (tx) => Promise.all([
    User.create({ name: 'Alice' }),
    User.create({ name: 'Bob' })
  ]),
  (tx) => Post.create({ title: 'Shared Post' })
]);

// Sequential operations
const result = await dataSource.transactionSequential([
  (tx) => User.create({ name: 'John' }),
  (tx, user) => Post.create({ title: 'Hello', userId: user.id })
]);
```

### Transaction Features

#### **Isolation Levels**
Support for SQLite transaction isolation levels:
```typescript
await dataSource.transaction(async (tx) => {
  // Transaction operations
}, { isolation: 'IMMEDIATE' }); // DEFERRED, IMMEDIATE, or EXCLUSIVE
```

#### **Automatic Error Handling**
- Automatic rollback on any error
- Proper cleanup of transaction state
- Error propagation with context

#### **Nested Transactions (Savepoints)**
```typescript
const tx = dataSource.createTransaction();
await tx.begin();

try {
  await User.create({ name: 'John' });
  
  const savepoint = await tx.savepoint('user_created');
  
  try {
    await Post.create({ title: 'Test', userId: 1 });
    await tx.releaseSavepoint(savepoint);
  } catch (error) {
    await tx.rollbackToSavepoint(savepoint);
    // Handle nested error
  }
  
  await tx.commit();
} catch (error) {
  await tx.rollback();
}
```

### Transaction Manager Architecture

The transaction system uses a **TransactionManager** that handles:

- **Transaction Lifecycle** - Begin, commit, rollback operations
- **Error Recovery** - Automatic rollback on failures  
- **Savepoint Management** - Nested transaction support
- **Resource Cleanup** - Proper statement and connection cleanup
- **Logging Integration** - Detailed transaction logging

### Integration with Existing Systems

#### **BaseEntity Integration**
Entities work seamlessly within transactions without code changes:
```typescript
await dataSource.transaction(async (tx) => {
  const user = new User();
  user.name = 'John';
  await user.save(); // Uses transaction context
  
  const posts = await Post.find({ userId: user.id }); // Uses transaction context
});
```

#### **Statement Cache Compatibility**
Transactions work with the existing statement cache system for optimal performance.

#### **Validation Integration**
Entity validation errors automatically trigger transaction rollback.

## Column System

### Type Inference and Mapping
```typescript
@Entity()
class User {
  @Column() // Infers "TEXT" from string
  name: string;
  
  @Column({ type: "integer" }) // Explicit override
  age: string; // TypeScript string but SQLite integer
  
  @Column() // Date -> TEXT as ISO string
  createdAt: Date;
  
  @Column({ nullable: true }) // Can override auto-detection
  bio: string | null; // Auto-detects nullable from TypeScript union
}
```

### Default Values
**Database Defaults** (static values):
```typescript
@Column({ default: "active" })
status: string; // CREATE TABLE ... status TEXT DEFAULT 'active'
```

**Application Defaults** (dynamic values):
```typescript
@Column({ default: () => new Date().toISOString() })
createdAt: Date; // Set by application code before save
```

### Primary Key Strategies
```typescript
@PrimaryColumn() // Manual primary key
id: string;

@PrimaryGeneratedColumn() // Auto-increment INTEGER (default)
id: number;

@PrimaryGeneratedColumn("uuid") // Application-generated UUID
id: string;

@PrimaryGeneratedColumn("int") // Explicit auto-increment
id: number;
```

## Enhanced Error System

bun-sqlite-orm features a comprehensive error handling system with a common base class and rich context information for improved developer experience and debugging.

### Error Architecture

**Base Class** - `BunSqliteOrmError`:
```typescript
export abstract class BunSqliteOrmError extends Error {
    public readonly entityName?: string;
    public readonly timestamp: Date;
    
    constructor(message: string, entityName?: string) {
        super(message);
        this.name = this.constructor.name;
        this.entityName = entityName;
        this.timestamp = new Date();
    }
}
```

### Error Class Hierarchy

**Core Entity Errors:**
- `EntityNotFoundError` - Entity lookup failures with criteria context
- `ValidationError` - Entity validation failures with detailed field errors  
- `DatabaseError` - Database operation failures with operation context

**Advanced Error Types:**
- `TransactionError` - Transaction operation failures (begin, commit, rollback, savepoint)
- `ConnectionError` - Database connection issues with path and connection type
- `ConstraintViolationError` - Database constraint violations with constraint details
- `ConfigurationError` - Configuration and setup issues
- `QueryError` - SQL query execution failures with SQL and parameters
- `TypeConversionError` - Type conversion failures with property context
- `MigrationError` - Migration operation failures with direction and migration name

### Error Context Enhancement

All errors provide structured context:
```typescript
try {
    await User.get(invalidId);
} catch (error) {
    if (error instanceof BunSqliteOrmError) {
        console.log(`Entity: ${error.entityName}`);
        console.log(`Error Type: ${error.constructor.name}`);
        console.log(`Timestamp: ${error.timestamp}`);
        
        // Error-specific properties
        if (error instanceof EntityNotFoundError) {
            console.log(`Criteria: ${JSON.stringify(error.criteria)}`);
        } else if (error instanceof DatabaseError) {
            console.log(`Operation: ${error.operation}`);
            console.log(`Original Error: ${error.originalError.message}`);
        }
    }
}
```

### Benefits

- **Unified Error Handling** - Catch all ORM errors with single base class
- **Rich Context** - Entity names, timestamps, and operation-specific details
- **Type Safety** - Full TypeScript support for error properties
- **Developer Experience** - Meaningful error messages and structured data
- **User-Friendly** - Easy conversion to user-facing error messages