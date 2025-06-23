import { Database } from 'bun:sqlite';
import { DataSource } from '../../src';
import { NullLogger } from '../../src';

import type { DbLogger, EntityConstructor, SQLQueryBindings } from '../../src';
import { resetGlobalMetadata } from './test-utils';

export interface TestDataSourceOptions {
    entities: EntityConstructor[];
    logger?: DbLogger;
    database?: string;
    /**
     * Whether to clear global metadata before creating the DataSource.
     * Defaults to false to preserve existing behavior. Set to true to enable
     * test isolation (fixes issue #44).
     */
    clearMetadata?: boolean;
}

export interface TestDataSourceResult {
    dataSource: DataSource;
    testDbPath: string;
    cleanup: () => Promise<void>;
}

/**
 * Creates an isolated test DataSource with a unique SQLite database file.
 * Optionally provides test isolation by clearing global metadata (fixes issue #44).
 *
 * Note: When clearMetadata is true, this function clears global metadata. Since decorators
 * run at class definition time and cannot be re-executed, this means only entities defined
 * AFTER calling this function will be available in the DataSource. This is intentional
 * behavior to provide test isolation.
 */
export async function createTestDataSource(options: TestDataSourceOptions): Promise<TestDataSourceResult> {
    // Clear global metadata only if explicitly requested (issue #44 fix)
    if (options.clearMetadata === true) {
        resetGlobalMetadata();
    }

    // Use in-memory database for tests (much faster and no file cleanup needed)
    const testDbPath = options.database || ':memory:';

    const dataSource = new DataSource({
        database: testDbPath,
        entities: options.entities,
        logger: options.logger || new NullLogger(),
    });

    // Initialize the DataSource
    await dataSource.initialize();

    // Cleanup function to destroy DataSource (no file removal needed for in-memory DB)
    const cleanup = async () => {
        try {
            await dataSource.destroy();
        } catch (error) {
            console.warn('Error destroying DataSource:', error);
        }

        // Clear metadata after test only if it was requested
        if (options.clearMetadata === true) {
            resetGlobalMetadata();
        }
    };

    return {
        dataSource,
        testDbPath,
        cleanup,
    };
}

/**
 * Creates a raw SQLite database for low-level testing
 */
export function createTestDatabase(dbPath?: string): { db: Database; cleanup: () => void } {
    const testDbPath = dbPath || ':memory:';
    const db = new Database(testDbPath);

    const cleanup = () => {
        try {
            db.close();
        } catch (error) {
            console.warn('Error closing database:', error);
        }
        // No file removal needed for in-memory database
    };

    return { db, cleanup };
}

/**
 * Clears all data from test database entities
 */
export async function clearTestData(
    entities: Array<{ deleteAll: (conditions: Record<string, SQLQueryBindings>) => Promise<unknown> }>
): Promise<void> {
    for (const Entity of entities) {
        try {
            await Entity.deleteAll({});
        } catch (error) {
            // Ignore errors (table might not exist yet)
        }
    }
}

/**
 * Creates an isolated test DataSource specifically for testing issue #44 fixes.
 * This function demonstrates proper test isolation patterns.
 *
 * @param entities - Array of entity constructors
 * @param testFn - Test function that receives the DataSource
 * @returns Promise that resolves with the test function result
 *
 * @example
 * ```typescript
 * test('should isolate entities properly', async () => {
 *     await withIsolatedDataSource([User, Post], async (dataSource) => {
 *         await dataSource.runMigrations();
 *         // Only User and Post tables exist in this DataSource
 *         const user = User.build({ name: 'Test' });
 *         await user.save();
 *     });
 * });
 * ```
 */
export async function withIsolatedDataSource<T>(
    entities: EntityConstructor[],
    testFn: (dataSource: DataSource) => Promise<T>
): Promise<T> {
    const testDS = await createTestDataSource({
        entities,
        clearMetadata: true, // Ensure isolation
    });

    try {
        return await testFn(testDS.dataSource);
    } finally {
        await testDS.cleanup();
    }
}
