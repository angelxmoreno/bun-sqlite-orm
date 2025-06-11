# TypeOrmBuild Features

## MVP Features

### Entity System
- [ ] `@Entity` decorator for table mapping
- [ ] `@Column` decorator for field mapping
- [ ] `@PrimaryGeneratedColumn` for auto-increment IDs
- [ ] `@PrimaryColumn` for custom primary keys
- [ ] Column types (string, number, boolean, date, etc.)
- [ ] Column options (nullable, unique, default values)

### Active Record Pattern
- [ ] Static methods (create, get, find, findFirst, count, exists, deleteAll, updateAll)
- [ ] Instance methods (save, update, remove, reload, isNew, isChanged, getChanges)
- [ ] Entity lifecycle and state tracking

### Database Operations
- [ ] Bun:SQLite database file handling
- [ ] Transaction management with Bun:SQLite
- [ ] Database initialization and schema creation
- [ ] SQL query generation optimized for Bun:SQLite

### Migrations
- [ ] Migration file generation
- [ ] Schema versioning
- [ ] Up/down migration execution
- [ ] Migration status tracking

### Validation
- [ ] Integration with class-validator
- [ ] Validation during save operations
- [ ] Custom validation error handling

## Post MVP

### Relations
- [ ] `@OneToMany` relationships
- [ ] `@ManyToOne` relationships  
- [ ] `@OneToOne` relationships
- [ ] `@ManyToMany` relationships
- [ ] Eager loading
- [ ] Lazy loading for relations
- [ ] Cascade operations

### Query Builder
- [ ] Fluent query interface
- [ ] WHERE conditions
- [ ] JOIN operations
- [ ] ORDER BY, GROUP BY
- [ ] LIMIT/OFFSET pagination
- [ ] Raw SQL support

### Additional Features
- [ ] Hooks (beforeSave, afterSave, etc.)
- [ ] Custom column transformers
- [ ] Connection configuration
- [ ] Error handling and logging

## Nice to Have
- [ ] Repository pattern (optional alternative to Active Record)
- [ ] Query caching
- [ ] Bun:SQLite performance optimizations
- [ ] CLI tools for code generation