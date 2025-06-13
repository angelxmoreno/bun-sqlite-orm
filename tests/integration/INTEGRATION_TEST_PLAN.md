# Integration Test Plan

## Overview
Integration tests validate the full TypeBunOrm stack with real SQLite databases, ensuring all components work together correctly.

## Test Categories

### 1. Active Record Pattern Tests (`active-record.test.ts`)
**Priority: HIGH** - Core functionality testing

#### Entity Lifecycle Tests
- [x] Build entity without saving
- [ ] Save new entity (INSERT)
- [ ] Save existing entity (UPDATE) 
- [ ] Reload entity from database
- [ ] Remove entity from database
- [ ] Entity state tracking (isNew, isChanged, getChanges)

#### Static Query Methods
- [ ] `Entity.get(id)` - Find by primary key
- [ ] `Entity.find(conditions)` - Find multiple entities
- [ ] `Entity.findFirst(conditions)` - Find first match
- [ ] `Entity.count(conditions)` - Count entities
- [ ] `Entity.exists(conditions)` - Check existence

#### Bulk Operations
- [ ] `Entity.deleteAll(conditions)` - Bulk delete
- [ ] `Entity.updateAll(updates, conditions)` - Bulk update

#### Primary Key Strategies
- [ ] Auto-increment primary keys
- [ ] UUID primary keys  
- [ ] Manual primary keys

#### Error Scenarios
- [ ] Entity not found errors
- [ ] Database constraint violations
- [ ] Validation failures
- [ ] No primary key defined

### 2. DataSource Lifecycle Tests (`data-source-lifecycle.test.ts`)
**Priority: HIGH** - Core infrastructure testing

#### Initialization & Setup
- [ ] DataSource initialization with entities
- [ ] Metadata container population
- [ ] Dependency injection container setup
- [ ] Entity registration and validation

#### Migration & Schema
- [ ] Automatic table creation from entity metadata
- [ ] Column constraints (NOT NULL, UNIQUE)
- [ ] Primary key constraints
- [ ] Default value handling

#### Lifecycle Management
- [ ] Graceful DataSource shutdown
- [ ] Database connection cleanup
- [ ] File cleanup after tests

### 3. Decorator Integration Tests (`decorators.test.ts`)
**Priority: MEDIUM** - Metadata → Schema validation

#### Entity Registration
- [ ] `@Entity` decorator registers table name
- [ ] Entity auto-registration when using column decorators
- [ ] Custom vs inferred table names

#### Column Definition
- [ ] `@Column` decorator creates database columns
- [ ] Column type mapping (text, integer, real, blob)
- [ ] Nullable vs NOT NULL constraints
- [ ] UNIQUE constraints
- [ ] Default values (static and function)

#### Primary Key Handling
- [ ] `@PrimaryColumn` creates primary key
- [ ] `@PrimaryGeneratedColumn` with auto-increment
- [ ] `@PrimaryGeneratedColumn` with UUID
- [ ] Multiple primary keys (composite keys)

### 4. Validation Integration Tests (`validation.test.ts`)
**Priority: MEDIUM** - class-validator integration

#### Validation Success
- [ ] Valid entities save successfully
- [ ] Validation passes on update operations
- [ ] Optional fields handle undefined/null properly

#### Validation Failures
- [ ] Invalid data prevents database save
- [ ] Validation errors include property names
- [ ] Validation errors include error messages
- [ ] Custom validation decorators work

#### Validation Scenarios
- [ ] Email validation
- [ ] MinLength validation
- [ ] IsNotEmpty validation
- [ ] IsOptional validation
- [ ] Complex nested validation

### 5. Error Handling Integration Tests (`error-handling.test.ts`)
**Priority: MEDIUM** - Real error scenarios

#### Database Constraint Errors
- [ ] UNIQUE constraint violations
- [ ] NOT NULL constraint violations
- [ ] Foreign key constraint violations (if implemented)
- [ ] Check constraint violations

#### Application Errors
- [ ] EntityNotFoundError scenarios
- [ ] ValidationError scenarios
- [ ] DatabaseError wrapping
- [ ] Error message clarity

#### Edge Cases
- [ ] Empty database operations
- [ ] Invalid SQL generation
- [ ] Database connection failures
- [ ] File permission errors

### 6. Performance & Concurrency Tests (`performance.test.ts`)
**Priority: LOW** - Performance validation

#### Batch Operations
- [ ] Bulk insert performance
- [ ] Bulk update performance
- [ ] Bulk delete performance
- [ ] Large dataset queries

#### Concurrency
- [ ] Concurrent entity saves
- [ ] Concurrent reads and writes
- [ ] Database locking behavior
- [ ] Transaction isolation

#### Memory & Resources
- [ ] Memory usage with large datasets
- [ ] Database file size management
- [ ] Connection pooling (if implemented)

## Test Infrastructure

### Test Entities Available
- `TestUser` - Full entity with validation
- `TestPost` - UUID primary key entity
- `TestComment` - Simple relationships
- `SimpleTestEntity` - Manual primary key
- `NoPrimaryKeyEntity` - Error testing
- `InvalidTestEntity` - Validation testing

### Test Utilities Available
- `createTestDataSource()` - Isolated test database
- `clearTestData()` - Clean data between tests
- `createTestDatabase()` - Raw SQLite access
- Automatic cleanup and file deletion

## Test Execution Strategy

1. **Start with Active Record** - Core functionality foundation
2. **DataSource Lifecycle** - Infrastructure validation  
3. **Decorators** - Metadata → Schema validation
4. **Validation** - Business logic validation
5. **Error Handling** - Edge case coverage
6. **Performance** - Optimization validation

## Success Criteria

- All tests pass with real SQLite database
- Zero test interference (proper isolation)
- All error scenarios properly handled
- Performance meets baseline expectations
- 100% integration test coverage of public APIs