import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { StatementCache } from '../../src/statement-cache';

describe('StatementCache Unit Tests', () => {
    let db: Database;

    beforeEach(() => {
        db = new Database(':memory:');

        // Create test table
        db.exec(`
            CREATE TABLE test_table (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                value INTEGER
            )
        `);

        // Reset cache for each test
        StatementCache.cleanup();
        StatementCache.setEnabled(true);
    });

    afterEach(() => {
        StatementCache.cleanup();
        db.close();
    });

    describe('Basic Caching Functionality', () => {
        test('should cache prepared statements', () => {
            const sql = 'SELECT * FROM test_table WHERE id = ?';

            // First call should create and cache the statement
            const stmt1 = StatementCache.getStatement(db, sql);
            expect(StatementCache.size()).toBe(1);
            expect(StatementCache.has(sql)).toBe(true);

            // Second call should return the same cached statement
            const stmt2 = StatementCache.getStatement(db, sql);
            expect(stmt1).toBe(stmt2); // Same statement object
            expect(StatementCache.size()).toBe(1); // Cache size unchanged
        });

        test('should track cache statistics correctly', () => {
            const sql1 = 'SELECT * FROM test_table WHERE id = ?';
            const sql2 = 'SELECT * FROM test_table WHERE name = ?';

            let stats = StatementCache.getStats();
            expect(stats.hitCount).toBe(0);
            expect(stats.missCount).toBe(0);
            expect(stats.hitRate).toBe(0);

            // First access (cache miss)
            StatementCache.getStatement(db, sql1);
            stats = StatementCache.getStats();
            expect(stats.hitCount).toBe(0);
            expect(stats.missCount).toBe(1);
            expect(stats.hitRate).toBe(0);

            // Second access to same SQL (cache hit)
            StatementCache.getStatement(db, sql1);
            stats = StatementCache.getStats();
            expect(stats.hitCount).toBe(1);
            expect(stats.missCount).toBe(1);
            expect(stats.hitRate).toBe(0.5);

            // Access different SQL (cache miss)
            StatementCache.getStatement(db, sql2);
            stats = StatementCache.getStats();
            expect(stats.hitCount).toBe(1);
            expect(stats.missCount).toBe(2);
            expect(stats.hitRate).toBeCloseTo(0.333, 2);
        });

        test('should execute queries using cached statements', () => {
            // Insert test data
            db.exec("INSERT INTO test_table (name, value) VALUES ('test1', 100)");
            db.exec("INSERT INTO test_table (name, value) VALUES ('test2', 200)");

            const sql = 'SELECT * FROM test_table WHERE name = ?';

            // Use executeQuery method
            const result1 = StatementCache.executeQuery<{ id: number; name: string; value: number }>(
                db,
                sql,
                ['test1'],
                'get'
            );
            expect(result1).toEqual({ id: 1, name: 'test1', value: 100 });

            // Verify statement was cached
            expect(StatementCache.size()).toBe(1);
            expect(StatementCache.has(sql)).toBe(true);

            // Second query should use cached statement
            const result2 = StatementCache.executeQuery<{ id: number; name: string; value: number }>(
                db,
                sql,
                ['test2'],
                'get'
            );
            expect(result2).toEqual({ id: 2, name: 'test2', value: 200 });

            // Verify cache hit
            const stats = StatementCache.getStats();
            expect(stats.hitCount).toBe(1);
            expect(stats.missCount).toBe(1);
        });
    });

    describe('Cache Management', () => {
        test('should clear cache properly', () => {
            const sql1 = 'SELECT * FROM test_table WHERE id = ?';
            const sql2 = 'SELECT * FROM test_table WHERE name = ?';

            // Create cached statements
            StatementCache.getStatement(db, sql1);
            StatementCache.getStatement(db, sql2);

            expect(StatementCache.size()).toBe(2);

            // Clear cache
            StatementCache.cleanup();

            expect(StatementCache.size()).toBe(0);
            expect(StatementCache.has(sql1)).toBe(false);
            expect(StatementCache.has(sql2)).toBe(false);

            // Stats should be reset
            const stats = StatementCache.getStats();
            expect(stats.hitCount).toBe(0);
            expect(stats.missCount).toBe(0);
        });

        test('should invalidate statements by pattern', () => {
            const sql1 = 'SELECT * FROM test_table WHERE id = ?';
            const sql2 = 'SELECT 1 as dummy_result'; // Use a simple query instead of invalid table
            const sql3 = 'INSERT INTO test_table (name) VALUES (?)';

            // Create cached statements
            StatementCache.getStatement(db, sql1);
            StatementCache.getStatement(db, sql2);
            StatementCache.getStatement(db, sql3);

            expect(StatementCache.size()).toBe(3);

            // Invalidate statements containing "test_table"
            const removed = StatementCache.invalidate(/test_table/);
            expect(removed).toBe(2); // sql1 and sql3

            expect(StatementCache.size()).toBe(1);
            expect(StatementCache.has(sql1)).toBe(false);
            expect(StatementCache.has(sql2)).toBe(true); // Should remain (doesn't contain "test_table")
            expect(StatementCache.has(sql3)).toBe(false);
        });

        test('should handle cache enable/disable', () => {
            const sql = 'SELECT * FROM test_table WHERE id = ?';

            // Caching enabled (default)
            expect(StatementCache.getStats().enabled).toBe(true);
            StatementCache.getStatement(db, sql);
            expect(StatementCache.size()).toBe(1);

            // Disable caching
            StatementCache.setEnabled(false);
            expect(StatementCache.getStats().enabled).toBe(false);
            expect(StatementCache.size()).toBe(0); // Cache cleared

            // New statements should not be cached
            const stmt1 = StatementCache.getStatement(db, sql);
            const stmt2 = StatementCache.getStatement(db, sql);
            expect(stmt1).not.toBe(stmt2); // Different statement objects
            expect(StatementCache.size()).toBe(0);

            // Re-enable caching
            StatementCache.setEnabled(true);
            expect(StatementCache.getStats().enabled).toBe(true);
        });

        test('should reset statistics without clearing cache', () => {
            const sql = 'SELECT * FROM test_table WHERE id = ?';

            // Generate some cache activity
            StatementCache.getStatement(db, sql); // miss
            StatementCache.getStatement(db, sql); // hit

            const beforeReset = StatementCache.getStats();
            expect(beforeReset.hitCount).toBe(1);
            expect(beforeReset.missCount).toBe(1);
            expect(beforeReset.size).toBe(1);

            // Reset stats only
            StatementCache.resetStats();

            const afterReset = StatementCache.getStats();
            expect(afterReset.hitCount).toBe(0);
            expect(afterReset.missCount).toBe(0);
            expect(afterReset.size).toBe(1); // Cache still intact
            expect(StatementCache.has(sql)).toBe(true);
        });
    });

    describe('Query Execution Methods', () => {
        test('should execute get queries correctly', () => {
            db.exec("INSERT INTO test_table (name, value) VALUES ('test', 123)");

            const result = StatementCache.executeQuery<{ id: number; name: string; value: number }>(
                db,
                'SELECT * FROM test_table WHERE name = ?',
                ['test'],
                'get'
            );

            expect(result).toEqual({ id: 1, name: 'test', value: 123 });
        });

        test('should execute all queries correctly', () => {
            db.exec("INSERT INTO test_table (name, value) VALUES ('test1', 100)");
            db.exec("INSERT INTO test_table (name, value) VALUES ('test2', 200)");

            const results = StatementCache.executeQuery<{ id: number; name: string; value: number }[]>(
                db,
                'SELECT * FROM test_table ORDER BY id',
                [],
                'all'
            );

            expect(results).toEqual([
                { id: 1, name: 'test1', value: 100 },
                { id: 2, name: 'test2', value: 200 },
            ]);
        });

        test('should execute run queries correctly', () => {
            const result = StatementCache.executeQuery<{ lastInsertRowid: number; changes: number }>(
                db,
                'INSERT INTO test_table (name, value) VALUES (?, ?)',
                ['test', 456],
                'run'
            );

            expect(result.changes).toBe(1);
            expect(result.lastInsertRowid).toBe(1);
        });
    });

    describe('Utility Methods', () => {
        test('should return cached query list', () => {
            const sql1 = 'SELECT * FROM test_table WHERE id = ?';
            const sql2 = 'SELECT COUNT(*) FROM test_table';

            StatementCache.getStatement(db, sql1);
            StatementCache.getStatement(db, sql2);

            const cachedQueries = StatementCache.getCachedQueries();
            expect(cachedQueries).toContain(sql1);
            expect(cachedQueries).toContain(sql2);
            expect(cachedQueries.length).toBe(2);
        });

        test('should check statement existence correctly', () => {
            const sql = 'SELECT * FROM test_table WHERE id = ?';

            expect(StatementCache.has(sql)).toBe(false);

            StatementCache.getStatement(db, sql);
            expect(StatementCache.has(sql)).toBe(true);

            StatementCache.cleanup();
            expect(StatementCache.has(sql)).toBe(false);
        });
    });
});
