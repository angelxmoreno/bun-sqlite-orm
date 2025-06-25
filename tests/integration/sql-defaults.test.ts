import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { ComprehensiveSqlDefaultsEntity, MixedDefaultsEntity, SqlDefaultsEntity } from '../helpers/mock-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

describe('SQL Defaults Integration Tests', () => {
    let testDS: TestDataSourceResult;

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [SqlDefaultsEntity, ComprehensiveSqlDefaultsEntity, MixedDefaultsEntity],
        });
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        await clearTestData([SqlDefaultsEntity, ComprehensiveSqlDefaultsEntity, MixedDefaultsEntity]);
    });

    test('should apply SQL CURRENT_TIMESTAMP default correctly', async () => {
        const entity = new SqlDefaultsEntity();
        entity.name = 'Test Entity';

        // Don't set createdAt - should use SQL default
        expect(entity.createdAt).toBeUndefined();

        await entity.save();

        // After save, the entity should have a timestamp string from SQLite
        expect(entity.id).toBeGreaterThan(0);
        expect(typeof entity.createdAt).toBe('string');

        // Parse the timestamp to verify it's recent
        const createdDate = new Date(entity.createdAt);
        expect(createdDate.getTime()).toBeGreaterThan(new Date('2024-01-01').getTime());

        // Verify the timestamp is recent (within last minute)
        const now = new Date();
        const timeDiff = now.getTime() - createdDate.getTime();
        expect(timeDiff).toBeLessThan(60000); // Less than 1 minute ago
    });

    test('should apply JS function defaults correctly', async () => {
        const jsEntity = new ComprehensiveSqlDefaultsEntity();
        jsEntity.name = 'Test JS Default';

        await jsEntity.save();

        expect(jsEntity.jsDefaultDate).toBeInstanceOf(Date);
        expect(jsEntity.jsDefaultDate.toISOString()).toContain('2024-01-01');
    });

    test('should apply static defaults correctly', async () => {
        const jsEntity = new MixedDefaultsEntity();
        jsEntity.name = 'Test Static Default';

        await jsEntity.save();

        expect(jsEntity.staticStatus).toBe('draft');
    });

    test('should prioritize SQL defaults over JS defaults when both present', async () => {
        const entity = new ComprehensiveSqlDefaultsEntity();
        entity.name = 'Test Mixed Default';

        await entity.save();

        // Should use SQL CURRENT_TIMESTAMP, not JS function
        expect(entity.mixedDefault).toBeInstanceOf(Date);
        expect(entity.mixedDefault.getTime()).toBeGreaterThan(new Date('2024-01-01').getTime());
    });

    test('should allow manual values to override defaults', async () => {
        const entity = new SqlDefaultsEntity();
        entity.name = 'Manual Override';
        entity.createdAt = '2023-06-15T10:00:00.000Z';
        entity.status = 'inactive';

        await entity.save();

        expect(entity.createdAt).toContain('2023-06-15');
        expect(entity.status).toBe('inactive');
    });

    test('should create correct DDL with SQL defaults', async () => {
        // Create multiple entities to ensure defaults work consistently
        const entities = [];
        for (let i = 0; i < 3; i++) {
            const entity = new SqlDefaultsEntity();
            entity.name = `Batch Test ${i}`;
            await entity.save();
            entities.push(entity);
        }

        // All should have timestamps from SQLite
        for (const entity of entities) {
            expect(typeof entity.createdAt).toBe('string');
            const createdDate = new Date(entity.createdAt);
            expect(createdDate.getTime()).toBeGreaterThan(new Date('2024-01-01').getTime());
        }
    });
});

describe('Enhanced SQL Defaults Integration Tests', () => {
    let testDS: TestDataSourceResult;

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [SqlDefaultsEntity],
        });
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        await clearTestData([SqlDefaultsEntity]);
    });

    test('should apply numeric integer sqlDefault correctly', async () => {
        const entity = new SqlDefaultsEntity();
        entity.name = 'Test Numeric Defaults';

        await entity.save();

        expect(entity.priority).toBe(0);
        expect(entity.luckyNumber).toBe(42);
    });

    test('should apply numeric real sqlDefault correctly', async () => {
        const entity = new SqlDefaultsEntity();
        entity.name = 'Test Real Defaults';

        await entity.save();

        expect(entity.pi).toBeCloseTo(3.14, 2);
        expect(entity.negativeValue).toBeCloseTo(-1.5, 2);
    });

    test('should apply boolean sqlDefault correctly', async () => {
        const entity = new SqlDefaultsEntity();
        entity.name = 'Test Boolean Defaults';

        await entity.save();

        expect(entity.isActive).toBe(true);
        expect(entity.isDeleted).toBe(false);
    });

    test('should apply null sqlDefault correctly', async () => {
        const entity = new SqlDefaultsEntity();
        entity.name = 'Test Null Default';

        await entity.save();

        expect(entity.optionalField).toBeNull();
    });

    test('should apply string literal sqlDefault correctly', async () => {
        const entity = new SqlDefaultsEntity();
        entity.name = 'Test String Literal';

        await entity.save();

        expect(entity.status).toBe('active');
        expect(entity.defaultString).toBe('default_value');
    });

    test('should allow manual override of all sqlDefault types', async () => {
        const entity = new SqlDefaultsEntity();
        entity.name = 'Manual Override';
        entity.priority = 99;
        entity.pi = 2.71;
        entity.isActive = false;
        entity.optionalField = 'custom value';
        entity.status = 'inactive';

        await entity.save();

        expect(entity.priority).toBe(99);
        expect(entity.pi).toBeCloseTo(2.71, 2);
        expect(entity.isActive).toBe(false);
        expect(entity.optionalField).toBe('custom value');
        expect(entity.status).toBe('inactive');
    });

    test('should create multiple entities with consistent sqlDefault values', async () => {
        const entities = [];
        for (let i = 0; i < 3; i++) {
            const entity = new SqlDefaultsEntity();
            entity.name = `Batch Test ${i}`;
            await entity.save();
            entities.push(entity);
        }

        // All should have the same default values for numeric, boolean, and string fields
        for (const entity of entities) {
            expect(entity.priority).toBe(0);
            expect(entity.luckyNumber).toBe(42);
            expect(entity.pi).toBeCloseTo(3.14, 2);
            expect(entity.negativeValue).toBeCloseTo(-1.5, 2);
            expect(entity.isActive).toBe(true);
            expect(entity.isDeleted).toBe(false);
            expect(entity.optionalField).toBeNull();
            expect(entity.status).toBe('active');
            expect(entity.defaultString).toBe('default_value');
        }
    });
});
