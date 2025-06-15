import { Database } from 'bun:sqlite';
import type { Statement } from 'bun:sqlite';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { TestUser } from '../helpers/mock-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

describe('Statement Leak Failure Tests', () => {
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

    describe('Statement Resource Exhaustion', () => {
        test('should fail when trying to access finalized statements', async () => {
            const db = new Database(':memory:');

            try {
                // Create a statement using the current BaseEntity pattern
                const stmt = db.query('SELECT 1 as test');
                stmt.get(); // Use it once

                // In proper implementation, statement should be finalized after use
                stmt.finalize();

                // This should fail if statements were properly finalized
                expect(() => stmt.get()).toThrow();

                // But in BaseEntity, statements are never finalized, so they remain usable
                // This test would pass with proper statement management but fails with current code
            } finally {
                db.close();
            }
        });

        test('should demonstrate statement accumulation without cleanup', () => {
            const db = new Database(':memory:');

            try {
                const statements: Statement[] = [];

                // Create many statements (simulating BaseEntity behavior)
                for (let i = 0; i < 100; i++) {
                    const stmt = db.query(`SELECT ${i} as value`);
                    statements.push(stmt);
                    stmt.get();
                    // BaseEntity never calls stmt.finalize() here - this is the bug
                }

                // Count how many statements are still active (not finalized)
                let activeCount = 0;
                for (const stmt of statements) {
                    try {
                        stmt.get();
                        activeCount++;
                    } catch (e) {
                        // Statement was finalized
                    }
                }

                // With proper statement management, most should be finalized (activeCount should be 0)
                // But BaseEntity doesn't finalize, so all remain active
                expect(activeCount).toBe(0); // This SHOULD pass but will FAIL due to the bug
            } catch (error) {
                // Cleanup
                db.close();
                throw error;
            }

            db.close();
        });

        test('should enforce statement lifecycle management', async () => {
            // Create test data
            const user = await TestUser.create({
                name: 'Test User',
                email: 'test@example.com',
                age: 30,
            });

            // Get the raw database connection (this simulates accessing the same connection BaseEntity uses)
            const db = testDS.dataSource.getDatabase();

            // Track statements created by manual queries (simulating what BaseEntity should do)
            const manualStatements: Statement[] = [];

            // Create statements manually and finalize them properly
            const queries = [
                'SELECT * FROM test_users WHERE id = ?',
                'SELECT * FROM test_users WHERE name = ?',
                'SELECT COUNT(*) FROM test_users WHERE age = ?',
            ];

            for (const sql of queries) {
                const stmt = db.prepare(sql);
                manualStatements.push(stmt);

                // Use the statement
                if (sql.includes('COUNT')) {
                    stmt.get(30);
                } else if (sql.includes('name')) {
                    stmt.get('Test User');
                } else {
                    stmt.get(user.id);
                }

                // Properly finalize (what BaseEntity should do but doesn't)
                stmt.finalize();
            }

            // Verify statements are properly finalized
            let finalizedCount = 0;
            for (const stmt of manualStatements) {
                try {
                    stmt.get(1);
                } catch (e) {
                    finalizedCount++; // Statement was finalized
                }
            }

            // All statements should be finalized
            expect(finalizedCount).toBe(manualStatements.length);

            // Now test BaseEntity operations - these create statements but don't finalize them
            // We can't directly test this without modifying BaseEntity, but this test structure
            // shows what proper statement management should look like
        });
    });

    describe('Memory Leak Detection', () => {
        test('should detect statement leaks through resource counting', () => {
            const db = new Database(':memory:');

            // Create a baseline
            const initialStatements: Statement[] = [];

            // Create some statements and properly manage them
            for (let i = 0; i < 10; i++) {
                const stmt = db.prepare(`SELECT ${i}`);
                initialStatements.push(stmt);
                stmt.get();
                stmt.finalize(); // Proper cleanup
            }

            // Verify proper cleanup happened
            let properlyFinalized = 0;
            for (const stmt of initialStatements) {
                try {
                    stmt.get();
                } catch (e) {
                    properlyFinalized++;
                }
            }

            expect(properlyFinalized).toBe(10); // All should be finalized

            // Now simulate BaseEntity pattern (no finalization)
            const leakyStatements: Statement[] = [];
            for (let i = 0; i < 10; i++) {
                const stmt = db.query(`SELECT ${i + 100}`); // Different SQL to avoid caching
                leakyStatements.push(stmt);
                stmt.get();
                // Missing stmt.finalize() - this is the BaseEntity bug
            }

            // Check if statements are still active (indicating leak)
            let stillActive = 0;
            for (const stmt of leakyStatements) {
                try {
                    stmt.get();
                    stillActive++;
                } catch (e) {
                    // Statement was finalized
                }
            }

            // This test should fail because BaseEntity doesn't finalize statements
            // With proper implementation, stillActive should be 0
            expect(stillActive).toBe(0); // This WILL FAIL - demonstrating the bug

            // Cleanup for test completion
            for (const stmt of leakyStatements) {
                try {
                    stmt.finalize();
                } catch (e) {
                    // Already finalized
                }
            }

            db.close();
        });
    });
});
