import { mock } from 'bun:test';
import type { ColumnMetadata, EntityConstructor, EntityMetadata, IndexMetadata } from '../../src/types';

/**
 * Mock infrastructure for unit tests following docs/testing-refactoring.md guidelines.
 *
 * These utilities provide standardized mocking patterns for unit tests,
 * separating them from integration tests that use real entities.
 */

export interface MockMetadataContainer {
    hasEntity: ReturnType<typeof mock>;
    getTableName: ReturnType<typeof mock>;
    getColumns: ReturnType<typeof mock>;
    getPrimaryColumns: ReturnType<typeof mock>;
    getIndexes: ReturnType<typeof mock>;
    getEntityMetadata: ReturnType<typeof mock>;
    addEntity: ReturnType<typeof mock>;
    addColumn: ReturnType<typeof mock>;
    addIndex: ReturnType<typeof mock>;
    clear: ReturnType<typeof mock>;
}

export interface MockBaseEntity {
    get: ReturnType<typeof mock>;
    find: ReturnType<typeof mock>;
    findFirst: ReturnType<typeof mock>;
    count: ReturnType<typeof mock>;
    exists: ReturnType<typeof mock>;
    deleteAll: ReturnType<typeof mock>;
    updateAll: ReturnType<typeof mock>;
    build: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    save: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    remove: ReturnType<typeof mock>;
    reload: ReturnType<typeof mock>;
    isNew: ReturnType<typeof mock>;
    isChanged: ReturnType<typeof mock>;
    getChanges: ReturnType<typeof mock>;
}

export interface MockDatabase {
    query: ReturnType<typeof mock>;
    prepare: ReturnType<typeof mock>;
    exec: ReturnType<typeof mock>;
    close: ReturnType<typeof mock>;
}

export interface MockDataSource {
    initialize: ReturnType<typeof mock>;
    destroy: ReturnType<typeof mock>;
    runMigrations: ReturnType<typeof mock>;
    getDatabase: ReturnType<typeof mock>;
    getMetadataContainer: ReturnType<typeof mock>;
    getSqlGenerator: ReturnType<typeof mock>;
}

/**
 * Creates a mock MetadataContainer with default behaviors for unit testing.
 * Following the prescribed unit test pattern from docs/testing-refactoring.md.
 */
export function mockMetadataContainer(): MockMetadataContainer {
    const container = {
        hasEntity: mock(() => true),
        getTableName: mock(() => 'test_table'),
        getColumns: mock(() => new Map<string, ColumnMetadata>()),
        getPrimaryColumns: mock(() => []),
        getIndexes: mock(() => []),
        getEntityMetadata: mock(
            () =>
                ({
                    target: class TestEntity {},
                    tableName: 'test_table',
                    columns: new Map(),
                    primaryColumns: [],
                    indexes: [],
                    isExplicitlyRegistered: false,
                }) as EntityMetadata
        ),
        addEntity: mock(),
        addColumn: mock(),
        addIndex: mock(),
        clear: mock(),
    };

    return container;
}

/**
 * Creates a mock BaseEntity with default behaviors for unit testing.
 */
export function mockBaseEntity(): MockBaseEntity {
    const entity = {
        get: mock(() => ({ id: 1, name: 'Test Entity' })),
        find: mock(() => [{ id: 1, name: 'Test Entity' }]),
        findFirst: mock(() => ({ id: 1, name: 'Test Entity' })),
        count: mock(() => 1),
        exists: mock(() => true),
        deleteAll: mock(() => 1),
        updateAll: mock(() => 1),
        build: mock(() => ({ id: undefined, name: 'New Entity' })),
        create: mock(() => ({ id: 1, name: 'Created Entity' })),
        save: mock(),
        update: mock(),
        remove: mock(),
        reload: mock(),
        isNew: mock(() => false),
        isChanged: mock(() => false),
        getChanges: mock(() => ({})),
    };

    return entity;
}

/**
 * Creates a mock Database with default behaviors for unit testing.
 */
export function mockDatabase(): MockDatabase {
    const createMockStatement = () => ({
        get: mock(() => ({ id: 1, name: 'Test' })),
        all: mock(() => [{ id: 1, name: 'Test' }]),
        run: mock(() => ({ changes: 1, lastInsertRowid: 1 })),
        finalize: mock(),
    });

    const database = {
        query: mock(() => createMockStatement()),
        prepare: mock(() => createMockStatement()),
        exec: mock(),
        close: mock(),
    };

    return database;
}

/**
 * Creates a mock DataSource with default behaviors for unit testing.
 */
export function mockDataSource(): MockDataSource {
    const dataSource = {
        initialize: mock(),
        destroy: mock(),
        runMigrations: mock(),
        getDatabase: mock(() => mockDatabase()),
        getMetadataContainer: mock(() => mockMetadataContainer()),
        getSqlGenerator: mock(() => ({
            generateCreateTable: mock(() => 'CREATE TABLE test (id INTEGER)'),
            generateIndexes: mock(() => ['CREATE INDEX idx_test ON test(id)']),
        })),
    };

    return dataSource;
}

/**
 * Creates mock column metadata for testing.
 */
export function createMockColumnMetadata(overrides: Partial<ColumnMetadata> = {}): ColumnMetadata {
    return {
        propertyName: 'testColumn',
        type: 'text',
        nullable: false,
        unique: false,
        isPrimary: false,
        isGenerated: false,
        generationStrategy: undefined,
        default: undefined,
        sqlDefault: undefined,
        ...overrides,
    };
}

/**
 * Creates mock index metadata for testing.
 */
export function createMockIndexMetadata(overrides: Partial<IndexMetadata> = {}): IndexMetadata {
    return {
        name: 'idx_test',
        columns: ['testColumn'],
        unique: false,
        ...overrides,
    };
}

/**
 * Resets all mocks to their original state.
 * Should be called in afterEach() following the prescribed unit test pattern.
 */
export function resetAllMocks(): void {
    // Note: Bun's mock.restore() would be called here if available
    // For now, this serves as a placeholder for the prescribed pattern
}

/**
 * Sets up a standard mock environment for unit tests.
 * Returns commonly used mocks in a single object.
 */
export function setupMockEnvironment() {
    return {
        metadataContainer: mockMetadataContainer(),
        baseEntity: mockBaseEntity(),
        database: mockDatabase(),
        dataSource: mockDataSource(),
    };
}

/**
 * Helper to create a mock entity constructor for testing.
 */
export function createMockEntityConstructor(name = 'TestEntity'): EntityConstructor {
    const MockEntity = class extends Object {
        static get name() {
            return name;
        }
    };

    return MockEntity as unknown as EntityConstructor;
}
