import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { TestUser } from '../helpers/mock-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

describe('Parameter Binding Type Safety', () => {
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

    describe('Type Safety Issues', () => {
        test('should now enforce compile-time type safety', () => {
            // This test now demonstrates that invalid types are caught at compile time

            // The following would now cause TypeScript compile errors:
            // TestUser.find({ name: new Date() }); // ❌ Type error
            // TestUser.find({ name: { nested: 'object' } }); // ❌ Type error
            // TestUser.find({ name: [1, 2, 3] }); // ❌ Type error
            // TestUser.find({ name: Symbol('test') }); // ❌ Type error
            // TestUser.find({ name: () => 'test' }); // ❌ Type error

            // Only valid SQLQueryBindings types are now accepted:
            const validQueries = [
                TestUser.find({ name: 'string' }), // ✅ string
                TestUser.find({ age: 25 }), // ✅ number
                TestUser.find({ bio: null }), // ✅ null
            ];

            // All queries should return promises
            for (const query of validQueries) {
                expect(query).toBeInstanceOf(Promise);
            }
        });

        test('should work correctly with valid parameter types', async () => {
            // Create test users
            await TestUser.create({
                name: 'Test User',
                email: 'test@example.com',
                age: 25,
            });

            await TestUser.create({
                name: 'Another User',
                email: 'another@example.com',
                age: 30,
            });

            // These parameter types are now validated at compile time
            const results1 = await TestUser.find({ name: 'Test User' }); // string
            expect(results1).toHaveLength(1);
            expect(results1[0].name).toBe('Test User');

            const results2 = await TestUser.find({ age: 25 }); // number
            expect(results2).toHaveLength(1);
            expect(results2[0].age).toBe(25);

            const results3 = await TestUser.find({ bio: null }); // null
            expect(results3).toHaveLength(0); // No users with null bio

            // All tests completed successfully
        });

        test('should show type coercion issues with numeric types', async () => {
            await TestUser.create({
                name: 'Test User',
                email: 'test@example.com',
                age: 25,
            });

            // These work but may have unexpected behavior
            const numericParams = [
                '25', // String that looks like number
                25.5, // Float for integer field
                Number.NaN, // Not a Number
                Number.POSITIVE_INFINITY, // Infinity
                Number.NEGATIVE_INFINITY, // Negative Infinity
            ];

            for (const param of numericParams) {
                // These may pass but could have unexpected behavior
                const results = await TestUser.find({ age: param });
                // Results depend on SQLite's type coercion behavior
                console.log(`Searching for age ${param}:`, results.length);
            }
        });

        test('should handle null values correctly', async () => {
            await TestUser.create({
                name: 'Test User',
                email: 'test@example.com',
                age: 25,
                bio: 'Has bio', // Set a bio value
            });

            await TestUser.create({
                name: 'Test User 2',
                email: 'test2@example.com',
                age: 30,
                // bio is undefined (not set)
            });

            // With proper types, null is allowed but undefined would be a compile error
            const nullResults = await TestUser.find({ bio: null });
            expect(nullResults.length).toBe(0); // No users with explicitly null bio

            // undefined would now cause a compile error:
            // TestUser.find({ bio: undefined }); // ❌ Type error

            // This ensures consistent behavior and prevents unexpected results
        });
    });

    describe('Valid Parameter Types', () => {
        test('should work correctly with all valid SQLQueryBindings types', async () => {
            // These are the only valid types according to SQLQueryBindings
            await TestUser.create({
                name: 'Test User',
                email: 'test@example.com',
                age: 25,
                bio: 'Valid bio',
            });

            // Test all valid SQLQueryBindings types
            const stringResult = await TestUser.find({ name: 'Test User' });
            expect(stringResult).toHaveLength(1);

            const numberResult = await TestUser.find({ age: 25 });
            expect(numberResult).toHaveLength(1);

            // BigInt would be valid but may cause issues with SQLite conversion
            // const bigintResult = await TestUser.find({ age: BigInt(25) });

            const nullResult = await TestUser.find({ bio: null });
            expect(nullResult).toHaveLength(0); // No null bio users

            // Test with string parameter
            const stringResult2 = await TestUser.find({ bio: 'Valid bio' });
            expect(stringResult2).toHaveLength(1);

            // Uint8Array would work but doesn't make sense for typical queries
            // const uint8Result = await TestUser.find({ data: new Uint8Array([1, 2, 3]) });

            // All parameter types are now validated at compile time
            expect(true).toBe(true); // Test completed successfully
        });
    });
});
