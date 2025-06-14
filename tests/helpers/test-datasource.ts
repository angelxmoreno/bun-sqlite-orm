import { Database } from 'bun:sqlite';
import { DataSource } from '../../src/data-source';
import { NullLogger } from '../../src/logger';
import type { DbLogger, EntityConstructor } from '../../src/types';

export interface TestDataSourceOptions {
    entities: EntityConstructor[];
    logger?: DbLogger;
    database?: string;
}

export interface TestDataSourceResult {
    dataSource: DataSource;
    testDbPath: string;
    cleanup: () => Promise<void>;
}

/**
 * Creates an isolated test DataSource with a unique SQLite database file
 */
export async function createTestDataSource(options: TestDataSourceOptions): Promise<TestDataSourceResult> {
    // Generate unique database path for this test
    const testDbPath = options.database || `./tests/test-${Date.now()}-${Math.random().toString(36).substring(2)}.db`;

    const dataSource = new DataSource({
        database: testDbPath,
        entities: options.entities,
        logger: options.logger || new NullLogger(),
    });

    // Initialize the DataSource
    await dataSource.initialize();

    // Cleanup function to destroy DataSource and remove test database
    const cleanup = async () => {
        try {
            await dataSource.destroy();
        } catch (error) {
            console.warn('Error destroying DataSource:', error);
        }

        // Remove test database file
        try {
            const fs = await import('node:fs');
            if (fs.existsSync(testDbPath)) {
                fs.unlinkSync(testDbPath);
            }
        } catch (error) {
            console.warn('Error removing test database file:', error);
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
    const testDbPath = dbPath || `./tests/test-raw-${Date.now()}-${Math.random().toString(36).substring(2)}.db`;
    const db = new Database(testDbPath);

    const cleanup = () => {
        try {
            db.close();
        } catch (error) {
            console.warn('Error closing database:', error);
        }

        try {
            const fs = require('node:fs');
            if (fs.existsSync(testDbPath)) {
                fs.unlinkSync(testDbPath);
            }
        } catch (error) {
            console.warn('Error removing database file:', error);
        }
    };

    return { db, cleanup };
}

/**
 * Clears all data from test database entities
 */
export async function clearTestData(
    entities: Array<{ deleteAll: (conditions: Record<string, unknown>) => Promise<unknown> }>
): Promise<void> {
    for (const Entity of entities) {
        try {
            await Entity.deleteAll({});
        } catch (error) {
            // Ignore errors (table might not exist yet)
        }
    }
}
