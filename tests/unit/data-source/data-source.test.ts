import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { DataSource } from '../../../src/data-source';
import { NullLogger } from '../../../src/logger';
import type { DataSourceOptions, EntityConstructor } from '../../../src/types';

// Mock entities for testing
class MockEntity {
    id!: number;
    name!: string;
}

class AnotherMockEntity {
    uuid!: string;
    title!: string;
}

describe('DataSource', () => {
    let mockDatabase: {
        close: ReturnType<typeof mock>;
        exec: ReturnType<typeof mock>;
        query: ReturnType<typeof mock>;
    };
    let mockOptions: DataSourceOptions;
    let dataSource: DataSource;

    beforeEach(() => {
        // Mock Database
        mockDatabase = {
            close: mock(),
            exec: mock(),
            query: mock(),
        };

        // Mock Database constructor
        (global as Record<string, unknown>).Database = mock(() => mockDatabase);

        mockOptions = {
            database: './test.db',
            entities: [MockEntity as EntityConstructor, AnotherMockEntity as EntityConstructor],
            logger: new NullLogger(),
        };

        dataSource = new DataSource(mockOptions);
    });

    describe('Constructor', () => {
        test('should create DataSource with options', () => {
            expect(dataSource).toBeDefined();
            expect(dataSource).toBeInstanceOf(DataSource);
        });

        test('should not be initialized initially', () => {
            expect(() => dataSource.getDatabase()).toThrow('DataSource must be initialized before accessing database');
        });
    });

    describe('getDatabase', () => {
        test('should throw error when not initialized', () => {
            expect(() => dataSource.getDatabase()).toThrow('DataSource must be initialized before accessing database');
        });
    });

    describe('getMetadataContainer', () => {
        test('should throw error when not initialized', () => {
            expect(() => dataSource.getMetadataContainer()).toThrow(
                'DataSource must be initialized before accessing metadata'
            );
        });
    });

    describe('runMigrations', () => {
        test('should throw error when not initialized', () => {
            expect(dataSource.runMigrations()).rejects.toThrow(
                'DataSource must be initialized before running migrations'
            );
        });
    });

    describe('destroy', () => {
        test('should handle destroy when not initialized', () => {
            // Should not throw
            expect(dataSource.destroy()).resolves.toBeUndefined();
        });
    });

    describe('Configuration Validation', () => {
        test('should accept valid configuration options', () => {
            const validOptions: DataSourceOptions = {
                database: './test.db',
                entities: [MockEntity as EntityConstructor],
                logger: mockOptions.logger,
            };

            expect(() => new DataSource(validOptions)).not.toThrow();
        });

        test('should handle options with migrations', () => {
            const optionsWithMigrations: DataSourceOptions = {
                database: './test.db',
                entities: [MockEntity as EntityConstructor],
                migrations: ['./migrations/*.ts'],
                logger: mockOptions.logger,
            };

            expect(() => new DataSource(optionsWithMigrations)).not.toThrow();
        });

        test('should handle minimal options', () => {
            const minimalOptions: DataSourceOptions = {
                database: './test.db',
                entities: [],
            };

            expect(() => new DataSource(minimalOptions)).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle minimal configuration', () => {
            const minimalOptions: DataSourceOptions = {
                database: ':memory:',
                entities: [],
            };

            expect(() => new DataSource(minimalOptions)).not.toThrow();
        });
    });
});
