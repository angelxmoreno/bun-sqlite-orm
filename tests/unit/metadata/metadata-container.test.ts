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

    describe('Global Index Uniqueness', () => {
        // Create test entities for index testing
        class EntityA {}
        class EntityB {}

        beforeEach(() => {
            // Set up entities with columns
            metadataContainer.addEntity(EntityA as EntityConstructor, 'entity_a');
            metadataContainer.addEntity(EntityB as EntityConstructor, 'entity_b');

            metadataContainer.addColumn(EntityA as EntityConstructor, 'field1', {
                propertyName: 'field1',
                type: 'text',
                nullable: false,
                unique: false,
                isPrimary: false,
                isGenerated: false,
            });

            metadataContainer.addColumn(EntityB as EntityConstructor, 'field2', {
                propertyName: 'field2',
                type: 'text',
                nullable: false,
                unique: false,
                isPrimary: false,
                isGenerated: false,
            });
        });

        test('should prevent duplicate index names within the same entity (global check takes precedence)', () => {
            // Add first index
            metadataContainer.addIndex(EntityA as EntityConstructor, {
                name: 'idx_test',
                columns: ['field1'],
                unique: false,
            });

            // Try to add same index name to same entity - should fail with global uniqueness error
            expect(() => {
                metadataContainer.addIndex(EntityA as EntityConstructor, {
                    name: 'idx_test',
                    columns: ['field1'],
                    unique: false,
                });
            }).toThrow("Index name 'idx_test' is already used by another entity");
        });

        test('should prevent duplicate index names across different entities', () => {
            // Add index to first entity
            metadataContainer.addIndex(EntityA as EntityConstructor, {
                name: 'idx_unique_name',
                columns: ['field1'],
                unique: false,
            });

            // Try to add same index name to different entity - should fail
            expect(() => {
                metadataContainer.addIndex(EntityB as EntityConstructor, {
                    name: 'idx_unique_name',
                    columns: ['field2'],
                    unique: false,
                });
            }).toThrow("Index name 'idx_unique_name' is already used by another entity");
        });

        test('should allow different index names across entities', () => {
            // Add indexes with different names to different entities - should succeed
            metadataContainer.addIndex(EntityA as EntityConstructor, {
                name: 'idx_entity_a',
                columns: ['field1'],
                unique: false,
            });

            metadataContainer.addIndex(EntityB as EntityConstructor, {
                name: 'idx_entity_b',
                columns: ['field2'],
                unique: false,
            });

            // Verify both indexes exist
            const entityAIndexes = metadataContainer.getIndexes(EntityA as EntityConstructor);
            const entityBIndexes = metadataContainer.getIndexes(EntityB as EntityConstructor);

            expect(entityAIndexes).toHaveLength(1);
            expect(entityBIndexes).toHaveLength(1);
            expect(entityAIndexes[0].name).toBe('idx_entity_a');
            expect(entityBIndexes[0].name).toBe('idx_entity_b');
        });

        test('should handle auto-generated index name conflicts during table rename', () => {
            class EntityC {}

            // Set up EntityC with same table name pattern as EntityA after rename
            metadataContainer.addEntity(EntityC as EntityConstructor, 'renamed_table');
            metadataContainer.addColumn(EntityC as EntityConstructor, 'field1', {
                propertyName: 'field1',
                type: 'text',
                nullable: false,
                unique: false,
                isPrimary: false,
                isGenerated: false,
            });

            // Add auto-generated index to EntityC first
            metadataContainer.addIndex(EntityC as EntityConstructor, {
                name: 'idx_renamed_table_field1',
                columns: ['field1'],
                unique: false,
            });

            // Add auto-generated index to EntityA
            metadataContainer.addIndex(EntityA as EntityConstructor, {
                name: 'idx_entity_a_field1',
                columns: ['field1'],
                unique: false,
            });

            // Try to rename EntityA table which would create conflicting index name - should fail
            expect(() => {
                metadataContainer.addEntity(EntityA as EntityConstructor, 'renamed_table', true);
            }).toThrow("Cannot rename index: name 'idx_renamed_table_field1' is already used by another entity");
        });

        test('should successfully update auto-generated index names during table rename when no conflicts', () => {
            // Add auto-generated index to EntityA
            metadataContainer.addIndex(EntityA as EntityConstructor, {
                name: 'idx_entity_a_field1',
                columns: ['field1'],
                unique: false,
            });

            // Rename EntityA table - should succeed and update index name
            metadataContainer.addEntity(EntityA as EntityConstructor, 'new_table_name', true);

            // Verify index name was updated
            const indexes = metadataContainer.getIndexes(EntityA as EntityConstructor);
            expect(indexes).toHaveLength(1);
            expect(indexes[0].name).toBe('idx_new_table_name_field1');
        });

        test('should not update custom index names during table rename', () => {
            // Add custom index name to EntityA
            metadataContainer.addIndex(EntityA as EntityConstructor, {
                name: 'custom_index_name',
                columns: ['field1'],
                unique: false,
            });

            // Rename EntityA table - custom index name should remain unchanged
            metadataContainer.addEntity(EntityA as EntityConstructor, 'new_table_name', true);

            // Verify custom index name was not changed
            const indexes = metadataContainer.getIndexes(EntityA as EntityConstructor);
            expect(indexes).toHaveLength(1);
            expect(indexes[0].name).toBe('custom_index_name');
        });
    });

    describe('Container Reset', () => {
        test('should clear all metadata when clear() is called', () => {
            // Add some test data
            metadataContainer.addEntity(TestUser as EntityConstructor, 'test_users');
            metadataContainer.addColumn(TestUser as EntityConstructor, 'id', {
                propertyName: 'id',
                type: 'integer',
                nullable: false,
                unique: true,
                isPrimary: true,
                isGenerated: true,
                generationStrategy: 'increment',
            });
            metadataContainer.addIndex(TestUser as EntityConstructor, {
                name: 'idx_test_clear',
                columns: ['id'],
                unique: false,
            });

            // Verify data exists
            expect(metadataContainer.hasEntity(TestUser as EntityConstructor)).toBe(true);
            expect(metadataContainer.getIndexes(TestUser as EntityConstructor)).toHaveLength(1);

            // Clear the container
            metadataContainer.clear();

            // Verify everything is cleared
            expect(metadataContainer.hasEntity(TestUser as EntityConstructor)).toBe(false);
            expect(() => metadataContainer.getIndexes(TestUser as EntityConstructor)).toThrow(
                'Entity metadata not found'
            );
        });

        test('should allow re-adding entities after clear()', () => {
            // Add and clear
            metadataContainer.addEntity(TestUser as EntityConstructor, 'test_users');
            metadataContainer.clear();

            // Re-add should work
            metadataContainer.addEntity(TestUser as EntityConstructor, 'new_table_name');
            expect(metadataContainer.hasEntity(TestUser as EntityConstructor)).toBe(true);
            expect(metadataContainer.getTableName(TestUser as EntityConstructor)).toBe('new_table_name');
        });

        test('should clear global index names when clear() is called', () => {
            class TestEntity1 {}
            class TestEntity2 {}

            // Set up entities
            metadataContainer.addEntity(TestEntity1 as EntityConstructor, 'test1');
            metadataContainer.addEntity(TestEntity2 as EntityConstructor, 'test2');

            // Add index to first entity
            metadataContainer.addIndex(TestEntity1 as EntityConstructor, {
                name: 'shared_index_name',
                columns: ['field1'],
                unique: false,
            });

            // Clear container
            metadataContainer.clear();

            // Re-add entities
            metadataContainer.addEntity(TestEntity1 as EntityConstructor, 'test1');
            metadataContainer.addEntity(TestEntity2 as EntityConstructor, 'test2');

            // Should be able to add same index name to different entity now
            metadataContainer.addIndex(TestEntity2 as EntityConstructor, {
                name: 'shared_index_name', // This should work now since global names were cleared
                columns: ['field2'],
                unique: false,
            });

            expect(metadataContainer.getIndexes(TestEntity2 as EntityConstructor)).toHaveLength(1);
        });
    });
});
