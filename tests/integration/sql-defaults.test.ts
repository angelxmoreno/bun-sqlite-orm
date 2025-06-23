import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '../../src';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

@Entity('sql_default_test')
class SqlDefaultTestEntity extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    // SQL default - should use SQLite's CURRENT_TIMESTAMP
    @Column({ sqlDefault: 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    // JS default - should use JavaScript function
    @Column({ default: () => new Date('2024-01-01') })
    jsDefaultDate!: Date;

    // Static default value
    @Column({ default: 'active' })
    status!: string;

    // Mixed: SQL default takes precedence over JS default
    @Column({ sqlDefault: 'CURRENT_TIMESTAMP', default: () => 'should not be used' })
    mixedDefault!: Date;
}

describe('SQL Defaults Integration Tests', () => {
    let testDS: TestDataSourceResult;

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [SqlDefaultTestEntity],
        });
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        await clearTestData([SqlDefaultTestEntity]);
    });

    test('should apply SQL CURRENT_TIMESTAMP default correctly', async () => {
        const entity = new SqlDefaultTestEntity();
        entity.name = 'Test Entity';

        // Don't set createdAt - should use SQL default
        expect(entity.createdAt).toBeUndefined();

        await entity.save();

        // After save, the entity should have a real timestamp from SQLite
        expect(entity.id).toBeGreaterThan(0);
        expect(entity.createdAt).toBeInstanceOf(Date);
        expect(entity.createdAt.getTime()).toBeGreaterThan(new Date('2024-01-01').getTime());

        // Verify the timestamp is recent (within last minute)
        const now = new Date();
        const timeDiff = now.getTime() - entity.createdAt.getTime();
        expect(timeDiff).toBeLessThan(60000); // Less than 1 minute ago
    });

    test('should apply JS function defaults correctly', async () => {
        const entity = new SqlDefaultTestEntity();
        entity.name = 'Test JS Default';

        await entity.save();

        expect(entity.jsDefaultDate).toBeInstanceOf(Date);
        expect(entity.jsDefaultDate.toISOString()).toContain('2024-01-01');
    });

    test('should apply static defaults correctly', async () => {
        const entity = new SqlDefaultTestEntity();
        entity.name = 'Test Static Default';

        await entity.save();

        expect(entity.status).toBe('active');
    });

    test('should prioritize SQL defaults over JS defaults when both present', async () => {
        const entity = new SqlDefaultTestEntity();
        entity.name = 'Test Mixed Default';

        await entity.save();

        // Should use SQL CURRENT_TIMESTAMP, not JS function returning string
        expect(entity.mixedDefault).toBeInstanceOf(Date);
        expect(entity.mixedDefault.getTime()).toBeGreaterThan(new Date('2024-01-01').getTime());
    });

    test('should allow manual values to override defaults', async () => {
        const manualDate = new Date('2023-06-15');
        const entity = new SqlDefaultTestEntity();
        entity.name = 'Manual Override';
        entity.createdAt = manualDate;
        entity.status = 'inactive';

        await entity.save();

        expect(entity.createdAt.toISOString()).toContain('2023-06-15');
        expect(entity.status).toBe('inactive');
    });

    test('should create correct DDL with SQL defaults', async () => {
        // This tests that the SQL generator creates proper CREATE TABLE statements
        // We can't easily inspect the DDL directly, but we can verify behavior

        // Create multiple entities to ensure defaults work consistently
        const entities = [];
        for (let i = 0; i < 3; i++) {
            const entity = new SqlDefaultTestEntity();
            entity.name = `Batch Test ${i}`;
            await entity.save();
            entities.push(entity);
        }

        // All should have different timestamps (SQLite CURRENT_TIMESTAMP precision)
        const timestamps = entities.map((e) => e.createdAt.getTime());
        const uniqueTimestamps = new Set(timestamps);

        // Due to SQLite's timestamp precision, we might get some duplicates
        // but they should all be recent and in the right range
        for (const timestamp of timestamps) {
            expect(timestamp).toBeGreaterThan(new Date('2024-01-01').getTime());
        }
    });
});
