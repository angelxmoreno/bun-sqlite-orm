import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import {
    CompositeIndexEntity,
    CustomIndexEntity,
    SimpleIndexEntity,
    UniqueIndexEntity,
} from '../helpers/mock-entities';
import { createTestDataSource, type TestDataSourceResult } from '../helpers/test-datasource';

describe('Column Indexing Integration Tests', () => {
    let testDS: TestDataSourceResult;

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [SimpleIndexEntity, CustomIndexEntity, UniqueIndexEntity, CompositeIndexEntity],
        });
        await testDS.dataSource.runMigrations(); // Creates tables and indexes
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    test('should create simple column indexes', async () => {
        const db = testDS.dataSource.getDatabase();

        // Check that indexes were created by querying SQLite system tables
        const indexes = db
            .query(`
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type = 'index' 
            AND tbl_name = 'simple_index_entity'
            AND name NOT LIKE 'sqlite_%'
        `)
            .all();

        // Extract index names
        const indexNames = indexes.map((idx) => (idx as { name: string }).name);

        // Column-level index with auto-generated name
        expect(indexNames).toContain('idx_simple_index_entity_email');

        // Property-level index with auto-generated name
        expect(indexNames).toContain('idx_simple_index_entity_phone');

        expect(indexes.length).toBeGreaterThanOrEqual(2);
    });

    test('should create composite indexes on class', async () => {
        const db = testDS.dataSource.getDatabase();

        const indexes = db
            .query(`
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type = 'index' 
            AND tbl_name = 'composite_index_entity'
            AND name NOT LIKE 'sqlite_%'
        `)
            .all();

        const indexNames = indexes.map((idx) => (idx as { name: string }).name);
        const indexSqls = indexes.map((idx) => (idx as { sql: string }).sql);

        // Check composite index names
        expect(indexNames).toContain('idx_full_name');
        expect(indexNames).toContain('idx_name_age');
        expect(indexNames).toContain('idx_unique_email_status');

        // Check that composite indexes reference multiple columns
        const fullNameIndex = indexSqls.find((sql) => sql?.includes('idx_full_name'));
        expect(fullNameIndex).toContain('firstName');
        expect(fullNameIndex).toContain('lastName');

        const nameAgeIndex = indexSqls.find((sql) => sql?.includes('idx_name_age'));
        expect(nameAgeIndex).toContain('firstName');
        expect(nameAgeIndex).toContain('lastName');
        expect(nameAgeIndex).toContain('age');

        // Check unique index
        const uniqueIndex = indexSqls.find((sql) => sql?.includes('idx_unique_email_status'));
        expect(uniqueIndex).toContain('UNIQUE');
        expect(uniqueIndex).toContain('email');
        expect(uniqueIndex).toContain('status');
    });

    test('should improve query performance with indexes', async () => {
        // Insert test data
        const users = [];
        for (let i = 0; i < 100; i++) {
            const user = new SimpleIndexEntity();
            user.name = `User ${i}`;
            user.email = `user${i}@example.com`;
            user.phone = `555-000${i.toString().padStart(2, '0')}`;
            user.address = `${i} Main Street`;
            await user.save();
            users.push(user);
        }

        // Test querying by indexed columns (should be fast)
        const foundByEmail = await SimpleIndexEntity.find({ email: 'user50@example.com' });
        expect(foundByEmail).toHaveLength(1);
        expect(foundByEmail[0].name).toBe('User 50');

        // Test composite index queries
        await testDS.dataSource.getDatabase().exec(`
            INSERT INTO composite_index_entity (firstName, lastName, age, email, status)
            VALUES 
                ('John', 'Doe', 30, 'john@example.com', 'active'),
                ('Jane', 'Smith', 25, 'jane@example.com', 'active'),
                ('John', 'Smith', 35, 'johnsmith@example.com', 'inactive')
        `);

        const compositeResults = testDS.dataSource
            .getDatabase()
            .query(`
            SELECT * FROM composite_index_entity 
            WHERE firstName = 'John' AND lastName = 'Doe'
        `)
            .all();

        expect(compositeResults).toHaveLength(1);
        expect((compositeResults[0] as { email: string }).email).toBe('john@example.com');
    });

    test('should handle unique index constraints', async () => {
        const db = testDS.dataSource.getDatabase();

        // First insert should work
        await db.exec(`
            INSERT INTO composite_index_entity (firstName, lastName, age, email, status)
            VALUES ('Test', 'User', 30, 'unique@test.com', 'active')
        `);

        // Second insert with same email+status should fail due to unique index
        expect(() => {
            db.exec(`
                INSERT INTO composite_index_entity (firstName, lastName, age, email, status)
                VALUES ('Another', 'User', 25, 'unique@test.com', 'active')
            `);
        }).toThrow();
    });

    test('should handle index creation edge cases', async () => {
        // Test that we can query the metadata container for index information
        const metadataContainer = testDS.dataSource.getMetadataContainer();

        const userIndexes = metadataContainer.getIndexes(SimpleIndexEntity);
        expect(userIndexes.length).toBeGreaterThan(0);

        // Check specific index properties
        const emailIndex = userIndexes.find((idx) => idx.columns.includes('email'));
        expect(emailIndex).toBeDefined();
        expect(emailIndex?.name).toBe('idx_simple_index_entity_email');
        expect(emailIndex?.unique).toBe(false);

        const compositeIndexes = metadataContainer.getIndexes(CompositeIndexEntity);
        expect(compositeIndexes.length).toBe(3);

        const uniqueIndex = compositeIndexes.find((idx) => idx.name === 'idx_unique_email_status');
        expect(uniqueIndex).toBeDefined();
        expect(uniqueIndex?.unique).toBe(true);
        expect(uniqueIndex?.columns).toEqual(['email', 'status']);
    });

    test('should generate correct SQL for indexes', async () => {
        const sqlGenerator = testDS.dataSource.getSqlGenerator();
        const metadataContainer = testDS.dataSource.getMetadataContainer();

        const userMetadata = metadataContainer.getEntityMetadata(SimpleIndexEntity);
        const compositeMetadata = metadataContainer.getEntityMetadata(CompositeIndexEntity);

        expect(userMetadata).toBeDefined();
        expect(compositeMetadata).toBeDefined();

        if (userMetadata) {
            const userIndexSql = sqlGenerator.generateIndexes(userMetadata);
            expect(userIndexSql.length).toBeGreaterThan(0);

            // Check for specific index SQL patterns
            expect(
                userIndexSql.some((sql) => sql.includes('CREATE INDEX IF NOT EXISTS "idx_simple_index_entity_email"'))
            ).toBe(true);
            expect(
                userIndexSql.some((sql) => sql.includes('CREATE INDEX IF NOT EXISTS "idx_simple_index_entity_phone"'))
            ).toBe(true);
        }

        if (compositeMetadata) {
            const compositeIndexSql = sqlGenerator.generateIndexes(compositeMetadata);
            expect(compositeIndexSql.length).toBe(3);

            // Check for unique index SQL
            expect(
                compositeIndexSql.some((sql) =>
                    sql.includes('CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_email_status"')
                )
            ).toBe(true);

            // Check for composite index columns
            expect(compositeIndexSql.some((sql) => sql.includes('("firstName", "lastName")'))).toBe(true);
            expect(compositeIndexSql.some((sql) => sql.includes('("firstName", "lastName", "age")'))).toBe(true);
        }
    });
});
