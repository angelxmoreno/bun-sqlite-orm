import { afterEach, beforeEach } from 'bun:test';
import type { DataSource } from '../../src/data-source';
import type { EntityConstructor } from '../../src/types';
import { mockMetadataContainer, resetAllMocks, setupMockEnvironment } from './mock-infrastructure';
import type { MockMetadataContainer } from './mock-infrastructure';
import { clearTestData, createTestDataSource } from './test-datasource';
import type { TestDataSourceResult } from './test-datasource';

/**
 * Base test classes following docs/testing-refactoring.md guidelines.
 *
 * These abstract classes provide standardized patterns for unit and integration tests,
 * ensuring consistent setup/teardown and separation of concerns.
 */

/**
 * Abstract base class for unit tests that should use mocks instead of real database operations.
 * Follows the prescribed unit test pattern from docs/testing-refactoring.md.
 */
export abstract class UnitTestBase {
    protected mockContainer!: MockMetadataContainer;
    protected mockEnvironment!: ReturnType<typeof setupMockEnvironment>;

    constructor() {
        beforeEach(() => {
            this.setupMocks();
        });

        afterEach(() => {
            this.teardownMocks();
        });
    }

    /**
     * Sets up mock infrastructure for unit tests.
     * Override this method to add test-specific mock setup.
     */
    protected setupMocks(): void {
        this.mockEnvironment = setupMockEnvironment();
        this.mockContainer = this.mockEnvironment.metadataContainer;
    }

    /**
     * Tears down mocks after each test.
     * Override this method to add test-specific cleanup.
     */
    protected teardownMocks(): void {
        resetAllMocks();
    }

    /**
     * Helper method to get the mock metadata container.
     */
    protected getMockContainer(): MockMetadataContainer {
        return this.mockContainer;
    }

    /**
     * Helper method to get the full mock environment.
     */
    protected getMockEnvironment() {
        return this.mockEnvironment;
    }
}

/**
 * Abstract base class for integration tests that use real database operations.
 * Follows the prescribed integration test pattern from docs/testing-refactoring.md.
 */
export abstract class IntegrationTestBase {
    protected dataSource!: DataSource;
    protected testDS!: TestDataSourceResult;
    protected entities: EntityConstructor[];

    constructor(entities: EntityConstructor[]) {
        this.entities = entities;
    }

    /**
     * Sets up the test database with the specified entities.
     * Call this in beforeAll() of your integration test.
     */
    protected async setupDatabase(entities?: EntityConstructor[]): Promise<void> {
        const entitiesToUse = entities || this.entities;

        this.testDS = await createTestDataSource({
            entities: entitiesToUse,
        });

        this.dataSource = this.testDS.dataSource;
        await this.dataSource.runMigrations();
    }

    /**
     * Tears down the test database.
     * Call this in afterAll() of your integration test.
     */
    protected async teardownDatabase(): Promise<void> {
        if (this.testDS) {
            await this.testDS.cleanup();
        }
    }

    /**
     * Clears test data between tests.
     * Call this in beforeEach() of your integration test.
     */
    protected async clearTestData(entities?: EntityConstructor[]): Promise<void> {
        const entitiesToClear = entities || this.entities;
        // Convert EntityConstructor[] to entities with deleteAll method for clearTestData
        const entitiesWithMethods = entitiesToClear as unknown as Array<{
            deleteAll: (conditions: Record<string, unknown>) => Promise<unknown>;
        }>;
        await clearTestData(entitiesWithMethods);
    }

    /**
     * Gets the test DataSource.
     */
    protected getDataSource(): DataSource {
        return this.dataSource;
    }

    /**
     * Gets the test database instance.
     */
    protected getDatabase() {
        return this.dataSource.getDatabase();
    }

    /**
     * Gets the metadata container.
     */
    protected getMetadataContainer() {
        return this.dataSource.getMetadataContainer();
    }

    /**
     * Gets the SQL generator.
     */
    protected getSqlGenerator() {
        return this.dataSource.getSqlGenerator();
    }
}

/**
 * Factory function to create a unit test base class instance.
 * This is useful when you can't use inheritance.
 */
export function createUnitTestSetup() {
    const testSetup = new (class extends UnitTestBase {
        // Make protected methods public for factory
        public getMockContainer() {
            return super.getMockContainer();
        }
        public getMockEnvironment() {
            return super.getMockEnvironment();
        }
    })();
    return {
        getMockContainer: () => testSetup.getMockContainer(),
        getMockEnvironment: () => testSetup.getMockEnvironment(),
    };
}

/**
 * Factory function to create an integration test base class instance.
 * This is useful when you can't use inheritance.
 */
export function createIntegrationTestSetup(entities: EntityConstructor[]) {
    const testSetup = new (class extends IntegrationTestBase {
        constructor() {
            super(entities);
        }
        // Make protected methods public for factory
        public async setupDatabase(ents?: EntityConstructor[]) {
            return super.setupDatabase(ents);
        }
        public async teardownDatabase() {
            return super.teardownDatabase();
        }
        public async clearTestData(ents?: EntityConstructor[]) {
            return super.clearTestData(ents);
        }
        public getDataSource() {
            return super.getDataSource();
        }
        public getDatabase() {
            return super.getDatabase();
        }
        public getMetadataContainer() {
            return super.getMetadataContainer();
        }
        public getSqlGenerator() {
            return super.getSqlGenerator();
        }
    })();

    return {
        setupDatabase: (ents?: EntityConstructor[]) => testSetup.setupDatabase(ents),
        teardownDatabase: () => testSetup.teardownDatabase(),
        clearTestData: (ents?: EntityConstructor[]) => testSetup.clearTestData(ents),
        getDataSource: () => testSetup.getDataSource(),
        getDatabase: () => testSetup.getDatabase(),
        getMetadataContainer: () => testSetup.getMetadataContainer(),
        getSqlGenerator: () => testSetup.getSqlGenerator(),
    };
}
