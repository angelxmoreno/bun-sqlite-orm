import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '../../../src';
import { typeBunContainer } from '../../../src/container';
import { ValidationError } from '../../../src/errors';

// Test entity for initialization validation tests
@Entity('test_initialization_entity')
class TestInitializationEntity extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column()
    value!: number;
}

describe('BaseEntity Initialization Validation', () => {
    let originalServices: Array<{ token: string; isRegistered: boolean; instance?: unknown }> = [];

    beforeEach(() => {
        // Store original state of container services
        originalServices = [];
        const servicesToCheck = ['DatabaseConnection', 'MetadataContainer', 'DbLogger', 'QueryBuilder'];

        for (const service of servicesToCheck) {
            const isRegistered = typeBunContainer.isRegistered(service);
            let instance: unknown;
            if (isRegistered) {
                try {
                    instance = typeBunContainer.resolve(service);
                } catch {
                    // Service is registered but can't be resolved, that's ok
                }
            }
            originalServices.push({ token: service, isRegistered, instance });
        }

        // Clear all services to ensure we start with uninitialized state
        for (const service of servicesToCheck) {
            if (typeBunContainer.isRegistered(service)) {
                typeBunContainer.clearInstances();
                break; // clearInstances clears all, so we only need to call it once
            }
        }
    });

    afterEach(() => {
        // Restore original services state
        typeBunContainer.clearInstances();
        for (const { token, isRegistered, instance } of originalServices) {
            if (isRegistered && instance) {
                typeBunContainer.register(token, { useValue: instance });
            }
        }
    });

    describe('Static Methods - Database Operations Before Initialization', () => {
        test('get() should throw initialization error', async () => {
            await expect(TestInitializationEntity.get(1)).rejects.toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });

        test('find() should throw initialization error', async () => {
            await expect(TestInitializationEntity.find({ name: 'test' })).rejects.toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });

        test('findFirst() should throw initialization error', async () => {
            await expect(TestInitializationEntity.findFirst({ name: 'test' })).rejects.toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });

        test('count() should throw initialization error', async () => {
            await expect(TestInitializationEntity.count()).rejects.toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });

        test('exists() should throw initialization error', async () => {
            await expect(TestInitializationEntity.exists({ name: 'test' })).rejects.toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });

        test('deleteAll() should throw initialization error', async () => {
            await expect(TestInitializationEntity.deleteAll({ name: 'test' })).rejects.toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });

        test('updateAll() should throw initialization error', async () => {
            await expect(TestInitializationEntity.updateAll({ value: 42 }, { name: 'test' })).rejects.toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });

        test('create() should throw initialization error', async () => {
            await expect(TestInitializationEntity.create({ name: 'test', value: 42 })).rejects.toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });
    });

    describe('Instance Methods - Database Operations Before Initialization', () => {
        let entity: TestInitializationEntity;

        beforeEach(() => {
            entity = new TestInitializationEntity();
            entity.name = 'test';
            entity.value = 42;
        });

        test('save() should throw initialization error for new entity', async () => {
            await expect(entity.save()).rejects.toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });

        test('update() should throw initialization error', async () => {
            await expect(entity.update({ name: 'updated' })).rejects.toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });

        test('remove() should throw appropriate error for new entity', async () => {
            // New entities should throw a different error before the initialization check
            await expect(entity.remove()).rejects.toThrow('Cannot remove unsaved entity');
        });

        test('reload() should throw appropriate error for new entity', async () => {
            // New entities should throw a different error before the initialization check
            await expect(entity.reload()).rejects.toThrow('Cannot reload unsaved entity');
        });

        test('isChanged() should throw initialization error', () => {
            expect(() => entity.isChanged()).toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });

        test('getChanges() should throw initialization error', () => {
            expect(() => entity.getChanges()).toThrow(
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
            );
        });
    });

    describe('Build Method - Should Work Without Initialization', () => {
        test('build() should work without DataSource initialization', () => {
            // build() should work because it doesn't perform database operations
            // It only creates an in-memory entity instance
            expect(() => {
                const entity = TestInitializationEntity.build({
                    name: 'test',
                    value: 42,
                });
                expect(entity).toBeInstanceOf(TestInitializationEntity);
                expect(entity.name).toBe('test');
                expect(entity.value).toBe(42);
                expect(entity.isNew()).toBe(true); // build() creates a new entity
            }).not.toThrow();
        });
    });

    describe('Error Message Consistency', () => {
        test('all database operations should have consistent error message', async () => {
            const expectedMessage =
                'DataSource must be initialized before database operations. Call DataSource.initialize() first.';

            // Test all methods that should throw the same error
            const operations = [
                () => TestInitializationEntity.get(1),
                () => TestInitializationEntity.find({}),
                () => TestInitializationEntity.findFirst({}),
                () => TestInitializationEntity.count(),
                () => TestInitializationEntity.exists({ name: 'test' }),
                () => TestInitializationEntity.deleteAll({ name: 'test' }),
                () => TestInitializationEntity.updateAll({ value: 1 }, { name: 'test' }),
                () => TestInitializationEntity.create({ name: 'test', value: 1 }),
            ];

            for (const operation of operations) {
                await expect(operation()).rejects.toThrow(expectedMessage);
            }

            // Test instance methods
            const entity = new TestInitializationEntity();
            entity.name = 'test';
            entity.value = 42;

            const instanceOperations = [
                () => entity.save(),
                () => entity.update({ name: 'updated' }),
                () => entity.isChanged(),
                () => entity.getChanges(),
            ];

            for (const operation of instanceOperations) {
                if (operation.name.includes('save') || operation.name.includes('update')) {
                    await expect(operation()).rejects.toThrow(expectedMessage);
                } else {
                    expect(operation).toThrow(expectedMessage);
                }
            }
        });
    });

    describe('Constructor and Non-Database Methods', () => {
        test('constructor should work without initialization', () => {
            expect(() => {
                const entity = new TestInitializationEntity();
                expect(entity).toBeInstanceOf(TestInitializationEntity);
                expect(entity.isNew()).toBe(true);
            }).not.toThrow();
        });

        test('isNew() should work without initialization', () => {
            const entity = new TestInitializationEntity();
            expect(() => entity.isNew()).not.toThrow();
            expect(entity.isNew()).toBe(true);
        });

        test('property assignment should work without initialization', () => {
            expect(() => {
                const entity = new TestInitializationEntity();
                entity.name = 'test';
                entity.value = 42;
                expect(entity.name).toBe('test');
                expect(entity.value).toBe(42);
            }).not.toThrow();
        });
    });
});
