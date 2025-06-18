import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn } from '../../src';
import { DataSource } from '../../src/data-source';

@Entity('index_test_users')
class IndexTestUser extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    // Column-level index with auto-generated name
    @Column({ index: true })
    email!: string;

    // Column-level index with custom name
    @Column({ index: 'idx_custom_username' })
    username!: string;

    // Property-level index decorator
    @Index()
    @Column()
    phone!: string;

    // Property-level index with custom name
    @Index('idx_address')
    @Column()
    address!: string;

    @Column()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column()
    age!: number;

    @Column()
    status!: string;
}

// Entity with composite indexes
@Entity('composite_index_test')
@Index('idx_full_name', ['firstName', 'lastName'])
@Index('idx_name_age', ['firstName', 'lastName', 'age'])
@Index('idx_unique_email_status', ['email', 'status'], { unique: true })
class CompositeIndexTest extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column()
    age!: number;

    @Column()
    email!: string;

    @Column()
    status!: string;
}

describe('Column Indexing Integration Tests', () => {
    let dataSource: DataSource;

    beforeAll(async () => {
        dataSource = new DataSource({
            database: ':memory:',
            entities: [IndexTestUser, CompositeIndexTest],
        });
        await dataSource.initialize();
        await dataSource.runMigrations(); // Creates tables and indexes
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    test('should create simple column indexes', async () => {
        const db = dataSource.getDatabase();

        // Check that indexes were created by querying SQLite system tables
        const indexes = db
            .query(`
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type = 'index' 
            AND tbl_name = 'index_test_users'
            AND name NOT LIKE 'sqlite_%'
        `)
            .all();

        // Extract index names
        const indexNames = indexes.map((idx) => (idx as { name: string }).name);

        // Column-level index with auto-generated name
        expect(indexNames).toContain('idx_index_test_users_email');

        // Column-level index with custom name
        expect(indexNames).toContain('idx_custom_username');

        // Property-level index with auto-generated name
        expect(indexNames).toContain('idx_index_test_users_phone');

        // Property-level index with custom name
        expect(indexNames).toContain('idx_address');

        expect(indexes.length).toBeGreaterThanOrEqual(4);
    });

    test('should create composite indexes on class', async () => {
        const db = dataSource.getDatabase();

        const indexes = db
            .query(`
            SELECT name, sql 
            FROM sqlite_master 
            WHERE type = 'index' 
            AND tbl_name = 'composite_index_test'
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
            const user = new IndexTestUser();
            user.name = `User ${i}`;
            user.email = `user${i}@example.com`;
            user.username = `user${i}`;
            user.phone = `555-000${i.toString().padStart(2, '0')}`;
            user.address = `${i} Main Street`;
            user.firstName = `First${i}`;
            user.lastName = `Last${i}`;
            user.age = 20 + (i % 50);
            user.status = i % 2 === 0 ? 'active' : 'inactive';
            await user.save();
            users.push(user);
        }

        // Test querying by indexed columns (should be fast)
        const foundByEmail = await IndexTestUser.find({ email: 'user50@example.com' });
        expect(foundByEmail).toHaveLength(1);
        expect(foundByEmail[0].name).toBe('User 50');

        const foundByUsername = await IndexTestUser.find({ username: 'user25' });
        expect(foundByUsername).toHaveLength(1);
        expect(foundByUsername[0].name).toBe('User 25');

        // Test composite index queries
        await dataSource.getDatabase().exec(`
            INSERT INTO composite_index_test (firstName, lastName, age, email, status)
            VALUES 
                ('John', 'Doe', 30, 'john@example.com', 'active'),
                ('Jane', 'Smith', 25, 'jane@example.com', 'active'),
                ('John', 'Smith', 35, 'johnsmith@example.com', 'inactive')
        `);

        const compositeResults = dataSource
            .getDatabase()
            .query(`
            SELECT * FROM composite_index_test 
            WHERE firstName = 'John' AND lastName = 'Doe'
        `)
            .all();

        expect(compositeResults).toHaveLength(1);
        expect((compositeResults[0] as { email: string }).email).toBe('john@example.com');
    });

    test('should handle unique index constraints', async () => {
        const db = dataSource.getDatabase();

        // First insert should work
        await db.exec(`
            INSERT INTO composite_index_test (firstName, lastName, age, email, status)
            VALUES ('Test', 'User', 30, 'unique@test.com', 'active')
        `);

        // Second insert with same email+status should fail due to unique index
        expect(() => {
            db.exec(`
                INSERT INTO composite_index_test (firstName, lastName, age, email, status)
                VALUES ('Another', 'User', 25, 'unique@test.com', 'active')
            `);
        }).toThrow();
    });

    test('should handle index creation edge cases', async () => {
        // Test that we can query the metadata container for index information
        const metadataContainer = dataSource.getMetadataContainer();

        const userIndexes = metadataContainer.getIndexes(IndexTestUser);
        expect(userIndexes.length).toBeGreaterThan(0);

        // Check specific index properties
        const emailIndex = userIndexes.find((idx) => idx.columns.includes('email'));
        expect(emailIndex).toBeDefined();
        expect(emailIndex?.name).toBe('idx_index_test_users_email');
        expect(emailIndex?.unique).toBe(false);

        const compositeIndexes = metadataContainer.getIndexes(CompositeIndexTest);
        expect(compositeIndexes.length).toBe(3);

        const uniqueIndex = compositeIndexes.find((idx) => idx.name === 'idx_unique_email_status');
        expect(uniqueIndex).toBeDefined();
        expect(uniqueIndex?.unique).toBe(true);
        expect(uniqueIndex?.columns).toEqual(['email', 'status']);
    });

    test('should generate correct SQL for indexes', async () => {
        const sqlGenerator = dataSource.getSqlGenerator();
        const metadataContainer = dataSource.getMetadataContainer();

        const userMetadata = metadataContainer.getEntityMetadata(IndexTestUser);
        const compositeMetadata = metadataContainer.getEntityMetadata(CompositeIndexTest);

        expect(userMetadata).toBeDefined();
        expect(compositeMetadata).toBeDefined();

        if (userMetadata) {
            const userIndexSql = sqlGenerator.generateIndexes(userMetadata);
            expect(userIndexSql.length).toBeGreaterThan(0);

            // Check for specific index SQL patterns
            expect(
                userIndexSql.some((sql) => sql.includes('CREATE INDEX IF NOT EXISTS "idx_index_test_users_email"'))
            ).toBe(true);
            expect(userIndexSql.some((sql) => sql.includes('CREATE INDEX IF NOT EXISTS "idx_custom_username"'))).toBe(
                true
            );
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
