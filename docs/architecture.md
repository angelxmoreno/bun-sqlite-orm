# TypeBunOrm Architecture

## Overview

TypeBunOrm uses a clean, dependency injection-based architecture that keeps the user-facing API simple while maintaining flexibility and testability internally.

## Core Components

### DataSource
The main entry point that users interact with. Handles all internal setup and configuration.

```typescript
const dataSource = new DataSource({
  database: "./app.db",
  entities: [User, Post, Comment],
  migrations: ["./migrations/*.ts"]
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

### Dependency Injection Container

Uses **tsyringe** with a **child container** to isolate TypeBunOrm services from user's container.

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

Active Record base class that uses DI container for database operations.

```typescript
class BaseEntity {
  private static container: DependencyContainer = bunContainer; // Default to main container
  
  static setContainer(container: DependencyContainer) {
    this.container = container;
  }
  
  static async create(data: any) {
    const db = this.container.resolve<Database>("DatabaseConnection");
    const metadata = this.container.resolve<MetadataContainer>("MetadataContainer");
    // Perform database operations...
  }
  
  async save() {
    const db = BaseEntity.container.resolve<Database>("DatabaseConnection");
    const metadata = BaseEntity.container.resolve<MetadataContainer>("MetadataContainer");
    // Perform database operations...
  }
}
```

## Data Flow

1. **Initialization:**
   - User creates DataSource with configuration
   - DataSource.initialize() creates child container
   - Database connection and MetadataContainer registered
   - Entity decorators processed, metadata stored
   - BaseEntity configured with container

2. **Runtime Operations:**
   - User calls static/instance methods on entities
   - BaseEntity resolves services from container
   - MetadataContainer provides schema information
   - Database operations executed via Bun:SQLite

3. **Migrations:**
   - Migration generator resolves MetadataContainer
   - Compares current entity metadata vs last snapshot
   - Generates diff-based migration files
   - Executes migrations via database connection
   - Saves new metadata snapshot after successful migration

## Migration System

TypeBunOrm uses **entity-driven migrations** where entity files are the source of truth, not the database.

### Auto-generation Process

1. **Entity Metadata Snapshots**
   - After each migration, save current entity metadata to `migrations/.metadata/last-snapshot.json`
   - Snapshot includes table names, columns, types, constraints

2. **Diff Generation**
   ```typescript
   const currentMetadata = MetadataContainer.getAllEntities();
   const lastSnapshot = readLastSnapshot();
   const diff = generateDiff(lastSnapshot, currentMetadata);
   
   // Generates migration with:
   // - ADD COLUMN for new properties
   // - DROP COLUMN for removed properties  
   // - ALTER COLUMN for type changes
   // - CREATE TABLE for new entities
   // - DROP TABLE for removed entities
   ```

3. **Migration Workflow**
   ```bash
   bun migration:generate  # Compares entities vs snapshot, creates migration file
   bun migration:run       # Executes pending migrations, updates snapshot
   ```

### Benefits
- **Entity files are source of truth** - Database schema follows code changes
- **No manual SQL** - Developers work only with TypeScript decorators
- **Reversible migrations** - Down migrations generated from diffs
- **Safe schema changes** - Migration system validates and generates proper SQL

## Architecture Benefits

- **Clean API** - Users only see DataSource and entities
- **Transparent DI** - All dependency injection happens internally
- **Testable** - Easy to mock database and metadata for tests
- **Isolated** - No pollution of user's DI container
- **Single Source of Truth** - Entity files drive everything
- **TypeORM-like** - Familiar patterns for existing TypeORM users

## Logging System

TypeBunOrm uses a flexible logging system with a **DbLogger interface** for extensibility.

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