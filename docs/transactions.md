# Transaction Support

bun-sqlite-orm provides comprehensive transaction support for atomic database operations with automatic rollback on errors. This ensures data consistency and integrity across complex operations.

## Quick Start

```typescript
import { DataSource } from 'bun-sqlite-orm';

const dataSource = new DataSource({
  database: './app.db',
  entities: [User, Post]
});

await dataSource.initialize();

// Basic transaction
const result = await dataSource.transaction(async (tx) => {
  const user = await User.create({ name: 'John' });
  const post = await Post.create({ title: 'Hello', userId: user.id });
  return { user, post };
});
```

## API Reference

### DataSource Transaction Methods

#### `transaction<T>(callback, options?): Promise<T>`

Execute a callback within a database transaction with automatic commit/rollback.

```typescript
const result = await dataSource.transaction(async (tx) => {
  // All operations here are atomic
  const user = await User.create({ name: 'John' });
  const post = await Post.create({ title: 'Hello', userId: user.id });
  
  // If any operation fails, entire transaction is rolled back
  if (someCondition) {
    throw new Error('Business logic error'); // Triggers rollback
  }
  
  return { user, post }; // Success - transaction commits
});
```

**Parameters:**
- `callback: (tx: Transaction) => Promise<T>` - Function to execute within transaction
- `options?: TransactionOptions` - Transaction configuration

**Returns:** Promise resolving to the callback result

#### `transactionParallel<T>(operations, options?): Promise<T>`

Execute multiple operations in parallel within a single transaction.

```typescript
const [users, posts] = await dataSource.transactionParallel([
  // Operation 1: Create multiple users
  async (tx) => Promise.all([
    User.create({ name: 'Alice' }),
    User.create({ name: 'Bob' }),
    User.create({ name: 'Charlie' })
  ]),
  
  // Operation 2: Create posts (runs in parallel)
  async (tx) => Promise.all([
    Post.create({ title: 'Post 1', content: '...' }),
    Post.create({ title: 'Post 2', content: '...' })
  ])
]);
```

**Parameters:**
- `operations: TransactionCallback<T[K]>[]` - Array of parallel operations
- `options?: TransactionOptions` - Transaction configuration

**Returns:** Promise resolving to array of results

#### `transactionSequential<T>(operations, options?): Promise<T>`

Execute operations in sequence within a transaction.

```typescript
const finalResult = await dataSource.transactionSequential([
  // Step 1: Create user
  async (tx) => User.create({ name: 'John' }),
  
  // Step 2: Create post using user from step 1
  async (tx, user) => Post.create({ 
    title: 'Hello', 
    userId: user.id 
  }),
  
  // Step 3: Create comment using post from step 2
  async (tx, post) => Comment.create({ 
    text: 'Great post!', 
    postId: post.id 
  })
]);
```

**Parameters:**
- `operations: TransactionCallback<unknown>[]` - Array of sequential operations
- `options?: TransactionOptions` - Transaction configuration

**Returns:** Promise resolving to the final operation result

#### `createTransaction(options?): Transaction`

Create a new transaction for manual control.

```typescript
const tx = dataSource.createTransaction({ isolation: 'IMMEDIATE' });

try {
  await tx.begin();
  
  const user = await User.create({ name: 'John' });
  const post = await Post.create({ title: 'Hello', userId: user.id });
  
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

**Parameters:**
- `options?: TransactionOptions` - Transaction configuration

**Returns:** New Transaction instance

### Transaction Class

#### Core Methods

##### `begin(): Promise<void>`
Start the transaction.

##### `commit(): Promise<void>`
Commit the transaction and make all changes permanent.

##### `rollback(): Promise<void>`
Rollback the transaction and undo all changes.

#### Savepoint Methods (Nested Transactions)

##### `savepoint(name?): Promise<string>`
Create a savepoint within the transaction.

```typescript
const tx = dataSource.createTransaction();
await tx.begin();

const user = await User.create({ name: 'John' });

// Create savepoint
const savepoint = await tx.savepoint('user_created');

try {
  // Risky operations
  await Post.create({ title: 'Test', userId: user.id });
  await tx.releaseSavepoint(savepoint); // Success - release savepoint
} catch (error) {
  await tx.rollbackToSavepoint(savepoint); // Error - rollback to savepoint
  // User still exists, but post creation was undone
}

await tx.commit();
```

##### `releaseSavepoint(name?): Promise<void>`
Release (commit) a savepoint.

##### `rollbackToSavepoint(name?): Promise<void>`
Rollback to a savepoint.

#### Utility Methods

##### `isTransactionActive(): boolean`
Check if transaction is currently active.

##### `isTransactionCommitted(): boolean`
Check if transaction has been committed.

##### `isTransactionRolledBack(): boolean`
Check if transaction has been rolled back.

##### `getDatabase(): Database`
Get the underlying database connection.

##### `exec(sql: string): void`
Execute raw SQL within the transaction.

##### `prepare(sql: string): Statement`
Prepare a statement within the transaction.

## Transaction Options

```typescript
interface TransactionOptions {
  /**
   * Transaction isolation level
   * @default 'DEFERRED'
   */
  isolation?: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE';
}
```

### Isolation Levels

- **DEFERRED** (default) - Transaction starts when first read/write occurs
- **IMMEDIATE** - Transaction starts immediately, blocks other writers
- **EXCLUSIVE** - Transaction starts immediately, blocks all other connections

```typescript
// Use IMMEDIATE isolation for critical operations
await dataSource.transaction(async (tx) => {
  // High-priority operations
}, { isolation: 'IMMEDIATE' });
```

## Advanced Usage Patterns

### Error Handling with Selective Rollback

```typescript
await dataSource.transaction(async (tx) => {
  const users = [];
  
  for (const userData of userDataList) {
    const savepoint = await tx.savepoint(`user_${userData.id}`);
    
    try {
      const user = await User.create(userData);
      await tx.releaseSavepoint(savepoint);
      users.push(user);
    } catch (error) {
      await tx.rollbackToSavepoint(savepoint);
      console.log(`Failed to create user ${userData.name}: ${error.message}`);
    }
  }
  
  return users; // Return successfully created users
});
```

### Complex Business Logic

```typescript
await dataSource.transaction(async (tx) => {
  // Create order
  const order = await Order.create({
    customerId: customer.id,
    total: 0
  });
  
  let total = 0;
  
  // Process order items
  for (const item of orderItems) {
    const product = await Product.get(item.productId);
    
    // Check inventory
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
    
    // Create order item
    await OrderItem.create({
      orderId: order.id,
      productId: product.id,
      quantity: item.quantity,
      price: product.price
    });
    
    // Update inventory
    product.stock -= item.quantity;
    await product.save();
    
    total += product.price * item.quantity;
  }
  
  // Update order total
  order.total = total;
  await order.save();
  
  // Process payment
  const payment = await processPayment(order.total, paymentMethod);
  
  if (!payment.success) {
    throw new Error('Payment processing failed');
  }
  
  // Record payment
  await Payment.create({
    orderId: order.id,
    amount: order.total,
    method: paymentMethod,
    transactionId: payment.transactionId
  });
  
  return order;
});
```

### Batch Operations with Error Recovery

```typescript
const results = await dataSource.transaction(async (tx) => {
  const successfulImports = [];
  const failedImports = [];
  
  for (const record of importData) {
    const savepoint = await tx.savepoint();
    
    try {
      // Validate record
      await validateRecord(record);
      
      // Create entities
      const user = await User.create(record.user);
      const profile = await Profile.create({
        ...record.profile,
        userId: user.id
      });
      
      await tx.releaseSavepoint(savepoint);
      successfulImports.push({ user, profile });
      
    } catch (error) {
      await tx.rollbackToSavepoint(savepoint);
      failedImports.push({
        record,
        error: error.message
      });
    }
  }
  
  // Log results
  await ImportLog.create({
    totalRecords: importData.length,
    successCount: successfulImports.length,
    failureCount: failedImports.length,
    failures: JSON.stringify(failedImports)
  });
  
  return {
    successful: successfulImports,
    failed: failedImports
  };
});
```

## Best Practices

### 1. Keep Transactions Short

```typescript
// ✅ Good - Short transaction
await dataSource.transaction(async (tx) => {
  const user = await User.create(userData);
  await Profile.create({ ...profileData, userId: user.id });
  return user;
});

// ❌ Avoid - Long-running transaction
await dataSource.transaction(async (tx) => {
  const user = await User.create(userData);
  await sendWelcomeEmail(user); // External API call - avoid!
  await generateReport(user); // Long computation - avoid!
  return user;
});
```

### 2. Handle Business Logic Errors

```typescript
await dataSource.transaction(async (tx) => {
  const account = await Account.get(accountId);
  
  if (account.balance < withdrawAmount) {
    throw new Error('Insufficient funds'); // Will trigger rollback
  }
  
  account.balance -= withdrawAmount;
  await account.save();
  
  await Transaction.create({
    accountId: account.id,
    type: 'withdrawal',
    amount: withdrawAmount
  });
});
```

### 3. Use Savepoints for Partial Recovery

```typescript
await dataSource.transaction(async (tx) => {
  const user = await User.create(userData);
  
  // Try to create optional profile
  const profileSavepoint = await tx.savepoint('profile');
  try {
    await Profile.create({ ...profileData, userId: user.id });
    await tx.releaseSavepoint(profileSavepoint);
  } catch (error) {
    await tx.rollbackToSavepoint(profileSavepoint);
    // Continue without profile
  }
  
  return user; // User created regardless of profile success
});
```

### 4. Leverage TypeScript Types

```typescript
interface CreateUserResult {
  user: User;
  profile?: Profile;
  notifications: Notification[];
}

const result: CreateUserResult = await dataSource.transaction(async (tx) => {
  const user = await User.create(userData);
  
  let profile: Profile | undefined;
  try {
    profile = await Profile.create({ ...profileData, userId: user.id });
  } catch (error) {
    // Profile creation optional
  }
  
  const notifications = await Promise.all([
    Notification.create({ userId: user.id, type: 'welcome' }),
    Notification.create({ userId: user.id, type: 'setup' })
  ]);
  
  return { user, profile, notifications };
});
```

## Integration with Testing

Transactions work seamlessly with the existing test infrastructure:

```typescript
import { resetGlobalMetadata } from 'bun-sqlite-orm/test-utils';

describe('Transaction Tests', () => {
  beforeEach(() => {
    resetGlobalMetadata();
  });

  test('should rollback on validation error', async () => {
    await expect(
      testDS.dataSource.transaction(async (tx) => {
        await User.create({ name: 'Valid User', email: 'valid@example.com' });
        await User.create({ name: '', email: 'invalid' }); // Validation error
      })
    ).rejects.toThrow();

    const users = await User.find({});
    expect(users).toHaveLength(0); // All rolled back
  });
});
```

## Performance Considerations

- **Statement Caching**: Transactions work with the existing statement cache for optimal performance
- **Connection Pooling**: Each transaction uses a single database connection
- **Isolation Overhead**: Higher isolation levels may impact concurrency
- **Savepoint Limits**: SQLite supports nested savepoints but monitor depth

## Error Handling

All transaction methods provide detailed error information:

```typescript
try {
  await dataSource.transaction(async (tx) => {
    // Operations that might fail
  });
} catch (error) {
  if (error.message.includes('UNIQUE constraint failed')) {
    // Handle duplicate key error
  } else if (error.message.includes('validation failed')) {
    // Handle validation error
  } else {
    // Handle other errors
  }
}
```

## Migration from Non-Transactional Code

Converting existing code to use transactions is straightforward:

```typescript
// Before (non-transactional)
const user = await User.create(userData);
const profile = await Profile.create({ ...profileData, userId: user.id });
const settings = await Settings.create({ userId: user.id, ...defaultSettings });

// After (transactional)
const result = await dataSource.transaction(async (tx) => {
  const user = await User.create(userData);
  const profile = await Profile.create({ ...profileData, userId: user.id });
  const settings = await Settings.create({ userId: user.id, ...defaultSettings });
  return { user, profile, settings };
});
```

Entity methods work exactly the same within transactions - no code changes required!