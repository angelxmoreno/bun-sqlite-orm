import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '../../src';
import { clearTestData, createTestDataSource } from '../helpers';
import type { TestDataSourceResult } from '../helpers';

describe('JSON Columns Integration Tests', () => {
    let testDS: TestDataSourceResult;

    // Test entity with JSON columns
    @Entity('json_test')
    class JsonTestEntity extends BaseEntity {
        @PrimaryGeneratedColumn('int')
        id!: number;

        @Column({ type: 'json' })
        simpleObject!: { name: string; age: number };

        @Column({ type: 'json', nullable: true })
        optionalArray?: string[] | null;

        @Column({ type: 'json' })
        complexData!: {
            user: { id: number; profile: { name: string; settings: Record<string, unknown> } };
            metadata: { tags: string[]; created: string };
        };

        @Column()
        regularText!: string;
    }

    // Test entity with auto-inferred JSON types
    @Entity('auto_json_test')
    class AutoJsonTestEntity extends BaseEntity {
        @PrimaryGeneratedColumn('int')
        id!: number;

        // Should auto-infer as JSON type for Object/Array types
        @Column()
        objectField!: { key: string; value: number };

        @Column()
        arrayField!: number[];

        @Column({ nullable: true })
        optionalObject?: { optional: boolean };
    }

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [JsonTestEntity, AutoJsonTestEntity],
        });
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        await clearTestData([JsonTestEntity, AutoJsonTestEntity]);
    });

    describe('Basic JSON Storage and Retrieval', () => {
        test('should store and retrieve simple JSON objects', async () => {
            const testData = {
                simpleObject: { name: 'John Doe', age: 30 },
                complexData: {
                    user: {
                        id: 123,
                        profile: {
                            name: 'John',
                            settings: { theme: 'dark', notifications: true },
                        },
                    },
                    metadata: {
                        tags: ['admin', 'user'],
                        created: '2023-01-01T00:00:00Z',
                    },
                },
                regularText: 'Plain text field',
            };

            const entity = await JsonTestEntity.create(testData);
            expect(entity.id).toBeGreaterThan(0);

            // Verify data structure is preserved
            expect(entity.simpleObject).toEqual({ name: 'John Doe', age: 30 });
            expect(entity.complexData.user.profile.settings.theme).toBe('dark');
            expect(entity.complexData.metadata.tags).toEqual(['admin', 'user']);

            // Reload from database to ensure persistence
            const reloaded = await JsonTestEntity.get(entity.id);
            expect(reloaded.simpleObject).toEqual(testData.simpleObject);
            expect(reloaded.complexData).toEqual(testData.complexData);
            expect(reloaded.regularText).toBe('Plain text field');
        });

        test('should handle arrays in JSON columns', async () => {
            const entity = await JsonTestEntity.create({
                simpleObject: { name: 'Test', age: 25 },
                optionalArray: ['item1', 'item2', 'item3'],
                complexData: {
                    user: { id: 1, profile: { name: 'Test', settings: {} } },
                    metadata: { tags: ['test'], created: '2023-01-01' },
                },
                regularText: 'Test',
            });

            expect(entity.optionalArray).toEqual(['item1', 'item2', 'item3']);

            const reloaded = await JsonTestEntity.get(entity.id);
            expect(reloaded.optionalArray).toEqual(['item1', 'item2', 'item3']);
        });

        test('should handle null values in nullable JSON columns', async () => {
            const entity = await JsonTestEntity.create({
                simpleObject: { name: 'Test', age: 25 },
                optionalArray: null,
                complexData: {
                    user: { id: 1, profile: { name: 'Test', settings: {} } },
                    metadata: { tags: [], created: '2023-01-01' },
                },
                regularText: 'Test',
            });

            expect(entity.optionalArray).toBeNull();

            const reloaded = await JsonTestEntity.get(entity.id);
            expect(reloaded.optionalArray).toBeNull();
        });
    });

    describe('Auto-inferred JSON Types', () => {
        test('should auto-infer JSON type for Object/Array TypeScript types', async () => {
            const testData = {
                objectField: { key: 'test', value: 42 },
                arrayField: [1, 2, 3, 4, 5],
                optionalObject: { optional: true },
            };

            const entity = await AutoJsonTestEntity.create(testData);

            expect(entity.objectField).toEqual({ key: 'test', value: 42 });
            expect(entity.arrayField).toEqual([1, 2, 3, 4, 5]);
            expect(entity.optionalObject).toEqual({ optional: true });

            // Verify persistence
            const reloaded = await AutoJsonTestEntity.get(entity.id);
            expect(reloaded.objectField).toEqual(testData.objectField);
            expect(reloaded.arrayField).toEqual(testData.arrayField);
            expect(reloaded.optionalObject).toEqual(testData.optionalObject);
        });

        test('should handle undefined values in optional JSON fields', async () => {
            const entity = await AutoJsonTestEntity.create({
                objectField: { key: 'test', value: 100 },
                arrayField: [10, 20],
                // optionalObject is undefined
            });

            expect(entity.optionalObject).toBeUndefined();

            const reloaded = await AutoJsonTestEntity.get(entity.id);
            expect(reloaded.optionalObject).toBeUndefined();
        });
    });

    describe('JSON Column Updates', () => {
        test('should update JSON column values correctly', async () => {
            const entity = await JsonTestEntity.create({
                simpleObject: { name: 'Original', age: 20 },
                complexData: {
                    user: { id: 1, profile: { name: 'Original', settings: {} } },
                    metadata: { tags: ['old'], created: '2023-01-01' },
                },
                regularText: 'Original',
            });

            // Update JSON fields
            entity.simpleObject = { name: 'Updated', age: 30 };
            entity.complexData.metadata.tags = ['updated', 'new'];
            await entity.save();

            const reloaded = await JsonTestEntity.get(entity.id);
            expect(reloaded.simpleObject.name).toBe('Updated');
            expect(reloaded.simpleObject.age).toBe(30);
            expect(reloaded.complexData.metadata.tags).toEqual(['updated', 'new']);
        });

        test('should detect changes in JSON columns', async () => {
            const entity = await JsonTestEntity.create({
                simpleObject: { name: 'Test', age: 25 },
                complexData: {
                    user: { id: 1, profile: { name: 'Test', settings: {} } },
                    metadata: { tags: ['test'], created: '2023-01-01' },
                },
                regularText: 'Test',
            });

            expect(entity.isChanged()).toBe(false);

            // Modify JSON object
            entity.simpleObject.age = 26;
            entity.complexData.metadata.tags.push('modified');

            // Note: Deep object changes might not be detected unless the whole object is reassigned
            // This is expected behavior for reference-based change detection
            expect(entity.isChanged()).toBe(false);

            // Reassign the whole object to trigger change detection
            entity.simpleObject = { ...entity.simpleObject, age: 27 };
            expect(entity.isChanged()).toBe(true);
        });
    });

    describe('Query Operations with JSON Columns', () => {
        test('should find entities with specific JSON values', async () => {
            const entity1 = await JsonTestEntity.create({
                simpleObject: { name: 'Alice', age: 25 },
                complexData: {
                    user: { id: 1, profile: { name: 'Alice', settings: {} } },
                    metadata: { tags: ['user'], created: '2023-01-01' },
                },
                regularText: 'Alice',
            });

            const entity2 = await JsonTestEntity.create({
                simpleObject: { name: 'Bob', age: 30 },
                complexData: {
                    user: { id: 2, profile: { name: 'Bob', settings: {} } },
                    metadata: { tags: ['admin'], created: '2023-01-02' },
                },
                regularText: 'Bob',
            });

            // Find by regular text field (not JSON)
            const aliceEntities = await JsonTestEntity.find({ regularText: 'Alice' });
            expect(aliceEntities).toHaveLength(1);
            expect(aliceEntities[0].simpleObject.name).toBe('Alice');

            const bobEntities = await JsonTestEntity.find({ regularText: 'Bob' });
            expect(bobEntities).toHaveLength(1);
            expect(bobEntities[0].simpleObject.name).toBe('Bob');
        });
    });

    describe('Error Handling', () => {
        test('should create entities with valid JSON data', async () => {
            // This should work - valid JSON data
            const validEntity = await JsonTestEntity.create({
                simpleObject: { name: 'Valid', age: 25 },
                complexData: {
                    user: { id: 1, profile: { name: 'Valid', settings: {} } },
                    metadata: { tags: ['valid'], created: '2023-01-01' },
                },
                regularText: 'Valid',
            });

            expect(validEntity.simpleObject.name).toBe('Valid');
        });

        test('should handle invalid JSON data gracefully during creation', async () => {
            // Test with circular reference - should throw JSON serialization error
            const circularObj: Record<string, unknown> = { name: 'test' };
            circularObj.self = circularObj;

            await expect(
                JsonTestEntity.create({
                    simpleObject: circularObj as { name: string; age: number },
                    complexData: {
                        user: { id: 1, profile: { name: 'Test', settings: {} } },
                        metadata: { tags: ['test'], created: '2023-01-01' },
                    },
                    regularText: 'Test',
                })
            ).rejects.toThrow('JSON serialization error');

            // Test with non-serializable values (functions)
            const objWithFunction = {
                name: 'test',
                age: 25,
                fn: () => 'not serializable',
            };

            // Create entity with function - this should work during creation
            const entityWithFunction = await JsonTestEntity.create({
                simpleObject: objWithFunction as { name: string; age: number },
                complexData: {
                    user: { id: 1, profile: { name: 'Test', settings: {} } },
                    metadata: { tags: ['test'], created: '2023-01-01' },
                },
                regularText: 'Test',
            });

            // Reload from database - functions should be stripped during JSON round-trip
            const reloaded = await JsonTestEntity.get(entityWithFunction.id);
            expect(reloaded.simpleObject.name).toBe('test');
            expect(reloaded.simpleObject.age).toBe(25);
            expect((reloaded.simpleObject as Record<string, unknown>).fn).toBeUndefined();
        });

        test('should maintain data integrity with nested JSON structures', async () => {
            const complexData = {
                level1: {
                    level2: {
                        level3: {
                            value: 'deep nested value',
                            array: [
                                { id: 1, name: 'item1' },
                                { id: 2, name: 'item2' },
                            ],
                        },
                    },
                },
            };

            const entity = await JsonTestEntity.create({
                simpleObject: { name: 'Complex', age: 25 },
                complexData: {
                    user: { id: 1, profile: { name: 'Complex', settings: complexData } },
                    metadata: { tags: ['complex'], created: '2023-01-01' },
                },
                regularText: 'Complex',
            });

            const reloaded = await JsonTestEntity.get(entity.id);
            const settings = reloaded.complexData.user.profile.settings as typeof complexData;

            expect(settings.level1.level2.level3.value).toBe('deep nested value');
            expect(settings.level1.level2.level3.array).toHaveLength(2);
            expect(settings.level1.level2.level3.array[0].name).toBe('item1');
        });
    });

    describe('Performance and Large JSON Data', () => {
        test('should handle reasonably large JSON payloads', async () => {
            // Create a reasonably large JSON object
            const largeArray = Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                name: `Item ${i}`,
                data: `Data for item ${i}`,
                tags: [`tag${i}`, `category${i % 10}`],
            }));

            const entity = await JsonTestEntity.create({
                simpleObject: { name: 'Large Test', age: 25 },
                optionalArray: largeArray.map((item) => item.name),
                complexData: {
                    user: { id: 1, profile: { name: 'Large', settings: { items: largeArray } } },
                    metadata: { tags: ['large', 'performance'], created: '2023-01-01' },
                },
                regularText: 'Large data test',
            });

            expect(entity.optionalArray).toHaveLength(1000);

            const reloaded = await JsonTestEntity.get(entity.id);
            expect(reloaded.optionalArray).toHaveLength(1000);
            expect(reloaded.optionalArray?.[0]).toBe('Item 0');
            expect(reloaded.optionalArray?.[999]).toBe('Item 999');

            const settings = reloaded.complexData.user.profile.settings as { items: typeof largeArray };
            expect(settings.items).toHaveLength(1000);
            expect(settings.items[500].name).toBe('Item 500');
        });
    });
});
