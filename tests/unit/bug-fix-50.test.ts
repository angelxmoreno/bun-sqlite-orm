import { beforeEach, describe, expect, test } from 'bun:test';
import { getGlobalMetadataContainer } from '../../src/container';
import { DataSource } from '../../src/data-source';
import { Column, Entity, PrimaryGeneratedColumn } from '../../src/decorators';
import { BaseEntity } from '../../src/entity';
import type { EntityConstructor } from '../../src/types';
import { resetGlobalMetadata } from '../helpers/test-utils';

describe('Bug Fix #50: Base Entity without @Entity decorator', () => {
    beforeEach(() => {
        resetGlobalMetadata();
    });

    test('should not create tables for entities without @Entity decorator', async () => {
        // Create a base entity WITHOUT @Entity decorator
        class BaseUserEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text' })
            name!: string;
        }

        // Create a child entity WITH @Entity decorator
        @Entity('users')
        class UserEntity extends BaseUserEntity {
            @Column({ type: 'text' })
            email!: string;
        }

        const metadataContainer = getGlobalMetadataContainer();

        // Both entities should be auto-registered for column metadata
        expect(metadataContainer.hasEntity(BaseUserEntity as EntityConstructor)).toBe(true);
        expect(metadataContainer.hasEntity(UserEntity as EntityConstructor)).toBe(true);

        // But only explicit entities should be returned by getExplicitEntities()
        const explicitEntities = metadataContainer.getExplicitEntities();
        const explicitEntityNames = explicitEntities.map((e) => e.tableName);

        expect(explicitEntityNames).toContain('users'); // UserEntity should be included
        expect(explicitEntityNames).not.toContain('baseuserentity'); // BaseUserEntity should NOT be included

        // Verify the isExplicitlyRegistered flag is correct
        const baseUserMetadata = metadataContainer.getEntityMetadata(BaseUserEntity as EntityConstructor);
        const userMetadata = metadataContainer.getEntityMetadata(UserEntity as EntityConstructor);

        expect(baseUserMetadata?.isExplicitlyRegistered).toBe(false);
        expect(userMetadata?.isExplicitlyRegistered).toBe(true);
    });

    test('should only create tables for explicitly registered entities in DataSource', async () => {
        // Create entities without @Entity decorator
        class BaseProductEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text' })
            name!: string;
        }

        class BaseOrderEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'integer' })
            total!: number;
        }

        // Create entities with @Entity decorator
        @Entity('products')
        class ProductEntity extends BaseProductEntity {
            @Column({ type: 'text' })
            description!: string;
        }

        @Entity('orders')
        class OrderEntity extends BaseOrderEntity {
            @Column({ type: 'text' })
            status!: string;
        }

        // Create DataSource with both types of entities
        const dataSource = new DataSource({
            database: ':memory:',
            entities: [BaseProductEntity, BaseOrderEntity, ProductEntity, OrderEntity] as EntityConstructor[],
        });

        await dataSource.initialize();
        await dataSource.runMigrations();

        const db = dataSource.getDatabase();

        // Check which tables were created
        const tables = db
            .query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `)
            .all() as Array<{ name: string }>;

        const tableNames = tables.map((t) => t.name);

        // Only explicitly registered entities should have tables
        expect(tableNames).toContain('products'); // ProductEntity has @Entity
        expect(tableNames).toContain('orders'); // OrderEntity has @Entity
        expect(tableNames).not.toContain('baseproductentity'); // BaseProductEntity lacks @Entity
        expect(tableNames).not.toContain('baseorderentity'); // BaseOrderEntity lacks @Entity

        await dataSource.destroy();
    });

    test('should verify that inheritance issue is separate from the base entity table creation issue', async () => {
        // This test documents that inheritance is a separate issue (#51)
        // The fix for #50 only prevents base entities without @Entity from creating tables
        // Issue #51 deals with column inheritance between entities

        // Create a base entity WITH @Entity decorator
        @Entity('base_vehicles')
        class BaseVehicleEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text' })
            brand!: string;
        }

        // Create a child entity WITH @Entity decorator
        @Entity('cars')
        class CarEntity extends BaseVehicleEntity {
            @Column({ type: 'integer' })
            doors!: number;
        }

        const dataSource = new DataSource({
            database: ':memory:',
            entities: [BaseVehicleEntity, CarEntity] as EntityConstructor[],
        });

        await dataSource.initialize();
        await dataSource.runMigrations();

        const db = dataSource.getDatabase();

        // Check which tables were created
        const tables = db
            .query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `)
            .all() as Array<{ name: string }>;

        const tableNames = tables.map((t) => t.name);

        // Both explicitly registered entities should have tables (issue #50 is fixed)
        expect(tableNames).toContain('base_vehicles'); // BaseVehicleEntity has @Entity
        expect(tableNames).toContain('cars'); // CarEntity has @Entity

        // NOTE: Inheritance of columns is issue #51, not issue #50
        // Issue #50 was specifically about preventing table creation for entities without @Entity
        // The inheritance problem where child entities don't inherit parent columns
        // will be addressed separately in issue #51

        await dataSource.destroy();
    });
});
