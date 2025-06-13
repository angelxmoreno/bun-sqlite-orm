import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { EntityNotFoundError, ValidationError } from '../../src/errors';
import { SimpleTestEntity, TestComment, TestPost, TestUser } from '../helpers/mock-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

describe('Active Record Integration Tests', () => {
    let testDS: TestDataSourceResult;

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [TestUser, TestPost, TestComment, SimpleTestEntity],
        });

        // Run migrations to create tables
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        // Clear all test data between tests
        await clearTestData([TestUser, TestPost, TestComment, SimpleTestEntity]);
    });

    describe('Entity Lifecycle', () => {
        test('should build entity without saving to database', () => {
            const user = TestUser.build({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
            });

            expect(user).toBeInstanceOf(TestUser);
            expect(user.name).toBe('John Doe');
            expect(user.email).toBe('john@example.com');
            expect(user.age).toBe(30);
            expect(user.isNew()).toBe(true);
            expect(user.id).toBeUndefined();
        });

        test('should save new entity to database (INSERT)', async () => {
            const user = TestUser.build({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
            });

            expect(user.isNew()).toBe(true);

            await user.save();

            expect(user.isNew()).toBe(false);
            expect(user.id).toBeDefined();
            expect(typeof user.id).toBe('number');
            expect(user.createdAt).toBeDefined();
        });

        test('should save existing entity to database (UPDATE)', async () => {
            // Create and save user
            const user = TestUser.build({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
            });
            await user.save();

            const originalId = user.id;
            const originalCreatedAt = user.createdAt;

            // Update user
            user.name = 'Jane Doe';
            user.age = 25;

            expect(user.isChanged()).toBe(true);
            const changes = user.getChanges();
            expect(changes).toEqual({
                name: { from: 'John Doe', to: 'Jane Doe' },
                age: { from: 30, to: 25 },
            });

            await user.save();

            // Verify update
            expect(user.id).toBe(originalId); // ID should not change
            expect(user.createdAt).toBe(originalCreatedAt); // CreatedAt should not change
            expect(user.name).toBe('Jane Doe');
            expect(user.age).toBe(25);
            expect(user.isChanged()).toBe(false);
        });

        test('should reload entity from database', async () => {
            // Create and save user
            const user = TestUser.build({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
            });
            await user.save();

            // Modify in memory (simulate external changes)
            user.name = 'Modified Name';
            expect(user.name).toBe('Modified Name');

            // Reload from database
            await user.reload();

            expect(user.name).toBe('John Doe'); // Should revert to database value
            expect(user.email).toBe('john@example.com');
            expect(user.age).toBe(30);
        });

        test('should remove entity from database', async () => {
            // Create and save user
            const user = TestUser.build({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
            });
            await user.save();

            const userId = user.id;
            expect(user.isNew()).toBe(false);

            // Remove user
            await user.remove();

            expect(user.isNew()).toBe(true);

            // Verify user is deleted from database
            expect(TestUser.get(userId)).rejects.toThrow(EntityNotFoundError);
        });

        test('should track entity state correctly', async () => {
            const user = TestUser.build({
                name: 'John Doe',
                email: 'john@example.com',
            });

            // New entity
            expect(user.isNew()).toBe(true);
            expect(user.isChanged()).toBe(false);

            await user.save();

            // Saved entity
            expect(user.isNew()).toBe(false);
            expect(user.isChanged()).toBe(false);

            // Modified entity
            user.name = 'Jane Doe';
            expect(user.isNew()).toBe(false);
            expect(user.isChanged()).toBe(true);

            await user.save();

            // Saved changes
            expect(user.isNew()).toBe(false);
            expect(user.isChanged()).toBe(false);
        });
    });

    describe('Static Query Methods', () => {
        beforeEach(async () => {
            // Create test data
            await TestUser.build({
                name: 'Alice',
                email: 'alice@example.com',
                age: 25,
            }).save();

            await TestUser.build({
                name: 'Bob',
                email: 'bob@example.com',
                age: 30,
            }).save();

            await TestUser.build({
                name: 'Charlie',
                email: 'charlie@example.com',
                age: 35,
            }).save();
        });

        test('should find entity by primary key', async () => {
            const users = await TestUser.find({});
            expect(users.length).toBe(3);

            const firstUser = users[0];
            const foundUser = await TestUser.get(firstUser.id);

            expect(foundUser).toBeInstanceOf(TestUser);
            expect(foundUser.id).toBe(firstUser.id);
            expect(foundUser.name).toBe(firstUser.name);
            expect(foundUser.email).toBe(firstUser.email);
            expect(foundUser.isNew()).toBe(false);
        });

        test('should throw EntityNotFoundError for non-existent ID', async () => {
            expect(TestUser.get(999999)).rejects.toThrow(EntityNotFoundError);
        });

        test('should find multiple entities with conditions', async () => {
            const users = await TestUser.find({ age: 30 });
            expect(users.length).toBe(1);
            expect(users[0].name).toBe('Bob');
            expect(users[0].age).toBe(30);
        });

        test('should find all entities when no conditions provided', async () => {
            const users = await TestUser.find({});
            expect(users.length).toBe(3);
            expect(users.every((user) => user instanceof TestUser)).toBe(true);
        });

        test('should return empty array when no entities match conditions', async () => {
            const users = await TestUser.find({ age: 999 });
            expect(users).toEqual([]);
        });

        test('should find first entity matching conditions', async () => {
            const user = await TestUser.findFirst({ age: 30 });
            expect(user).toBeInstanceOf(TestUser);
            expect(user?.name).toBe('Bob');
        });

        test('should return null when no entity matches findFirst conditions', async () => {
            const user = await TestUser.findFirst({ age: 999 });
            expect(user).toBeNull();
        });

        test('should count entities with conditions', async () => {
            const count = await TestUser.count({ age: 30 });
            expect(count).toBe(1);
        });

        test('should count all entities when no conditions provided', async () => {
            const count = await TestUser.count();
            expect(count).toBe(3);
        });

        test('should check entity existence', async () => {
            const exists = await TestUser.exists({ name: 'Alice' });
            expect(exists).toBe(true);

            const notExists = await TestUser.exists({ name: 'NonExistent' });
            expect(notExists).toBe(false);
        });
    });

    describe('Bulk Operations', () => {
        beforeEach(async () => {
            // Create test data
            await TestUser.build({
                name: 'Alice',
                email: 'alice@example.com',
                age: 25,
            }).save();

            await TestUser.build({
                name: 'Bob',
                email: 'bob@example.com',
                age: 30,
            }).save();

            await TestUser.build({
                name: 'Charlie',
                email: 'charlie@example.com',
                age: 35,
            }).save();
        });

        test('should delete multiple entities with conditions', async () => {
            const deletedCount = await TestUser.deleteAll({ age: 30 });
            expect(deletedCount).toBe(1);

            const remainingUsers = await TestUser.find({});
            expect(remainingUsers.length).toBe(2);
            expect(remainingUsers.every((user) => user.age !== 30)).toBe(true);
        });

        test('should delete all entities when no conditions provided', async () => {
            const deletedCount = await TestUser.deleteAll({});
            expect(deletedCount).toBe(3);

            const remainingUsers = await TestUser.find({});
            expect(remainingUsers.length).toBe(0);
        });

        test('should update multiple entities with conditions', async () => {
            const updatedCount = await TestUser.updateAll({ bio: 'Updated bio' }, { age: 30 });
            expect(updatedCount).toBe(1);

            const bobUser = await TestUser.findFirst({ name: 'Bob' });
            expect(bobUser?.bio).toBe('Updated bio');

            // Other users should not be affected
            const aliceUser = await TestUser.findFirst({ name: 'Alice' });
            expect(aliceUser?.bio).toBeUndefined();
        });
    });

    describe('Primary Key Strategies', () => {
        test('should handle auto-increment primary keys', async () => {
            const user1 = TestUser.build({
                name: 'User 1',
                email: 'user1@example.com',
            });
            await user1.save();

            const user2 = TestUser.build({
                name: 'User 2',
                email: 'user2@example.com',
            });
            await user2.save();

            expect(user1.id).toBeDefined();
            expect(user2.id).toBeDefined();
            expect(typeof user1.id).toBe('number');
            expect(typeof user2.id).toBe('number');
            expect(user2.id).toBeGreaterThan(user1.id);
        });

        test('should handle UUID primary keys', async () => {
            const post = TestPost.build({
                title: 'Test Post',
                content: 'Test content',
                authorId: 1,
            });
            await post.save();

            expect(post.id).toBeDefined();
            expect(typeof post.id).toBe('string');
            expect(post.id.length).toBe(36); // UUID length
            expect(post.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        test('should handle manual primary keys', async () => {
            const entity = SimpleTestEntity.build({
                id: 'manual-id-123',
                name: 'Test Entity',
            });
            await entity.save();

            expect(entity.id).toBe('manual-id-123');

            const found = await SimpleTestEntity.get('manual-id-123');
            expect(found.id).toBe('manual-id-123');
            expect(found.name).toBe('Test Entity');
        });
    });

    describe('Validation Integration', () => {
        test('should prevent saving invalid entities', async () => {
            const user = TestUser.build({
                name: 'J', // Too short (MinLength(2))
                email: 'invalid-email', // Invalid email format
            });

            expect(user.save()).rejects.toThrow(ValidationError);
        });

        test('should save valid entities successfully', async () => {
            const user = TestUser.build({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
            });

            await user.save();
            expect(user.id).toBeDefined();
        });

        test('should handle optional fields correctly', async () => {
            const user = TestUser.build({
                name: 'John Doe',
                email: 'john@example.com',
                // age and bio are optional
            });

            await user.save();

            expect(user.id).toBeDefined();
            expect(user.age).toBeUndefined();
            expect(user.bio).toBeUndefined();
        });
    });

    describe('Error Scenarios', () => {
        test('should throw error when trying to remove unsaved entity', async () => {
            const user = TestUser.build({
                name: 'John Doe',
                email: 'john@example.com',
            });

            expect(user.remove()).rejects.toThrow('Cannot remove unsaved entity');
        });

        test('should throw error when trying to reload unsaved entity', async () => {
            const user = TestUser.build({
                name: 'John Doe',
                email: 'john@example.com',
            });

            expect(user.reload()).rejects.toThrow('Cannot reload unsaved entity');
        });

        test('should handle database constraint violations', async () => {
            // Create user with unique email
            const user1 = TestUser.build({
                name: 'User 1',
                email: 'unique@example.com',
            });
            await user1.save();

            // Try to create another user with same email
            const user2 = TestUser.build({
                name: 'User 2',
                email: 'unique@example.com', // Same email (UNIQUE constraint)
            });

            expect(user2.save()).rejects.toThrow();
        });
    });
});
