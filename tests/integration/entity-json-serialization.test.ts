import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from '../../src/decorators';
import { BaseEntity } from '../../src/entity';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

@Entity('users')
class User extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'text', unique: true })
    email!: string;

    @Column({ type: 'integer', nullable: true })
    age?: number;

    @Column({ type: 'integer', sqlDefault: '1' })
    isActive!: boolean;

    @Column({ sqlDefault: 'CURRENT_TIMESTAMP' })
    createdAt!: string;
}

@Entity('user_profiles')
class UserProfile extends BaseEntity {
    @PrimaryColumn()
    userId!: number;

    @PrimaryColumn()
    profileType!: string;

    @Column({ type: 'text', nullable: true })
    bio?: string;

    @Column({ type: 'text', nullable: true })
    avatar?: string;
}

describe('Entity JSON Serialization Integration Tests', () => {
    let testDS: TestDataSourceResult;

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [User, UserProfile],
        });
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        await clearTestData([User, UserProfile]);
    });

    describe('Single Primary Key Entities', () => {
        test('should serialize complete user entity correctly', async () => {
            const user = await User.create({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                isActive: true,
            });

            const json = user.toJSON();

            expect(json).toEqual({
                id: expect.any(Number),
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                isActive: true,
                createdAt: expect.any(String),
            });

            // Verify no internal ORM state
            expect(json).not.toHaveProperty('_isNew');
            expect(json).not.toHaveProperty('_originalValues');
        });

        test('should work correctly with API-like scenarios', async () => {
            // Simulate typical API usage
            const users = await User.find({});

            // Add some test data first
            await User.create({ name: 'Alice', email: 'alice@example.com', age: 25 });
            await User.create({ name: 'Bob', email: 'bob@example.com', age: 35 });

            const allUsers = await User.find({});

            // Simulate API response transformation
            const apiResponse = {
                users: allUsers.map((user) => user.toJSON()),
                total: allUsers.length,
            };

            expect(apiResponse.users).toHaveLength(2);
            for (const userJson of apiResponse.users) {
                expect(userJson).toHaveProperty('id');
                expect(userJson).toHaveProperty('name');
                expect(userJson).toHaveProperty('email');
                expect(userJson).not.toHaveProperty('_isNew');
                expect(userJson).not.toHaveProperty('_originalValues');
            }
        });

        test('should maintain consistency after entity modifications', async () => {
            const user = await User.create({
                name: 'Original Name',
                email: 'original@example.com',
                age: 25,
            });

            const originalJson = user.toJSON();

            // Modify the entity
            user.name = 'Updated Name';
            user.age = 26;

            const updatedJson = user.toJSON();

            expect(updatedJson.name).toBe('Updated Name');
            expect(updatedJson.age).toBe(26);
            expect(updatedJson.id).toBe(originalJson.id); // ID unchanged
            expect(updatedJson.email).toBe(originalJson.email); // Email unchanged

            // Save the changes
            await user.save();

            const savedJson = user.toJSON();
            expect(savedJson).toEqual(updatedJson);
        });
    });

    describe('Composite Primary Key Entities', () => {
        test('should serialize composite key entity correctly', async () => {
            const profile = UserProfile.build({
                userId: 1,
                profileType: 'public',
                bio: 'Software developer',
                avatar: 'avatar.jpg',
            });

            await profile.save();

            const json = profile.toJSON();

            expect(json).toEqual({
                userId: 1,
                profileType: 'public',
                bio: 'Software developer',
                avatar: 'avatar.jpg',
            });

            // No internal state properties
            expect(json).not.toHaveProperty('_isNew');
            expect(json).not.toHaveProperty('_originalValues');
        });

        test('should handle composite entities with partial data', async () => {
            const profile = await UserProfile.create({
                userId: 2,
                profileType: 'private',
                // bio and avatar are undefined
            });

            const json = profile.toJSON();

            expect(json).toEqual({
                userId: 2,
                profileType: 'private',
            });

            // Undefined properties should not be included
            expect(json).not.toHaveProperty('bio');
            expect(json).not.toHaveProperty('avatar');
        });
    });

    describe('Logging and Debugging Scenarios', () => {
        test('should produce clean output in console.log scenarios', async () => {
            const user = await User.create({
                name: 'Console Test',
                email: 'console@test.com',
                age: 30,
            });

            // Simulate what would appear in logs
            const logOutput = JSON.stringify(user, null, 2);

            expect(logOutput).not.toContain('_isNew');
            expect(logOutput).not.toContain('_originalValues');
            expect(logOutput).toContain('Console Test');
            expect(logOutput).toContain('console@test.com');
        });

        test('should work with debugging tools that use JSON.stringify', async () => {
            const users = await Promise.all([
                User.create({ name: 'Debug User 1', email: 'debug1@test.com' }),
                User.create({ name: 'Debug User 2', email: 'debug2@test.com' }),
            ]);

            // Simulate debugging scenario
            const debugOutput = JSON.stringify({ users }, null, 2);

            expect(debugOutput).not.toContain('_isNew');
            expect(debugOutput).not.toContain('_originalValues');
            expect(debugOutput).toContain('Debug User 1');
            expect(debugOutput).toContain('Debug User 2');
        });
    });

    describe('Performance and Memory Considerations', () => {
        test('should not leak internal state in serialized form', async () => {
            const user = await User.create({
                name: 'Memory Test',
                email: 'memory@test.com',
            });

            // Modify entity to create internal state
            user.name = 'Modified Memory Test';

            const json = user.toJSON();
            const serialized = JSON.stringify(json);

            // Verify no references to internal state
            expect(serialized).not.toContain('_isNew');
            expect(serialized).not.toContain('_originalValues');
            expect(serialized).not.toContain('_captureOriginalValues');
            expect(serialized).not.toContain('_loadFromRow');
        });

        test('should handle large datasets efficiently', async () => {
            // Create multiple entities
            const userPromises = Array.from({ length: 50 }, (_, i) =>
                User.create({
                    name: `User ${i}`,
                    email: `user${i}@example.com`,
                    age: 20 + (i % 50),
                })
            );

            const users = await Promise.all(userPromises);

            // Serialize all entities
            const start = performance.now();
            const serializedUsers = users.map((user) => user.toJSON());
            const end = performance.now();

            expect(serializedUsers).toHaveLength(50);
            expect(end - start).toBeLessThan(100); // Should be fast

            // Verify all are clean
            for (const userJson of serializedUsers) {
                expect(userJson).not.toHaveProperty('_isNew');
                expect(userJson).not.toHaveProperty('_originalValues');
                expect(userJson).toHaveProperty('name');
                expect(userJson).toHaveProperty('email');
            }
        });
    });
});
