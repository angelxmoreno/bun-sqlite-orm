# Base Methods

## Static Methods (Class-level)

### Creation
- `User.create(data)` - Create and save a new entity
- `User.build(data)` - Create entity without saving (equivalent to `new User()`)

### Finding
- `User.get(id)` - Find by primary key (single: `get(1)` or composite: `get({ userId: 1, roleId: 2 })`)
- `User.findFirst(conditions)` - Find first matching record
- `User.find(conditions)` - Find all matching records

### Querying
- `User.count(conditions)` - Count records matching conditions
- `User.exists(conditions)` - Check if record exists

### Bulk Operations
- `User.deleteAll(conditions)` - Delete records matching conditions
- `User.updateAll(data, conditions)` - Update multiple records

## Instance Methods (Object-level)

### Persistence
- `user.save()` - Save entity (insert or update)
- `user.update(data)` - Type-safe update with Partial<T> and save
- `user.remove()` - Delete entity
- `user.reload()` - Refresh entity from database (works with single and composite keys)

### State
- `user.isNew()` - Check if entity is unsaved
- `user.isChanged()` - Check if entity has unsaved changes
- `user.getChanges()` - Get changed attributes
- `user.toJSON()` - Get clean JSON representation (excludes internal ORM properties)

## Composite Primary Key Support

All methods work seamlessly with composite primary keys:

### Examples with Composite Keys

```typescript
@Entity('user_roles')
class UserRole extends BaseEntity {
    @PrimaryColumn() userId!: number;
    @PrimaryColumn() roleId!: number;
    @Column() assignedBy!: string;
}

// Finding by composite key
const userRole = await UserRole.get({ userId: 1, roleId: 2 });

// All operations work automatically
await userRole.reload();
await userRole.save();
await userRole.remove();

// Query operations
const userRoles = await UserRole.find({ userId: 1 });
const exists = await UserRole.exists({ userId: 1, roleId: 2 });
const count = await UserRole.count({ userId: 1 });

// Bulk operations
await UserRole.deleteAll({ userId: 1 });
await UserRole.updateAll({ assignedBy: 'system' }, { userId: 1 });
```

### Key Features

- **Type Safety**: Full TypeScript support with compile-time validation
- **Automatic Detection**: Methods automatically detect single vs composite keys
- **Backward Compatibility**: Single key entities work exactly as before
- **Flexible Notation**: Single keys support both `get(1)` and `get({ id: 1 })` syntax
- **Clear Error Messages**: Comprehensive validation with helpful error messages

## JSON Serialization

The `toJSON()` method provides clean entity serialization by excluding internal ORM properties:

```typescript
const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
});

// Before toJSON() - includes internal ORM state
console.log(user);
// Output includes: _isNew: false, _originalValues: {...}

// With toJSON() - clean output
console.log(user.toJSON());
// Output: { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, createdAt: '...' }

// Automatic integration with JSON.stringify()
const apiResponse = { users: [user] };
JSON.stringify(apiResponse); // Uses toJSON() automatically

// Works with all entity types including composite keys
const userRole = await UserRole.get({ userId: 1, roleId: 2 });
console.log(userRole.toJSON());
// Output: { userId: 1, roleId: 2, assignedBy: 'admin' }
```

### Benefits

- **Clean API Responses**: No internal ORM properties in JSON output
- **Better Debugging**: Cleaner console.log output for development
- **Automatic Integration**: Works seamlessly with JSON.stringify()
- **Consistent Behavior**: Works with single and composite primary key entities
- **Performance**: Optimized for both individual entities and large datasets