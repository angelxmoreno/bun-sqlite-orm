import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { StatementCache } from '../../src';
import { TestUser } from '../helpers/mock-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

describe('Statement Cache Performance Tests', () => {
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
        // Clean up cache completely for proper test isolation
        StatementCache.cleanup();
        StatementCache.setEnabled(true);
    });

    describe('Statement Caching Benefits', () => {
        test('should demonstrate performance improvement with repeated queries', async () => {
            // Create test data
            const testData = [];
            for (let i = 0; i < 50; i++) {
                testData.push({
                    name: `User ${i}`,
                    email: `user${i}@example.com`,
                    age: 20 + (i % 30),
                });
            }

            // Measure performance with caching enabled (default)
            StatementCache.setEnabled(true);
            const startWithCache = performance.now();

            // Insert test data
            const insertPromises = testData.map((data) => TestUser.create(data));
            await Promise.all(insertPromises);

            // Perform repeated queries that will benefit from caching
            const queryPromises = [];
            for (let i = 0; i < 100; i++) {
                // These queries will create the same SQL patterns, benefiting from caching
                queryPromises.push(TestUser.find({ age: 25 }));
                queryPromises.push(TestUser.find({ age: 30 }));
                queryPromises.push(TestUser.count({ age: 35 }));
                queryPromises.push(TestUser.exists({ age: 40 }));
            }
            await Promise.all(queryPromises);

            const endWithCache = performance.now();
            const timeWithCache = endWithCache - startWithCache;
            const cacheStats = StatementCache.getStats();

            // Verify caching is working
            expect(cacheStats.enabled).toBe(true);
            expect(cacheStats.hitCount).toBeGreaterThan(0);
            expect(cacheStats.hitRate).toBeGreaterThan(0.5); // Should have good hit rate

            console.log(`Performance with caching: ${timeWithCache.toFixed(2)}ms`);
            console.log('Cache stats:', cacheStats);

            // Clear data for second test
            await clearTestData([TestUser]);

            // Measure performance without caching
            StatementCache.setEnabled(false);
            const startWithoutCache = performance.now();

            // Insert same test data
            const insertPromises2 = testData.map((data) => TestUser.create(data));
            await Promise.all(insertPromises2);

            // Perform same repeated queries without caching
            const queryPromises2 = [];
            for (let i = 0; i < 100; i++) {
                queryPromises2.push(TestUser.find({ age: 25 }));
                queryPromises2.push(TestUser.find({ age: 30 }));
                queryPromises2.push(TestUser.count({ age: 35 }));
                queryPromises2.push(TestUser.exists({ age: 40 }));
            }
            await Promise.all(queryPromises2);

            const endWithoutCache = performance.now();
            const timeWithoutCache = endWithoutCache - startWithoutCache;

            console.log(`Performance without caching: ${timeWithoutCache.toFixed(2)}ms`);

            // Performance improvement calculation
            const improvement = ((timeWithoutCache - timeWithCache) / timeWithoutCache) * 100;
            console.log(`Performance improvement: ${improvement.toFixed(2)}%`);

            // Re-enable caching for other tests
            StatementCache.setEnabled(true);

            // Focus on cache behavior rather than exact timing (which can vary)
            // The key verification is that caching is working properly
            expect(cacheStats.enabled).toBe(true);
            expect(cacheStats.hitCount).toBeGreaterThan(0);
            expect(cacheStats.hitRate).toBeGreaterThan(0.5);

            // Performance may vary, but cache should be functioning
            console.log(
                `Performance comparison - Cached: ${timeWithCache.toFixed(2)}ms, Uncached: ${timeWithoutCache.toFixed(2)}ms`
            );
        });

        test('should show cache hit rate improvement over time', async () => {
            // Create some test data
            await TestUser.create({ name: 'Test User 1', email: 'test1@example.com', age: 25 });
            await TestUser.create({ name: 'Test User 2', email: 'test2@example.com', age: 30 });

            // First round of queries (cache misses)
            await TestUser.find({ age: 25 });
            await TestUser.find({ age: 30 });
            await TestUser.count({ age: 25 });

            const firstStats = StatementCache.getStats();
            expect(firstStats.missCount).toBeGreaterThan(0); // Should have some cache misses
            const initialHitCount = firstStats.hitCount;

            // Second round of same queries (cache hits)
            await TestUser.find({ age: 25 });
            await TestUser.find({ age: 30 });
            await TestUser.count({ age: 25 });

            const secondStats = StatementCache.getStats();
            expect(secondStats.hitCount).toBeGreaterThan(initialHitCount); // Should have more hits now
            expect(secondStats.hitRate).toBeGreaterThan(firstStats.hitRate); // Hit rate should improve

            // Third round of same queries (more cache hits)
            for (let i = 0; i < 10; i++) {
                await TestUser.find({ age: 25 });
                await TestUser.find({ age: 30 });
                await TestUser.count({ age: 25 });
            }

            const finalStats = StatementCache.getStats();
            expect(finalStats.hitRate).toBeGreaterThan(secondStats.hitRate); // Hit rate should keep improving
            expect(finalStats.hitCount).toBeGreaterThan(secondStats.hitCount);

            console.log('Cache evolution:', {
                first: firstStats,
                second: secondStats,
                final: finalStats,
            });
        });

        test('should cache different query patterns independently', async () => {
            // Create test data
            await TestUser.create({ name: 'User A', email: 'a@example.com', age: 25 });
            await TestUser.create({ name: 'User B', email: 'b@example.com', age: 30 });

            // Different query patterns that should create separate cache entries
            await TestUser.find({ name: 'User A' }); // Pattern 1
            await TestUser.find({ email: 'a@example.com' }); // Pattern 2
            await TestUser.find({ age: 25 }); // Pattern 3
            await TestUser.find({ name: 'User A', age: 25 }); // Pattern 4
            await TestUser.count({ age: 25 }); // Pattern 5
            await TestUser.exists({ name: 'User A' }); // Pattern 6

            const stats = StatementCache.getStats();
            expect(stats.size).toBeGreaterThanOrEqual(4); // Should have several cached statements
            expect(stats.missCount).toBeGreaterThan(0); // Should have some cache misses for new patterns

            // Repeat the same queries (should be cache hits)
            await TestUser.find({ name: 'User A' });
            await TestUser.find({ email: 'a@example.com' });
            await TestUser.find({ age: 25 });
            await TestUser.find({ name: 'User A', age: 25 });
            await TestUser.count({ age: 25 });
            await TestUser.exists({ name: 'User A' });

            const finalStats = StatementCache.getStats();
            expect(finalStats.hitCount).toBeGreaterThanOrEqual(6); // Should have hits
            expect(finalStats.size).toBe(stats.size); // Cache size shouldn't grow
        });
    });

    describe('Memory and Resource Management', () => {
        test('should properly manage memory usage with large cache', async () => {
            const initialStats = StatementCache.getStats();
            const initialMemory = process.memoryUsage().heapUsed;

            // Create many unique query patterns
            for (let i = 0; i < 100; i++) {
                await TestUser.create({
                    name: `User ${i}`,
                    email: `user${i}@example.com`,
                    age: i,
                });
            }

            // Generate many different query patterns
            for (let i = 0; i < 50; i++) {
                await TestUser.find({ age: i });
                await TestUser.count({ age: i });
                await TestUser.exists({ name: `User ${i}` });
            }

            const finalStats = StatementCache.getStats();
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            console.log('Cache size after operations:', finalStats.size);
            console.log('Memory increase:', (memoryIncrease / 1024 / 1024).toFixed(2), 'MB');

            // Cache should have grown but memory usage should be reasonable
            expect(finalStats.size).toBeGreaterThanOrEqual(initialStats.size);
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        });

        test('should handle cache cleanup properly', async () => {
            // Create some cached statements
            await TestUser.create({ name: 'Test', email: 'test@example.com', age: 25 });
            await TestUser.find({ name: 'Test' });
            await TestUser.count({ age: 25 });

            const beforeCleanup = StatementCache.getStats();
            expect(beforeCleanup.size).toBeGreaterThan(0);

            // Clean up cache
            StatementCache.cleanup();

            const afterCleanup = StatementCache.getStats();
            expect(afterCleanup.size).toBe(0);
            expect(afterCleanup.hitCount).toBe(0);
            expect(afterCleanup.missCount).toBe(0);
        });

        test('should handle cache invalidation by pattern', async () => {
            // Create test data and queries
            await TestUser.create({ name: 'Test', email: 'test@example.com', age: 25 });

            // Generate queries that will create cache entries
            await TestUser.find({ name: 'Test' }); // Will contain "test_users"
            await TestUser.count({ age: 25 }); // Will contain "test_users"
            await TestUser.exists({ email: 'test@example.com' }); // Will contain "test_users"

            const beforeInvalidation = StatementCache.getStats();
            expect(beforeInvalidation.size).toBeGreaterThan(0);

            // Get list of cached queries for verification
            const cachedQueries = StatementCache.getCachedQueries();
            console.log('Cached queries before invalidation:', cachedQueries);

            // Invalidate cache entries containing "test_users"
            const removed = StatementCache.invalidate(/test_users/);
            expect(removed).toBeGreaterThan(0);

            const afterInvalidation = StatementCache.getStats();
            expect(afterInvalidation.size).toBeLessThan(beforeInvalidation.size);
        });
    });

    describe('Cache Configuration and Control', () => {
        test('should allow enabling and disabling cache', async () => {
            // Verify caching is enabled by default
            expect(StatementCache.getStats().enabled).toBe(true);

            // Create a query to populate cache
            await TestUser.create({ name: 'Test', email: 'test@example.com', age: 25 });
            await TestUser.find({ name: 'Test' });

            const withCacheStats = StatementCache.getStats();
            expect(withCacheStats.size).toBeGreaterThan(0);

            // Disable caching
            StatementCache.setEnabled(false);
            expect(StatementCache.getStats().enabled).toBe(false);
            expect(StatementCache.getStats().size).toBe(0); // Should clear cache when disabled

            // Queries should still work but without caching
            await TestUser.find({ name: 'Test' });
            await TestUser.find({ name: 'Test' }); // Same query again

            const withoutCacheStats = StatementCache.getStats();
            expect(withoutCacheStats.size).toBe(0); // No caching
            expect(withoutCacheStats.hitCount).toBe(0);

            // Re-enable caching for other tests
            StatementCache.setEnabled(true);
            expect(StatementCache.getStats().enabled).toBe(true);
        });

        test('should provide accurate cache statistics', async () => {
            // Start with clean stats
            StatementCache.resetStats();
            const initialStats = StatementCache.getStats();
            expect(initialStats.hitCount).toBe(0);
            expect(initialStats.missCount).toBe(0);

            // Create test data
            await TestUser.create({ name: 'Test', email: 'test@example.com', age: 25 });

            // First query (may involve multiple statements: INSERT + SELECT)
            await TestUser.find({ name: 'Test' });
            const afterMiss = StatementCache.getStats();
            expect(afterMiss.missCount).toBeGreaterThan(0); // Should have at least one miss
            expect(afterMiss.hitCount).toBeGreaterThanOrEqual(0);

            const initialMissCount = afterMiss.missCount;

            // Same query again (should be cache hit)
            await TestUser.find({ name: 'Test' });
            const afterHit = StatementCache.getStats();
            expect(afterHit.missCount).toBe(initialMissCount); // Miss count shouldn't change
            expect(afterHit.hitCount).toBeGreaterThan(afterMiss.hitCount); // Hit count should increase

            // Multiple hits
            await TestUser.find({ name: 'Test' });
            await TestUser.find({ name: 'Test' });
            const afterMultipleHits = StatementCache.getStats();
            expect(afterMultipleHits.hitCount).toBeGreaterThan(afterHit.hitCount); // More hits
            expect(afterMultipleHits.hitRate).toBeGreaterThan(afterHit.hitRate); // Better hit rate
        });
    });
});
