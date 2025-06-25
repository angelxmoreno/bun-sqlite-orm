import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { JsonTestEntity, JsonUserProfile } from '../helpers/mock-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

describe('Entity JSON Serialization Integration Tests', () => {
    let testDS: TestDataSourceResult;

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [JsonTestEntity, JsonUserProfile],
        });
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        await clearTestData([JsonTestEntity, JsonUserProfile]);
    });

    describe('Single Primary Key Entities', () => {
        test('should serialize complete user entity correctly', async () => {
            const user = await JsonTestEntity.create({
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
            const users = await JsonTestEntity.find({});

            // Add some test data first
            await JsonTestEntity.create({ name: 'Alice', email: 'alice@example.com', age: 25 });
            await JsonTestEntity.create({ name: 'Bob', email: 'bob@example.com', age: 35 });

            const allJsonTestEntitys = await JsonTestEntity.find({});

            // Simulate API response transformation
            const apiResponse = {
                users: allJsonTestEntitys.map((user) => user.toJSON()),
                total: allJsonTestEntitys.length,
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
            const user = await JsonTestEntity.create({
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
            const profile = JsonUserProfile.build({
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
            const profile = await JsonUserProfile.create({
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
            const user = await JsonTestEntity.create({
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
                JsonTestEntity.create({ name: 'Debug JsonTestEntity 1', email: 'debug1@test.com' }),
                JsonTestEntity.create({ name: 'Debug JsonTestEntity 2', email: 'debug2@test.com' }),
            ]);

            // Simulate debugging scenario
            const debugOutput = JSON.stringify({ users }, null, 2);

            expect(debugOutput).not.toContain('_isNew');
            expect(debugOutput).not.toContain('_originalValues');
            expect(debugOutput).toContain('Debug JsonTestEntity 1');
            expect(debugOutput).toContain('Debug JsonTestEntity 2');
        });
    });

    describe('Performance and Memory Considerations', () => {
        test('should not leak internal state in serialized form', async () => {
            const user = await JsonTestEntity.create({
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
                JsonTestEntity.create({
                    name: `JsonTestEntity ${i}`,
                    email: `user${i}@example.com`,
                    age: 20 + (i % 50),
                })
            );

            const users = await Promise.all(userPromises);

            // Serialize all entities
            const start = performance.now();
            const serializedJsonTestEntitys = users.map((user) => user.toJSON());
            const end = performance.now();

            expect(serializedJsonTestEntitys).toHaveLength(50);
            expect(end - start).toBeLessThan(100); // Should be fast

            // Verify all are clean
            for (const userJson of serializedJsonTestEntitys) {
                expect(userJson).not.toHaveProperty('_isNew');
                expect(userJson).not.toHaveProperty('_originalValues');
                expect(userJson).toHaveProperty('name');
                expect(userJson).toHaveProperty('email');
            }
        });
    });
});
