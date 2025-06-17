import type { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { BaseEntity } from '../../../src';
import { DatabaseError, EntityNotFoundError } from '../../../src';
import type { DbLogger } from '../../../src';
import { typeBunContainer } from '../../../src/container';
import type { MetadataContainer } from '../../../src/metadata';
import type { QueryBuilder } from '../../../src/sql';

// Mock entity for testing
class TestEntity extends BaseEntity {
    id!: number;
    name!: string;
    email!: string;
}

// Mock another entity
class AnotherEntity extends BaseEntity {
    uuid!: string;
    title!: string;
}

describe('BaseEntity', () => {
    type MockDb = {
        query: ReturnType<typeof mock>;
        prepare: ReturnType<typeof mock>;
        setStatementReturn: (method: 'get' | 'all' | 'run', returnValue: unknown) => void;
        setStatementThrow: (method: 'get' | 'all' | 'run', error: Error) => void;
    };

    let mockDb: MockDb;
    let mockMetadataContainer: {
        getTableName: ReturnType<typeof mock>;
        getColumns: ReturnType<typeof mock>;
        getPrimaryColumns: ReturnType<typeof mock>;
    };
    let mockQueryBuilder: {
        select: ReturnType<typeof mock>;
        insert: ReturnType<typeof mock>;
        update: ReturnType<typeof mock>;
        delete: ReturnType<typeof mock>;
        count: ReturnType<typeof mock>;
    };
    let mockLogger: {
        debug: ReturnType<typeof mock>;
        info: ReturnType<typeof mock>;
        warn: ReturnType<typeof mock>;
        error: ReturnType<typeof mock>;
    };
    let originalResolve: typeof typeBunContainer.resolve;

    beforeEach(() => {
        // Store original resolve method
        originalResolve = typeBunContainer.resolve;
        // Mock Database
        const mockQuery = mock(() => ({
            get: mock(),
            all: mock(),
            run: mock(() => ({ changes: 1, lastInsertRowid: 1 })),
        }));

        // Create a reusable mock statement factory
        const createMockStatement = (overrides = {}) => ({
            get: mock(() => ({ id: 1, name: 'Test', email: 'test@example.com' })),
            all: mock(() => [{ id: 1, name: 'Test', email: 'test@example.com' }]),
            run: mock(() => ({ changes: 1, lastInsertRowid: 1 })),
            finalize: mock(),
            ...overrides,
        });

        const mockStatement = createMockStatement();
        const mockPrepare = mock(() => mockStatement);

        // Helper functions to easily mock different statement behaviors
        const setStatementReturn = (method: 'get' | 'all' | 'run', returnValue: unknown) => {
            const newStatement = createMockStatement({
                [method]: mock(() => returnValue),
            });
            mockPrepare.mockReturnValue(newStatement);
        };

        const setStatementThrow = (method: 'get' | 'all' | 'run', error: Error) => {
            const newStatement = createMockStatement({
                [method]: mock(() => {
                    throw error;
                }),
            });
            mockPrepare.mockReturnValue(newStatement);
        };

        mockDb = {
            query: mockQuery,
            prepare: mockPrepare,
            setStatementReturn,
            setStatementThrow,
        };

        // Mock MetadataContainer
        mockMetadataContainer = {
            getTableName: mock(() => 'test_entities'),
            getColumns: mock(
                () =>
                    new Map([
                        [
                            'id',
                            {
                                propertyName: 'id',
                                type: 'integer',
                                isPrimary: true,
                                isGenerated: true,
                                generationStrategy: 'increment',
                            },
                        ],
                        ['name', { propertyName: 'name', type: 'text', isPrimary: false, isGenerated: false }],
                        ['email', { propertyName: 'email', type: 'text', isPrimary: false, isGenerated: false }],
                    ])
            ),
            getPrimaryColumns: mock(() => [
                {
                    propertyName: 'id',
                    type: 'integer',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'increment',
                },
            ]),
        };

        // Mock QueryBuilder
        mockQueryBuilder = {
            select: mock(() => ({ sql: 'SELECT * FROM test_entities WHERE id = ?', params: [1] })),
            insert: mock(() => ({
                sql: 'INSERT INTO test_entities (name, email) VALUES (?, ?)',
                params: ['test', 'test@example.com'],
            })),
            update: mock(() => ({ sql: 'UPDATE test_entities SET name = ? WHERE id = ?', params: ['updated', 1] })),
            delete: mock(() => ({ sql: 'DELETE FROM test_entities WHERE id = ?', params: [1] })),
            count: mock(() => ({ sql: 'SELECT COUNT(*) as count FROM test_entities', params: [] })),
        };

        // Mock Logger
        mockLogger = {
            debug: mock(),
            info: mock(),
            warn: mock(),
            error: mock(),
        };

        // Setup container mocks and override typeBunContainer.resolve
        typeBunContainer.resolve = mock((token: string) => {
            switch (token) {
                case 'DatabaseConnection':
                    return mockDb as unknown as Database;
                case 'MetadataContainer':
                    return mockMetadataContainer as unknown as MetadataContainer;
                case 'QueryBuilder':
                    return mockQueryBuilder as unknown as QueryBuilder;
                case 'DbLogger':
                    return mockLogger as unknown as DbLogger;
                case 'SqlGenerator':
                    return { generateCreateTable: mock() };
                default:
                    throw new Error(`Unknown token: ${token}`);
            }
        }) as typeof typeBunContainer.resolve;

        // Mock validation to always pass
        const originalValidate = (BaseEntity.prototype as unknown as { _validate: () => Promise<void> })._validate;
        (BaseEntity.prototype as unknown as { _validate: () => Promise<void> })._validate = mock(async () => {
            // validation always passes in tests
        });
    });

    afterEach(() => {
        // Restore original resolve method
        typeBunContainer.resolve = originalResolve;
    });

    describe('Static Methods', () => {
        describe('build', () => {
            test('should build entity without saving', () => {
                const entity = TestEntity.build({ name: 'Test User', email: 'test@example.com' });

                expect(entity).toBeInstanceOf(TestEntity);
                expect(entity.name).toBe('Test User');
                expect(entity.email).toBe('test@example.com');
                expect(entity.isNew()).toBe(true);
            });
        });

        describe('get', () => {
            test('should retrieve entity by ID', async () => {
                mockDb.setStatementReturn('get', { id: 1, name: 'Test User', email: 'test@example.com' });

                const entity = await TestEntity.get(1);

                expect(entity).toBeInstanceOf(TestEntity);
                expect(entity.id).toBe(1);
                expect(entity.name).toBe('Test User');
                expect(entity.isNew()).toBe(false);
            });

            test('should throw EntityNotFoundError when entity not found', async () => {
                mockDb.setStatementReturn('get', null);

                expect(TestEntity.get(999)).rejects.toThrow(EntityNotFoundError);
            });

            test('should throw error when no primary key defined', async () => {
                mockMetadataContainer.getPrimaryColumns.mockReturnValue([]);

                expect(TestEntity.get(1)).rejects.toThrow('No primary key defined for entity TestEntity');
            });

            test('should throw error for composite primary keys', async () => {
                const compositePrimaryColumns = [
                    { propertyName: 'key1', generationStrategy: undefined },
                    { propertyName: 'key2', generationStrategy: undefined },
                ];
                mockMetadataContainer.getPrimaryColumns.mockReturnValue(compositePrimaryColumns);

                expect(TestEntity.get(1)).rejects.toThrow(
                    'Entity TestEntity has 2 primary keys. The get() method currently only supports entities with exactly one primary key. Use find() with conditions for composite key entities.'
                );
            });

            test('should throw DatabaseError on database failure', async () => {
                mockDb.setStatementThrow('get', new Error('Database connection failed'));

                expect(TestEntity.get(1)).rejects.toThrow(DatabaseError);
            });
        });

        describe('find', () => {
            test('should find entities with conditions', async () => {
                mockDb.setStatementReturn('all', [
                    { id: 1, name: 'User 1', email: 'user1@example.com' },
                    { id: 2, name: 'User 2', email: 'user2@example.com' },
                ]);

                const entities = await TestEntity.find({ name: 'User' });

                expect(entities).toHaveLength(2);
                expect(entities[0]).toBeInstanceOf(TestEntity);
                expect(entities[0].name).toBe('User 1');
                expect(entities[1].name).toBe('User 2');
            });

            test('should return empty array when no entities found', async () => {
                mockDb.setStatementReturn('all', []);

                const entities = await TestEntity.find({ name: 'NonExistent' });

                expect(entities).toHaveLength(0);
            });

            test('should throw DatabaseError on database failure', async () => {
                mockDb.setStatementThrow('all', new Error('Query failed'));

                expect(TestEntity.find({ name: 'Test' })).rejects.toThrow(DatabaseError);
            });
        });

        describe('findFirst', () => {
            test('should return first entity when found', async () => {
                mockDb.setStatementReturn('get', { id: 1, name: 'User 1', email: 'user1@example.com' });

                const entity = await TestEntity.findFirst({ name: 'User 1' });

                expect(entity).toBeInstanceOf(TestEntity);
                expect(entity?.name).toBe('User 1');
            });

            test('should return null when no entity found', async () => {
                mockDb.setStatementReturn('get', undefined);

                const entity = await TestEntity.findFirst({ name: 'NonExistent' });

                expect(entity).toBeNull();
            });
        });

        describe('count', () => {
            test('should count entities without conditions', async () => {
                mockDb.setStatementReturn('get', { count: 5 });

                const count = await TestEntity.count();

                expect(count).toBe(5);
            });

            test('should count entities with conditions', async () => {
                mockDb.setStatementReturn('get', { count: 2 });

                const count = await TestEntity.count({ name: 'User' });

                expect(count).toBe(2);
            });

            test('should throw DatabaseError on database failure', async () => {
                mockDb.setStatementThrow('get', new Error('Count failed'));

                expect(TestEntity.count()).rejects.toThrow(DatabaseError);
            });
        });

        describe('exists', () => {
            test('should return true when entities exist', async () => {
                mockDb.setStatementReturn('get', { count: 1 });

                const exists = await TestEntity.exists({ name: 'User' });

                expect(exists).toBe(true);
            });

            test('should return false when no entities exist', async () => {
                mockDb.setStatementReturn('get', { count: 0 });

                const exists = await TestEntity.exists({ name: 'NonExistent' });

                expect(exists).toBe(false);
            });
        });

        describe('deleteAll', () => {
            test('should delete entities and return count', async () => {
                mockDb.setStatementReturn('run', { changes: 3 });

                const deletedCount = await TestEntity.deleteAll({ name: 'ToDelete' });

                expect(deletedCount).toBe(3);
            });

            test('should throw DatabaseError on database failure', async () => {
                mockDb.setStatementThrow('run', new Error('Delete failed'));

                expect(TestEntity.deleteAll({ name: 'Test' })).rejects.toThrow(DatabaseError);
            });
        });

        describe('updateAll', () => {
            test('should update entities and return count', async () => {
                mockDb.setStatementReturn('run', { changes: 2 });

                const updatedCount = await TestEntity.updateAll({ name: 'Updated' }, { id: 1 });

                expect(updatedCount).toBe(2);
            });

            test('should throw DatabaseError on database failure', async () => {
                mockDb.setStatementThrow('run', new Error('Update failed'));

                expect(TestEntity.updateAll({ name: 'Test' }, { id: 1 })).rejects.toThrow(DatabaseError);
            });
        });
    });

    describe('Instance Methods', () => {
        let entity: TestEntity;

        beforeEach(() => {
            entity = TestEntity.build({ name: 'Test User', email: 'test@example.com' });
        });

        describe('save', () => {
            test('should insert new entity', async () => {
                mockDb.setStatementReturn('run', { changes: 1, lastInsertRowid: 1 });

                await entity.save();

                expect(entity.isNew()).toBe(false);
                expect(entity.id).toBe(1);
                expect(mockQueryBuilder.insert).toHaveBeenCalled();
                expect(mockLogger.info).toHaveBeenCalledWith('Created new TestEntity entity');
            });

            test('should update existing entity', async () => {
                // Make entity appear as saved
                entity.id = 1;
                (entity as unknown as { _isNew: boolean })._isNew = false;
                (entity as unknown as { _captureOriginalValues: () => void })._captureOriginalValues();

                mockDb.setStatementReturn('run', { changes: 1 });

                entity.name = 'Updated Name';
                await entity.save();

                expect(mockQueryBuilder.update).toHaveBeenCalled();
                expect(mockLogger.info).toHaveBeenCalledWith('Updated TestEntity entity');
            });

            test('should generate UUID for UUID primary keys', async () => {
                // Mock entity with UUID primary key
                mockMetadataContainer.getColumns.mockReturnValue(
                    new Map([
                        [
                            'uuid',
                            {
                                propertyName: 'uuid',
                                type: 'text',
                                isPrimary: true,
                                isGenerated: true,
                                generationStrategy: 'uuid',
                            },
                        ],
                        ['title', { propertyName: 'title', type: 'text', isPrimary: false, isGenerated: false }],
                    ])
                );
                mockMetadataContainer.getPrimaryColumns.mockReturnValue([
                    {
                        propertyName: 'uuid',
                        type: 'text',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid',
                    },
                ]);

                const uuidEntity = AnotherEntity.build({ title: 'Test Title' });

                mockDb.setStatementReturn('run', { changes: 1 });

                await uuidEntity.save();

                expect(uuidEntity.uuid).toBeDefined();
                expect(typeof uuidEntity.uuid).toBe('string');
                expect(uuidEntity.uuid.length).toBe(36); // UUID length
            });

            test('should handle function defaults', async () => {
                const mockDefaultFn = mock(() => 'default-value');
                mockMetadataContainer.getColumns.mockReturnValue(
                    new Map([
                        [
                            'id',
                            {
                                propertyName: 'id',
                                type: 'integer',
                                isPrimary: true,
                                isGenerated: true,
                                generationStrategy: 'increment',
                            },
                        ],
                        [
                            'name',
                            {
                                propertyName: 'name',
                                type: 'text',
                                isPrimary: false,
                                isGenerated: false,
                                default: mockDefaultFn,
                            },
                        ],
                    ])
                );

                const entityWithDefaults = TestEntity.build({});

                mockDb.setStatementReturn('run', { changes: 1, lastInsertRowid: 1 });

                await entityWithDefaults.save();

                expect(mockDefaultFn).toHaveBeenCalled();
                expect(entityWithDefaults.name).toBe('default-value');
            });

            test('should throw DatabaseError on insert failure', async () => {
                mockDb.setStatementThrow('run', new Error('Insert failed'));

                expect(entity.save()).rejects.toThrow(DatabaseError);
                expect(mockLogger.error).toHaveBeenCalled();
            });
        });

        describe('update', () => {
            test('should update entity properties and save', async () => {
                entity.id = 1;
                (entity as unknown as { _isNew: boolean })._isNew = false;

                mockDb.setStatementReturn('run', { changes: 1 });

                await entity.update({ name: 'Updated Name', email: 'updated@example.com' });

                expect(entity.name).toBe('Updated Name');
                expect(entity.email).toBe('updated@example.com');
                expect(mockQueryBuilder.update).toHaveBeenCalled();
            });
        });

        describe('remove', () => {
            test('should remove existing entity', async () => {
                entity.id = 1;
                (entity as unknown as { _isNew: boolean })._isNew = false;

                mockDb.setStatementReturn('run', { changes: 1 });

                await entity.remove();

                expect(entity.isNew()).toBe(true);
            });

            test('should throw error when removing unsaved entity', async () => {
                expect(entity.remove()).rejects.toThrow('Cannot remove unsaved entity');
            });

            test('should throw DatabaseError on delete failure', async () => {
                entity.id = 1;
                (entity as unknown as { _isNew: boolean })._isNew = false;

                mockDb.setStatementThrow('run', new Error('Delete failed'));

                expect(entity.remove()).rejects.toThrow(DatabaseError);
            });
        });

        describe('reload', () => {
            test('should reload entity from database', async () => {
                entity.id = 1;
                (entity as unknown as { _isNew: boolean })._isNew = false;

                mockDb.setStatementReturn('get', {
                    id: 1,
                    name: 'Reloaded Name',
                    email: 'reloaded@example.com',
                });

                await entity.reload();

                expect(entity.name).toBe('Reloaded Name');
                expect(entity.email).toBe('reloaded@example.com');
            });

            test('should throw error when reloading unsaved entity', async () => {
                expect(entity.reload()).rejects.toThrow('Cannot reload unsaved entity');
            });

            test('should throw error when no primary key defined', async () => {
                entity.id = 1;
                (entity as unknown as { _isNew: boolean })._isNew = false;
                mockMetadataContainer.getPrimaryColumns.mockReturnValue([]);

                expect(entity.reload()).rejects.toThrow('No primary key defined for entity TestEntity');
            });

            test('should throw error for composite primary keys', async () => {
                entity.id = 1;
                (entity as unknown as { _isNew: boolean })._isNew = false;
                const compositePrimaryColumns = [
                    { propertyName: 'key1', generationStrategy: undefined },
                    { propertyName: 'key2', generationStrategy: undefined },
                ];
                mockMetadataContainer.getPrimaryColumns.mockReturnValue(compositePrimaryColumns);

                expect(entity.reload()).rejects.toThrow(
                    'Entity TestEntity has 2 primary keys. The reload() method currently only supports entities with exactly one primary key.'
                );
            });
        });

        describe('isNew', () => {
            test('should return true for new entity', () => {
                expect(entity.isNew()).toBe(true);
            });

            test('should return false for saved entity', () => {
                (entity as unknown as { _isNew: boolean })._isNew = false;
                expect(entity.isNew()).toBe(false);
            });
        });

        describe('isChanged', () => {
            test('should return false for unchanged entity', () => {
                (entity as unknown as { _captureOriginalValues: () => void })._captureOriginalValues();
                expect(entity.isChanged()).toBe(false);
            });

            test('should return true for changed entity', () => {
                (entity as unknown as { _captureOriginalValues: () => void })._captureOriginalValues();
                entity.name = 'Changed Name';
                expect(entity.isChanged()).toBe(true);
            });
        });

        describe('getChanges', () => {
            test('should return empty object for unchanged entity', () => {
                (entity as unknown as { _captureOriginalValues: () => void })._captureOriginalValues();
                const changes = entity.getChanges();
                expect(changes).toEqual({});
            });

            test('should return changes for modified entity', () => {
                (entity as unknown as { _captureOriginalValues: () => void })._captureOriginalValues();
                entity.name = 'Changed Name';

                const changes = entity.getChanges();
                expect(changes).toEqual({
                    name: { from: 'Test User', to: 'Changed Name' },
                });
            });
        });
    });

    describe('Private Methods (via public interface)', () => {
        describe('_loadFromRow', () => {
            test('should load entity data from database row', () => {
                const entity = new TestEntity();
                const row = { id: 1, name: 'Loaded User', email: 'loaded@example.com' };
                (entity as unknown as { _loadFromRow: (row: Record<string, unknown>) => void })._loadFromRow(row);

                expect(entity.id).toBe(1);
                expect(entity.name).toBe('Loaded User');
                expect(entity.email).toBe('loaded@example.com');
                expect(entity.isNew()).toBe(false);
            });

            test('should handle Date conversion', () => {
                const entity = new TestEntity();
                const dateValue = '2024-01-01T00:00:00.000Z';

                // Mock Reflect.getMetadata to return Date for a property
                const originalGetMetadata = Reflect.getMetadata;
                Reflect.getMetadata = mock((key: unknown, target: object, property?: string | symbol) => {
                    if (key === 'design:type' && property === 'createdAt') {
                        return Date;
                    }
                    if (property !== undefined) {
                        return originalGetMetadata?.(key, target, property);
                    }
                    return originalGetMetadata?.(key, target);
                }) as typeof Reflect.getMetadata;

                mockMetadataContainer.getColumns.mockReturnValue(
                    new Map([['createdAt', { propertyName: 'createdAt', type: 'text' }]])
                );

                const row = { createdAt: dateValue };
                (entity as unknown as { _loadFromRow: (row: Record<string, unknown>) => void })._loadFromRow(row);

                expect((entity as unknown as { createdAt: Date }).createdAt).toBeInstanceOf(Date);
                expect((entity as unknown as { createdAt: Date }).createdAt.toISOString()).toBe(dateValue);

                // Restore original
                Reflect.getMetadata = originalGetMetadata;
            });
        });
    });

    describe('Error Handling', () => {
        test('should preserve EntityNotFoundError in get method', async () => {
            mockDb.setStatementReturn('get', null);

            try {
                await TestEntity.get(999);
            } catch (error: unknown) {
                expect(error).toBeInstanceOf(EntityNotFoundError);
                expect((error as Error).message).toContain('TestEntity not found');
            }
        });

        test('should wrap database errors in DatabaseError', async () => {
            const originalError = new Error('Connection failed');
            mockDb.setStatementThrow('get', originalError);

            try {
                await TestEntity.get(1);
            } catch (error: unknown) {
                expect(error).toBeInstanceOf(DatabaseError);
                expect((error as DatabaseError).originalError).toBe(originalError);
            }
        });
    });
});
