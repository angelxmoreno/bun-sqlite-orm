import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { JsonTestEntity } from '../helpers/mock-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

describe('BaseEntity toJSON() Method', () => {
    let testDS: TestDataSourceResult;

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [JsonTestEntity],
        });
        await testDS.dataSource.runMigrations();
    });

    beforeEach(async () => {
        await clearTestData([JsonTestEntity]);
    });

    describe('With Database Initialized', () => {
        test('should serialize entity with only column properties', async () => {
            const user = JsonTestEntity.build({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                isActive: true,
            });

            const json = user.toJSON();

            expect(json).toEqual({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
                isActive: true,
            });

            // Verify internal properties are excluded
            expect(json).not.toHaveProperty('_isNew');
            expect(json).not.toHaveProperty('_originalValues');
        });

        test('should exclude undefined values from JSON output', () => {
            const user = JsonTestEntity.build({
                name: 'Jane Doe',
                age: 25,
                // email is undefined
            });

            const json = user.toJSON();

            expect(json).toEqual({
                name: 'Jane Doe',
                age: 25,
            });

            expect(json).not.toHaveProperty('email');
            expect(json).not.toHaveProperty('id'); // undefined before save
        });

        test('should serialize saved entity correctly', async () => {
            const user = await JsonTestEntity.create({
                name: 'Alice Smith',
                email: 'alice@example.com',
                age: 28,
            });

            const json = user.toJSON();

            expect(json).toEqual({
                id: expect.any(Number),
                name: 'Alice Smith',
                email: 'alice@example.com',
                age: 28,
                isActive: true, // SQL default applied
                createdAt: expect.any(String), // CURRENT_TIMESTAMP default
            });

            // Verify internal state is not included
            expect(json).not.toHaveProperty('_isNew');
            expect(json).not.toHaveProperty('_originalValues');
        });

        test('should work with modified entities', async () => {
            const user = await JsonTestEntity.create({
                name: 'Bob Wilson',
                email: 'bob@example.com',
                age: 35,
            });

            // Modify the entity
            user.name = 'Robert Wilson';
            user.age = 36;

            const json = user.toJSON();

            expect(json).toEqual({
                id: expect.any(Number),
                name: 'Robert Wilson', // Modified value
                email: 'bob@example.com', // Email unchanged
                age: 36, // Modified value
                isActive: true,
                createdAt: expect.any(String),
            });

            // Still no internal properties
            expect(json).not.toHaveProperty('_isNew');
            expect(json).not.toHaveProperty('_originalValues');
        });

        test('should handle boolean type conversion correctly', async () => {
            const user = await JsonTestEntity.create({
                name: 'Test User',
                email: 'test@example.com',
                age: 25,
                isActive: false,
            });

            const json = user.toJSON();

            expect(json.isActive).toBe(false);
            expect(typeof json.isActive).toBe('boolean');
        });

        test('should work with JSON.stringify()', async () => {
            const user = await JsonTestEntity.create({
                name: 'JSON Test',
                email: 'json@test.com',
                age: 30,
            });

            const jsonString = JSON.stringify(user);
            const parsed = JSON.parse(jsonString);

            expect(parsed).toEqual({
                id: expect.any(Number),
                name: 'JSON Test',
                email: 'json@test.com',
                age: 30,
                isActive: true,
                createdAt: expect.any(String),
            });

            // Verify no internal properties in stringified JSON
            expect(jsonString).not.toContain('_isNew');
            expect(jsonString).not.toContain('_originalValues');
        });
    });

    describe('Without Database Initialized (Fallback Mode)', () => {
        test('should work when DataSource is not initialized', () => {
            // Destroy the data source to simulate uninitialized state
            testDS.cleanup();

            const user = JsonTestEntity.build({
                name: 'Fallback User',
                email: 'fallback@example.com',
                age: 25,
            });

            const json = user.toJSON();

            expect(json).toEqual({
                name: 'Fallback User',
                email: 'fallback@example.com',
                age: 25,
            });

            // Should not include internal properties
            expect(json).not.toHaveProperty('_isNew');
            expect(json).not.toHaveProperty('_originalValues');
        });

        test('should exclude properties starting with underscore in fallback mode', () => {
            // Destroy the data source to simulate uninitialized state
            testDS.cleanup();

            const user = JsonTestEntity.build({
                name: 'Test User',
                email: 'test@example.com',
            });
            // Simulate some internal properties that might exist
            (user as unknown as Record<string, unknown>)._someInternalProp = 'should not appear';
            (user as unknown as Record<string, unknown>).__proto_prop = 'should not appear';

            const json = user.toJSON();

            expect(json).toEqual({
                name: 'Test User',
                email: 'test@example.com',
            });

            expect(json).not.toHaveProperty('_someInternalProp');
            expect(json).not.toHaveProperty('__proto_prop');
            expect(json).not.toHaveProperty('_isNew');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty entity correctly', () => {
            const user = JsonTestEntity.build({});
            const json = user.toJSON();

            expect(json).toEqual({});
            expect(Object.keys(json)).toHaveLength(0);
        });

        test('should handle entity with only undefined values', () => {
            const user = new JsonTestEntity();
            const json = user.toJSON();

            expect(json).toEqual({});
            expect(Object.keys(json)).toHaveLength(0);
        });

        test('should handle null values correctly', async () => {
            const user = JsonTestEntity.build({
                name: 'Null Test',
                age: 30,
            });

            // Explicitly set email to null after construction
            (user as unknown as { email: null }).email = null;

            const json = user.toJSON();

            // Null values should be excluded (only undefined values are excluded)
            expect(json).toEqual({
                name: 'Null Test',
                email: null,
                age: 30,
            });
        });

        test('should be consistent across multiple calls', () => {
            const user = JsonTestEntity.build({
                name: 'Consistency Test',
                email: 'test@example.com',
                age: 30,
            });

            const json1 = user.toJSON();
            const json2 = user.toJSON();

            expect(json1).toEqual(json2);
            expect(JSON.stringify(json1)).toBe(JSON.stringify(json2));
        });
    });

    afterAll(async () => {
        if (testDS?.cleanup) {
            await testDS.cleanup();
        }
    });
});
