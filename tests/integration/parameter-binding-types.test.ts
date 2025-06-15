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
        test('should demonstrate current lack of compile-time type safety', () => {
            // This test demonstrates the current issue where invalid types
            // can be passed to query methods without compile-time errors

            // TypeScript should reject these but currently doesn't:
            // The following lines compile without errors, showing the type safety issue

            // This compiles but Date objects are not valid SQLQueryBindings
            // biome-ignore lint/suspicious/noExplicitAny: Demonstrating type safety issue
            const dateQuery = TestUser.find({ name: new Date() as any });
            expect(dateQuery).toBeInstanceOf(Promise);

            // This compiles but objects are not valid SQLQueryBindings
            // biome-ignore lint/suspicious/noExplicitAny: Demonstrating type safety issue
            const objectQuery = TestUser.find({ name: { nested: 'object' } as any });
            expect(objectQuery).toBeInstanceOf(Promise);

            // This compiles but arrays are not valid SQLQueryBindings
            // biome-ignore lint/suspicious/noExplicitAny: Demonstrating type safety issue
            const arrayQuery = TestUser.find({ name: [1, 2, 3] as any });
            expect(arrayQuery).toBeInstanceOf(Promise);

            // The fact that these compile demonstrates the type safety issue
            // With proper SQLQueryBindings types, these would fail at compile time
        });

        test('should demonstrate dangerous type coercion with invalid parameters', async () => {
            // Create a user first
            await TestUser.create({
                name: 'Test User',
                email: 'test@example.com',
                age: 25,
            });

            // These invalid parameter types get converted to strings via toString()
            // which may not be the intended behavior
            const dangerousParams = [
                new Date('2024-01-01'), // Becomes date string
                { nested: 'object' }, // Becomes "[object Object]"
                [1, 2, 3], // Becomes "1,2,3"
            ];

            for (const dangerousParam of dangerousParams) {
                // These don't throw but produce unexpected query behavior
                // biome-ignore lint/suspicious/noExplicitAny: Testing unsafe types intentionally
                const results = await TestUser.find({ name: dangerousParam as any });

                // No users found because the string representation doesn't match
                expect(results).toHaveLength(0);

                // This demonstrates the issue: we get no compile-time error
                // but also unexpected runtime behavior
            }
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

        test('should demonstrate issues with null vs undefined handling', async () => {
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

            // Current implementation may not handle null vs undefined consistently
            const nullResults = await TestUser.find({ bio: null });

            // undefined gets passed through but behavior is unpredictable
            // biome-ignore lint/suspicious/noExplicitAny: Testing unsafe types intentionally
            const undefinedResults = await TestUser.find({ bio: undefined as any });

            // These should behave consistently but currently don't
            expect(nullResults.length).toBe(0); // No users with explicitly null bio
            expect(undefinedResults.length).toBe(0); // Undefined behavior
        });
    });

    describe('Valid Parameter Types', () => {
        test('should work correctly with valid SQLQueryBindings types', async () => {
            // These are the only valid types according to SQLQueryBindings
            await TestUser.create({
                name: 'Test User',
                email: 'test@example.com',
                age: 25,
                bio: 'Valid bio',
            });

            // Valid parameter types
            const validParams: Array<null | string | number | bigint | boolean | Uint8Array> = [
                null,
                'string value',
                42,
                BigInt(9007199254740991),
                true,
                false,
                new Uint8Array([1, 2, 3, 4]),
            ];

            // These should all work without issues
            for (const param of validParams) {
                // This would work if we had proper type constraints
                // biome-ignore lint/suspicious/noExplicitAny: Testing valid types with current unsafe interface
                const results = await TestUser.find({ name: param as any });
                // Results depend on actual data and type conversion
                expect(results).toBeDefined();
            }
        });
    });
});
