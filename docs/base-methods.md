# Base Methods

## Static Methods (Class-level)

### Creation
- `User.create(data)` - Create and save a new entity
- `User.build(data)` - Create entity without saving (equivalent to `new User()`)

### Finding
- `User.get(id)` - Find by primary key
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
- `user.update(data)` - Update entity with new data and save
- `user.remove()` - Delete entity
- `user.reload()` - Refresh entity from database

### State
- `user.isNew()` - Check if entity is unsaved
- `user.isChanged()` - Check if entity has unsaved changes
- `user.getChanges()` - Get changed attributes