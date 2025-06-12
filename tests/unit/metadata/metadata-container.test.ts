import { beforeEach, describe, expect, test } from 'bun:test';
import { MetadataContainer } from '../../../src/metadata';
import type { ColumnMetadata, EntityConstructor } from '../../../src/types';
import { NoPrimaryKeyEntity, SimpleTestEntity, TestPost, TestUser } from '../../helpers/mock-entities';

describe('MetadataContainer', () => {
    let metadataContainer: MetadataContainer;

    beforeEach(() => {
        metadataContainer = new MetadataContainer();
    });

    describe('Entity Registration', () => {
        test('should add entity with table name', () => {
            metadataContainer.addEntity(TestUser as EntityConstructor, 'test_users');

            expect(metadataContainer.hasEntity(TestUser as EntityConstructor)).toBe(true);

            const metadata = metadataContainer.getEntityMetadata(TestUser as EntityConstructor);
            expect(metadata).toBeDefined();
            expect(metadata?.tableName).toBe('test_users');
            expect(metadata?.target).toBe(TestUser);
        });

        test('should not duplicate entities', () => {
            metadataContainer.addEntity(TestUser as EntityConstructor, 'test_users');
            metadataContainer.addEntity(TestUser as EntityConstructor, 'test_users');

            const allEntities = metadataContainer.getAllEntities();
            const userEntities = allEntities.filter((e) => e.target === TestUser);
            expect(userEntities).toHaveLength(1);
        });

        test('should return undefined for non-existent entity', () => {
            const metadata = metadataContainer.getEntityMetadata(TestUser as EntityConstructor);
            expect(metadata).toBeUndefined();
        });
    });

    describe('Column Management', () => {
        beforeEach(() => {
            metadataContainer.addEntity(TestUser as EntityConstructor, 'test_users');
        });

        test('should add column metadata', () => {
            const columnMetadata: ColumnMetadata = {
                propertyName: 'name',
                type: 'text',
                nullable: false,
                unique: false,
                isPrimary: false,
                isGenerated: false,
            };

            metadataContainer.addColumn(TestUser as EntityConstructor, 'name', columnMetadata);

            const entityMetadata = metadataContainer.getEntityMetadata(TestUser as EntityConstructor);
            expect(entityMetadata?.columns.has('name')).toBe(true);

            const storedColumn = entityMetadata?.columns.get('name');
            expect(storedColumn).toEqual(columnMetadata);
        });

        test('should add primary column to primaryColumns array', () => {
            const primaryColumnMetadata: ColumnMetadata = {
                propertyName: 'id',
                type: 'integer',
                nullable: false,
                unique: false,
                isPrimary: true,
                isGenerated: true,
                generationStrategy: 'increment',
            };

            metadataContainer.addColumn(TestUser as EntityConstructor, 'id', primaryColumnMetadata);

            const entityMetadata = metadataContainer.getEntityMetadata(TestUser as EntityConstructor);
            expect(entityMetadata?.primaryColumns).toHaveLength(1);
            expect(entityMetadata?.primaryColumns[0]).toEqual(primaryColumnMetadata);
        });

        test('should throw error when adding column to non-existent entity', () => {
            const columnMetadata: ColumnMetadata = {
                propertyName: 'name',
                type: 'text',
                nullable: false,
                unique: false,
                isPrimary: false,
                isGenerated: false,
            };

            expect(() => {
                metadataContainer.addColumn(SimpleTestEntity as EntityConstructor, 'name', columnMetadata);
            }).toThrow('Entity metadata not found');
        });
    });

    describe('Entity Queries', () => {
        beforeEach(() => {
            metadataContainer.addEntity(TestUser as EntityConstructor, 'test_users');
            metadataContainer.addEntity(TestPost as EntityConstructor, 'test_posts');
        });

        test('should get table name for entity', () => {
            const tableName = metadataContainer.getTableName(TestUser as EntityConstructor);
            expect(tableName).toBe('test_users');
        });

        test('should throw error when getting table name for non-existent entity', () => {
            expect(() => {
                metadataContainer.getTableName(SimpleTestEntity as EntityConstructor);
            }).toThrow('Entity metadata not found');
        });

        test('should get all entities', () => {
            const allEntities = metadataContainer.getAllEntities();
            expect(allEntities).toHaveLength(2);

            const tableNames = allEntities.map((e) => e.tableName);
            expect(tableNames).toContain('test_users');
            expect(tableNames).toContain('test_posts');
        });

        test('should check if entity exists', () => {
            expect(metadataContainer.hasEntity(TestUser as EntityConstructor)).toBe(true);
            expect(metadataContainer.hasEntity(TestPost as EntityConstructor)).toBe(true);
            expect(metadataContainer.hasEntity(SimpleTestEntity as EntityConstructor)).toBe(false);
        });
    });

    describe('Column Queries', () => {
        beforeEach(() => {
            metadataContainer.addEntity(TestUser as EntityConstructor, 'test_users');

            // Add some test columns
            metadataContainer.addColumn(TestUser as EntityConstructor, 'id', {
                propertyName: 'id',
                type: 'integer',
                nullable: false,
                unique: false,
                isPrimary: true,
                isGenerated: true,
                generationStrategy: 'increment',
            });

            metadataContainer.addColumn(TestUser as EntityConstructor, 'name', {
                propertyName: 'name',
                type: 'text',
                nullable: false,
                unique: false,
                isPrimary: false,
                isGenerated: false,
            });

            metadataContainer.addColumn(TestUser as EntityConstructor, 'email', {
                propertyName: 'email',
                type: 'text',
                nullable: false,
                unique: true,
                isPrimary: false,
                isGenerated: false,
            });
        });

        test('should get all columns for entity', () => {
            const columns = metadataContainer.getColumns(TestUser as EntityConstructor);
            expect(columns.size).toBe(3);
            expect(columns.has('id')).toBe(true);
            expect(columns.has('name')).toBe(true);
            expect(columns.has('email')).toBe(true);
        });

        test('should get primary columns for entity', () => {
            const primaryColumns = metadataContainer.getPrimaryColumns(TestUser as EntityConstructor);
            expect(primaryColumns).toHaveLength(1);
            expect(primaryColumns[0].propertyName).toBe('id');
            expect(primaryColumns[0].isPrimary).toBe(true);
        });

        test('should return empty array for entity with no primary columns', () => {
            metadataContainer.addEntity(NoPrimaryKeyEntity as EntityConstructor, 'test_no_pk');

            const primaryColumns = metadataContainer.getPrimaryColumns(NoPrimaryKeyEntity as EntityConstructor);
            expect(primaryColumns).toHaveLength(0);
        });

        test('should throw error when getting columns for non-existent entity', () => {
            expect(() => {
                metadataContainer.getColumns(SimpleTestEntity as EntityConstructor);
            }).toThrow('Entity metadata not found');
        });

        test('should throw error when getting primary columns for non-existent entity', () => {
            expect(() => {
                metadataContainer.getPrimaryColumns(SimpleTestEntity as EntityConstructor);
            }).toThrow('Entity metadata not found');
        });
    });

    describe('Complex Scenarios', () => {
        test('should handle multiple entities with different column configurations', () => {
            // Set up TestUser
            metadataContainer.addEntity(TestUser as EntityConstructor, 'test_users');
            metadataContainer.addColumn(TestUser as EntityConstructor, 'id', {
                propertyName: 'id',
                type: 'integer',
                nullable: false,
                unique: false,
                isPrimary: true,
                isGenerated: true,
                generationStrategy: 'increment',
            });

            // Set up TestPost with UUID primary key
            metadataContainer.addEntity(TestPost as EntityConstructor, 'test_posts');
            metadataContainer.addColumn(TestPost as EntityConstructor, 'id', {
                propertyName: 'id',
                type: 'text',
                nullable: false,
                unique: false,
                isPrimary: true,
                isGenerated: true,
                generationStrategy: 'uuid',
            });

            // Verify different primary key strategies
            const userPrimaryColumns = metadataContainer.getPrimaryColumns(TestUser as EntityConstructor);
            const postPrimaryColumns = metadataContainer.getPrimaryColumns(TestPost as EntityConstructor);

            expect(userPrimaryColumns[0].generationStrategy).toBe('increment');
            expect(postPrimaryColumns[0].generationStrategy).toBe('uuid');
        });

        test('should handle entity with multiple primary columns', () => {
            metadataContainer.addEntity(SimpleTestEntity as EntityConstructor, 'test_composite');

            // Add first primary key
            metadataContainer.addColumn(SimpleTestEntity as EntityConstructor, 'id1', {
                propertyName: 'id1',
                type: 'text',
                nullable: false,
                unique: false,
                isPrimary: true,
                isGenerated: false,
            });

            // Add second primary key
            metadataContainer.addColumn(SimpleTestEntity as EntityConstructor, 'id2', {
                propertyName: 'id2',
                type: 'text',
                nullable: false,
                unique: false,
                isPrimary: true,
                isGenerated: false,
            });

            const primaryColumns = metadataContainer.getPrimaryColumns(SimpleTestEntity as EntityConstructor);
            expect(primaryColumns).toHaveLength(2);
            expect(primaryColumns.map((c) => c.propertyName)).toContain('id1');
            expect(primaryColumns.map((c) => c.propertyName)).toContain('id2');
        });
    });
});
