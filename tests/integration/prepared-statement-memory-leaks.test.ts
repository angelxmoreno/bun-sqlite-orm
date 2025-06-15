import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { TestUser } from '../helpers/mock-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

describe('Prepared Statement Memory Leaks', () => {
    let testDS: TestDataSourceResult;

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [TestUser],
        });
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        await clearTestData([TestUser]);
    });

    describe('Statement Finalization', () => {
        test('should not leak memory with many dynamic queries', async () => {
            // Get initial memory usage - this is a crude test but demonstrates the issue
            const initialHeapUsed = process.memoryUsage().heapUsed;

            // Create many users with dynamic queries (each creates a new prepared statement)
            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(
                    TestUser.create({
                        name: `User ${i}`,
                        email: `user${i}@example.com`,
                        age: 20 + (i % 50),
                    })
                );
            }
            await Promise.all(promises);

            // Perform many different queries that would create different prepared statements
            const queryPromises = [];
            for (let i = 0; i < 100; i++) {
                // Different WHERE conditions create different prepared statements
                queryPromises.push(TestUser.find({ age: 20 + (i % 50) }));
                queryPromises.push(TestUser.count({ age: { gte: 20 + (i % 25) } }));
                queryPromises.push(TestUser.exists({ name: `User ${i % 20}` }));
            }
            await Promise.all(queryPromises);

            // Force garbage collection if available
            if (typeof global.gc === 'function') {
                global.gc();
            }

            const finalHeapUsed = process.memoryUsage().heapUsed;
            const memoryIncrease = finalHeapUsed - initialHeapUsed;

            // This test demonstrates the issue - memory usage grows significantly
            // Without statement finalization, each unique query creates a new prepared statement
            // that never gets cleaned up, leading to memory growth
            console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

            // This assertion will likely fail due to memory leaks
            // We expect reasonable memory usage (< 10MB for this test)
            // but without statement finalization, it will be much higher
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB threshold
        });

        test('should demonstrate statement accumulation with varying SQL patterns', async () => {
            // Create test data
            await TestUser.create({
                name: 'Test User 1',
                email: 'test1@example.com',
                age: 25,
            });

            await TestUser.create({
                name: 'Test User 2',
                email: 'test2@example.com',
                age: 30,
            });

            // Different query patterns that create different prepared statements
            const queries = [
                // Different field combinations
                () => TestUser.find({ name: 'Test User 1' }),
                () => TestUser.find({ email: 'test1@example.com' }),
                () => TestUser.find({ age: 25 }),
                () => TestUser.find({ name: 'Test User 1', age: 25 }),
                () => TestUser.find({ email: 'test1@example.com', age: 25 }),

                // Different operators create different SQL
                () => TestUser.count({ age: { gte: 20 } }),
                () => TestUser.count({ age: { lte: 35 } }),
                () => TestUser.count({ age: { gt: 20 } }),
                () => TestUser.count({ age: { lt: 35 } }),

                // Different combinations
                () => TestUser.exists({ name: 'Test User 1' }),
                () => TestUser.exists({ email: 'test2@example.com' }),
            ];

            // Run each query multiple times
            // Each unique SQL pattern creates a new prepared statement that isn't finalized
            for (let iteration = 0; iteration < 10; iteration++) {
                for (const queryFn of queries) {
                    await queryFn();
                }
            }

            // Without proper statement management, we now have accumulated:
            // - 11 different prepared statements (one for each unique SQL pattern)
            // - Each statement stays in memory indefinitely
            // - In a real application, this leads to memory leaks

            // This test passes but demonstrates the underlying issue
            expect(true).toBe(true);
        });

        test('should show resource consumption with bulk operations', async () => {
            // Bulk insert operations - each with slightly different data patterns
            const bulkData = [];
            for (let i = 0; i < 50; i++) {
                bulkData.push({
                    name: `Bulk User ${i}`,
                    email: `bulk${i}@example.com`,
                    age: i % 2 === 0 ? 25 : undefined, // Mix of with/without age
                    bio: i % 3 === 0 ? `Bio for user ${i}` : undefined, // Mix of with/without bio
                });
            }

            // Each create() call potentially creates different prepared statements
            // based on which fields are present (due to nullable fields)
            const promises = bulkData.map((data) => TestUser.create(data));
            await Promise.all(promises);

            // Update operations with different field combinations
            const users = await TestUser.find({});
            const updatePromises = users.map((user, index) => {
                if (index % 3 === 0) {
                    return user.update({ age: 30 }); // Update age only
                }
                if (index % 3 === 1) {
                    return user.update({ bio: 'Updated bio' }); // Update bio only
                }
                return user.update({ age: 35, bio: 'Updated with both' }); // Update both
            });
            await Promise.all(updatePromises);

            // Delete operations with different conditions
            await TestUser.deleteAll({ age: 30 });
            await TestUser.deleteAll({ bio: 'Updated bio' });

            // Without statement finalization, all these operations create
            // prepared statements that remain in memory
            expect(users.length).toBe(50);
        });
    });

    describe('Statement Lifecycle Issues', () => {
        test('should demonstrate the need for statement cleanup', async () => {
            // This test shows how different SQL patterns accumulate statements:
            // - SELECT * FROM test_users WHERE name = ?
            // - SELECT * FROM test_users WHERE email = ?
            // - SELECT * FROM test_users WHERE age = ?
            // - SELECT * FROM test_users WHERE name = ? AND age = ?
            // - SELECT COUNT(*) as count FROM test_users WHERE age >= ?
            // - SELECT COUNT(*) as count FROM test_users WHERE age <= ?
            // - INSERT INTO test_users (name, email, age, bio, createdAt) VALUES (?, ?, ?, ?, ?)
            // - UPDATE test_users SET age = ? WHERE id = ?
            // - DELETE FROM test_users WHERE id = ?

            // In the current implementation, each of these SQL patterns
            // would create a separate prepared statement via db.query()
            // None of these statements are finalized, leading to memory leaks

            // Simulate the operations that would create these statements
            await TestUser.create({ name: 'Test', email: 'test@example.com', age: 25 });
            const user = await TestUser.findFirst({ name: 'Test' });
            await TestUser.find({ email: 'test@example.com' });
            await TestUser.find({ age: 25 });
            await TestUser.find({ name: 'Test', age: 25 });
            await TestUser.count({ age: { gte: 20 } });
            await TestUser.count({ age: { lte: 30 } });

            if (user) {
                await user.update({ age: 30 });
                await user.remove();
            }

            // Each operation above creates prepared statements that don't get cleaned up
            // This is the core issue that needs to be fixed
            expect(true).toBe(true);
        });
    });
});
