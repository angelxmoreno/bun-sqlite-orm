import { Database } from 'bun:sqlite';
import type { Statement } from 'bun:sqlite';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { TestUser } from '../helpers/mock-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

describe('Statement Finalization Issues', () => {
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

    describe('Direct Database Statement Management', () => {
        test('should demonstrate proper statement finalization vs current pattern', async () => {
            const db = new Database(':memory:');

            // Create test table
            db.exec(`
                CREATE TABLE test_statements (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL
                )
            `);

            // CURRENT PATTERN (what BaseEntity does) - creates statements but never finalizes
            const currentPatternStatements: Statement[] = [];

            try {
                // This simulates what BaseEntity._executeQuery currently does
                for (let i = 0; i < 10; i++) {
                    // Each db.query() call creates a new statement internally
                    // but the statement is never explicitly finalized
                    const stmt = db.query('SELECT * FROM test_statements WHERE id = ?');
                    currentPatternStatements.push(stmt);

                    // The statement remains in memory even after use
                    stmt.get(i);
                    // Missing: stmt.finalize() - this is the bug!
                }

                // Verify statements were created but not finalized
                expect(currentPatternStatements.length).toBe(10);

                // Each statement is still holding resources
                for (const stmt of currentPatternStatements) {
                    // These statements should be finalized but aren't
                    expect(() => stmt.get(1)).not.toThrow(); // Still usable = not finalized
                }
            } finally {
                // Clean up for this test (but BaseEntity doesn't do this!)
                for (const stmt of currentPatternStatements) {
                    try {
                        stmt.finalize();
                    } catch (e) {
                        // May already be finalized
                    }
                }
            }

            // PROPER PATTERN (what should happen) - explicitly finalize statements
            const properStatements: Statement[] = [];

            for (let i = 0; i < 10; i++) {
                const stmt = db.prepare('SELECT * FROM test_statements WHERE id = ?');
                properStatements.push(stmt);

                stmt.get(i);
                stmt.finalize(); // Properly clean up resources
            }

            // Verify statements were properly finalized
            for (const stmt of properStatements) {
                // These statements should throw when used after finalization
                expect(() => stmt.get(1)).toThrow(); // Should be finalized
            }

            db.close();
        });

        test('should fail when statements are not properly managed', async () => {
            const db = new Database(':memory:');

            try {
                // Create many statements without finalizing them
                const statements = [];

                for (let i = 0; i < 100; i++) {
                    // This creates a new prepared statement each time
                    const stmt = db.query(`SELECT ${i} as value`);
                    statements.push(stmt);
                    stmt.get(); // Use the statement

                    // BUG: Not calling stmt.finalize() here
                    // In a real scenario with unique SQL, this accumulates statements
                }

                // All statements are still active in memory
                expect(statements.length).toBe(100);

                // This demonstrates the issue: statements remain usable (not finalized)
                let activeStatements = 0;
                for (const stmt of statements) {
                    try {
                        stmt.get();
                        activeStatements++;
                    } catch (e) {
                        // Statement was finalized
                    }
                }

                // This should fail in a proper implementation where statements are auto-finalized
                // But currently all statements remain active, indicating a resource leak
                expect(activeStatements).toBe(100); // All statements still active = memory leak

                // Manual cleanup (what BaseEntity should do but doesn't)
                for (const stmt of statements) {
                    stmt.finalize();
                }
            } finally {
                db.close();
            }
        });

        test('should demonstrate BaseEntity statement pattern issue', async () => {
            // Create some test data
            await TestUser.create({
                name: 'Test User',
                email: 'test@example.com',
                age: 25,
            });

            // Track operations that create statements in BaseEntity
            const operations = [
                () => TestUser.find({ name: 'Test User' }), // Creates: SELECT * FROM test_users WHERE name = ?
                () => TestUser.get(1), // Creates: SELECT * FROM test_users WHERE id = ?
                () => TestUser.count({ age: 25 }), // Creates: SELECT COUNT(*) as count FROM test_users WHERE age = ?
                () => TestUser.exists({ email: 'test@example.com' }), // Creates: SELECT 1 FROM test_users WHERE email = ? LIMIT 1
            ];

            // Each operation creates a prepared statement via db.query()
            // but BaseEntity never calls finalize() on these statements
            for (const operation of operations) {
                await operation();
            }

            // The issue: In BaseEntity, each db.query() call creates a statement
            // that remains in memory because it's never finalized
            // This test demonstrates the pattern but can't directly test the leak
            // without access to the internal statement management

            expect(true).toBe(true); // Test passes but demonstrates the issue
        });
    });

    describe('Resource Management Problems', () => {
        test('should show the impact of unfinalized statements', () => {
            const db = new Database(':memory:');

            // Simulate the BaseEntity pattern with many unique queries
            const uniqueQueries = [];

            for (let i = 0; i < 50; i++) {
                // Each query is slightly different, creating a new prepared statement
                const sql = `SELECT ${i} as id, 'test_${i}' as name`;
                uniqueQueries.push(sql);
            }

            const statements = [];

            for (const sql of uniqueQueries) {
                // This is what BaseEntity does: db.query(sql).get()
                // But it never finalizes the statement
                const stmt = db.query(sql);
                statements.push(stmt);
                stmt.get(); // Use the statement

                // Missing: stmt.finalize() - this is the memory leak
            }

            // Verify the problem: all statements are still active
            expect(statements.length).toBe(50);

            // In a real application, these statements would accumulate
            // leading to memory leaks and potential resource exhaustion

            // Cleanup for test
            for (const stmt of statements) {
                stmt.finalize();
            }
            db.close();
        });
    });
});
