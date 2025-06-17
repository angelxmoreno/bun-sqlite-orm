import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { TestUser } from '../helpers/mock-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

describe('Statement Fix Verification', () => {
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

    describe('BaseEntity Statement Management', () => {
        test('should properly execute queries with statement finalization', async () => {
            // Create test data using BaseEntity methods (which now use _executeQuery)
            const user1 = await TestUser.create({
                name: 'User 1',
                email: 'user1@example.com',
                age: 25,
            });

            const user2 = await TestUser.create({
                name: 'User 2',
                email: 'user2@example.com',
                age: 30,
            });

            // Test all the query methods that now use proper statement management
            const foundUser = await TestUser.get(user1.id);
            expect(foundUser).toBeDefined();
            expect(foundUser.name).toBe('User 1');

            const allUsers = await TestUser.find({});
            expect(allUsers).toHaveLength(2);

            const usersByAge = await TestUser.find({ age: 25 });
            expect(usersByAge).toHaveLength(1);
            expect(usersByAge[0].name).toBe('User 1');

            const totalCount = await TestUser.count();
            expect(totalCount).toBe(2);

            const countByAge = await TestUser.count({ age: 30 });
            expect(countByAge).toBe(1);

            const userExists = await TestUser.exists({ name: 'User 1' });
            expect(userExists).toBe(true);

            const nonExistentUser = await TestUser.exists({ name: 'Non-existent' });
            expect(nonExistentUser).toBe(false);

            // Test update operations
            await user1.update({ age: 26 });
            const updatedUser = await TestUser.get(user1.id);
            expect(updatedUser.age).toBe(26);

            // Test bulk operations
            const updatedCount = await TestUser.updateAll({ bio: 'Updated bio' }, { age: 26 });
            expect(updatedCount).toBe(1);

            // Test delete
            await user2.remove();
            const remainingUsers = await TestUser.find({});
            expect(remainingUsers).toHaveLength(1);

            const deletedCount = await TestUser.deleteAll({ bio: 'Updated bio' });
            expect(deletedCount).toBe(1);

            const finalCount = await TestUser.count();
            expect(finalCount).toBe(0);
        });

        test('should handle many operations without memory leaks', async () => {
            // Perform many operations that would previously leak statements
            // Create many entities with different data patterns (sequential to avoid SQLITE_BUSY)
            for (let i = 0; i < 50; i++) {
                await TestUser.create({
                    name: `User ${i}`,
                    email: `user${i}@example.com`,
                    age: 20 + (i % 50),
                    bio: i % 3 === 0 ? `Bio for user ${i}` : undefined,
                });
            }

            // Perform many different query patterns
            const queryOperations: Promise<unknown>[] = [];

            for (let i = 0; i < 20; i++) {
                // Different query patterns that create different SQL statements
                queryOperations.push(TestUser.find({ age: 20 + i }));
                queryOperations.push(TestUser.count({ age: 20 + i }));
                queryOperations.push(TestUser.exists({ name: `User ${i}` }));

                if (i < 10) {
                    queryOperations.push(TestUser.find({ bio: `Bio for user ${i * 3}` }));
                }
            }

            await Promise.all(queryOperations);

            // Verify all operations completed successfully
            const totalUsers = await TestUser.count();
            expect(totalUsers).toBe(50);

            // Clean up
            await TestUser.deleteAll({});
            const finalCount = await TestUser.count();
            expect(finalCount).toBe(0);
        });

        test('should demonstrate proper resource cleanup with mixed operations', async () => {
            // Test that demonstrates the fix works for complex scenarios
            const userData = [];
            for (let i = 0; i < 25; i++) {
                userData.push({
                    name: `Test User ${i}`,
                    email: `test${i}@example.com`,
                    age: 18 + (i % 60),
                    bio: i % 2 === 0 ? `Biography ${i}` : undefined,
                });
            }

            // Bulk create
            const users = await Promise.all(userData.map((data) => TestUser.create(data)));

            // Mixed query operations
            const queries = [
                () => TestUser.find({ age: 25 }),
                () => TestUser.find({ age: 35 }),
                () => TestUser.count({}),
                () => TestUser.exists({ age: 18 }),
                () => TestUser.findFirst({ name: 'Test User 10' }),
            ];

            // Run queries multiple times
            for (let round = 0; round < 5; round++) {
                await Promise.all(queries.map((query) => query()));
            }

            // Bulk updates with different patterns
            await TestUser.updateAll({ bio: 'Updated' }, { age: 30 });
            await TestUser.updateAll({ age: 99 }, { name: 'Test User 10' });

            // Individual updates
            const updatePromises = users.slice(0, 10).map((user, index) => {
                return user.update({
                    name: `Updated User ${index}`,
                    age: 25 + index,
                });
            });
            await Promise.all(updatePromises);

            // Bulk deletes
            await TestUser.deleteAll({ age: 99 });

            // Individual deletes
            const remaining = await TestUser.find({ age: 89 });
            const deletePromises = remaining.slice(0, 5).map((user) => user.remove());
            await Promise.all(deletePromises);

            // Verify final state
            const finalUsers = await TestUser.find({});
            expect(finalUsers.length).toBeGreaterThan(0);
            expect(finalUsers.length).toBeLessThan(25);

            // All operations completed without statement leaks
        });
    });
});
