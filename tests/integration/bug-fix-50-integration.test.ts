import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { Column, Entity, PrimaryGeneratedColumn } from '../../src/decorators';
import { BaseEntity } from '../../src/entity';
import type { EntityConstructor } from '../../src/types';
import { type TestDataSourceResult, clearTestData, createTestDataSource } from '../helpers/test-datasource';

// Test entities defined only within test scope to avoid global pollution
// This follows the pattern from docs/testing-refactoring.md

describe('Bug Fix #50: Base Entity without @Entity decorator (Integration Tests)', () => {
    let testDS: TestDataSourceResult;

    // Define test entities in describe scope to prevent global pollution
    class TestBaseEntity extends BaseEntity {
        @PrimaryGeneratedColumn('int')
        id!: number;

        @Column({ type: 'text' })
        name!: string;
    }

    @Entity('test_explicit_table')
    class TestExplicitEntity extends BaseEntity {
        @PrimaryGeneratedColumn('int')
        id!: number;

        @Column({ type: 'text' })
        name!: string;

        @Column({ type: 'text' })
        description!: string;
    }

    beforeAll(async () => {
        // Use only explicit entities for DataSource - this is the key test
        testDS = await createTestDataSource({
            entities: [TestBaseEntity, TestExplicitEntity] as EntityConstructor[],
        });
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        await clearTestData([TestExplicitEntity]);
    });

    test('should only create tables for explicitly registered entities in DataSource', async () => {
        const db = testDS.dataSource.getDatabase();

        // Check which tables were created
        const tables = db
            .query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `)
            .all() as Array<{ name: string }>;

        const tableNames = tables.map((t) => t.name);

        // Only explicitly registered entities should have tables
        expect(tableNames).toContain('test_explicit_table'); // TestExplicitEntity has @Entity
        expect(tableNames).not.toContain('testbaseentity'); // TestBaseEntity lacks @Entity - should NOT create table

        // Verify we can use the explicit entity normally
        const entity = TestExplicitEntity.build({
            name: 'Test Name',
            description: 'Test Description',
        });

        await entity.save();
        expect(entity.id).toBeDefined();

        const found = await TestExplicitEntity.get(entity.id);
        expect(found.name).toBe('Test Name');
        expect(found.description).toBe('Test Description');
    });

    test('should demonstrate the fix prevents unwanted table creation', async () => {
        // This test verifies the core issue described in #50 is resolved

        const db = testDS.dataSource.getDatabase();

        // Before the fix, TestBaseEntity (without @Entity) would create a table
        // After the fix, only explicit entities should create tables

        // Verify the base entity (auto-registered) did NOT create a table
        const checkBaseTable = db
            .query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name = 'testbaseentity'
        `)
            .get();

        expect(checkBaseTable).toBeNull(); // Should not exist

        // Verify the explicit entity DID create a table
        const checkExplicitTable = db
            .query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name = 'test_explicit_table'
        `)
            .get();

        expect(checkExplicitTable).toBeDefined(); // Should exist
        expect((checkExplicitTable as { name: string }).name).toBe('test_explicit_table');
    });
});
