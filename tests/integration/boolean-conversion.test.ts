import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { BooleanTestEntity } from '../helpers/mock-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

describe('Boolean Type Conversion', () => {
    let testDS: TestDataSourceResult;

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [BooleanTestEntity],
        });
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        await clearTestData([BooleanTestEntity]);
    });

    describe('Boolean Storage and Retrieval', () => {
        test('should store and retrieve boolean values correctly', async () => {
            // Create entity with boolean values
            const entity = BooleanTestEntity.build({
                name: 'Test Entity',
                isActive: true,
                isPublished: false,
                isDeleted: false,
            });

            await entity.save();
            expect(entity.id).toBeDefined();

            // Retrieve the entity from database
            const retrieved = await BooleanTestEntity.get(entity.id);

            // These assertions should pass but currently fail due to the bug
            expect(typeof retrieved.isActive).toBe('boolean');
            expect(retrieved.isActive).toBe(true);
            expect(retrieved.isActive).not.toBe(1); // Should be boolean true, not number 1

            expect(typeof retrieved.isPublished).toBe('boolean');
            expect(retrieved.isPublished).toBe(false);
            expect(retrieved.isPublished).not.toBe(0); // Should be boolean false, not number 0

            expect(typeof retrieved.isDeleted).toBe('boolean');
            expect(retrieved.isDeleted).toBe(false);
            expect(retrieved.isDeleted).not.toBe(0); // Should be boolean false, not number 0
        });

        test('should handle undefined/null boolean values', async () => {
            const entity = BooleanTestEntity.build({
                name: 'Test Entity 2',
                isActive: true,
                // isPublished is undefined (nullable)
                isDeleted: false,
            });

            await entity.save();
            const retrieved = await BooleanTestEntity.get(entity.id);

            expect(typeof retrieved.isActive).toBe('boolean');
            expect(retrieved.isActive).toBe(true);

            // Nullable boolean should remain undefined
            expect(retrieved.isPublished).toBeUndefined();

            expect(typeof retrieved.isDeleted).toBe('boolean');
            expect(retrieved.isDeleted).toBe(false);
        });

        test('should handle boolean logic operations correctly', async () => {
            const entity = BooleanTestEntity.build({
                name: 'Logic Test',
                isActive: true,
                isPublished: false,
                isDeleted: false,
            });

            await entity.save();
            const retrieved = await BooleanTestEntity.get(entity.id);

            // These logical operations should work with proper boolean types
            expect(retrieved.isActive && !retrieved.isDeleted).toBe(true);
            expect(retrieved.isPublished || retrieved.isActive).toBe(true);
            expect(!retrieved.isPublished).toBe(true);

            // This should fail with the current bug (1 == true is true, but 1 === true is false)
            if (retrieved.isActive === true) {
                expect(true).toBe(true); // This condition should be met
            } else {
                expect.unreachable('isActive should be strictly equal to true');
            }
        });

        test('should find entities by boolean conditions', async () => {
            // Create multiple entities with different boolean states
            await BooleanTestEntity.create({
                name: 'Active Entity',
                isActive: true,
                isPublished: true,
                isDeleted: false,
            });

            await BooleanTestEntity.create({
                name: 'Inactive Entity',
                isActive: false,
                isPublished: false,
                isDeleted: false,
            });

            // Find active entities
            const activeEntities = await BooleanTestEntity.find({ isActive: true });
            expect(activeEntities).toHaveLength(1);
            expect(activeEntities[0].name).toBe('Active Entity');

            // Verify the retrieved boolean is actually a boolean
            expect(typeof activeEntities[0].isActive).toBe('boolean');
            expect(activeEntities[0].isActive).toBe(true);
        });
    });
});
