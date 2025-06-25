import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getGlobalMetadataContainer } from '../../../src/container';
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from '../../../src/decorators';
import { BaseEntity } from '../../../src/entity';
import type { MetadataContainer } from '../../../src/metadata';
import type { EntityConstructor } from '../../../src/types';
import { UserRoleEntity } from '../../helpers/composite-entities';
import {
    AllColumnTypesEntity,
    AutoEntity1,
    AutoEntity2,
    AutoEntity3,
    AutoRegisteredEntity,
    ComplexEntity,
    CustomOptionsEntity,
    DecoratorTestEntity,
    ExplicitEntity,
    IntPrimaryKeyEntity,
    SimpleTestEntity,
    StringPrimaryKeyEntity,
    TypeInferenceEntity,
    UuidPrimaryKeyEntity,
} from '../../helpers/mock-entities';
import { resetGlobalMetadata } from '../../helpers/test-utils';

describe('Decorators', () => {
    let metadataContainer: MetadataContainer;

    beforeEach(() => {
        // Get a fresh instance for each test
        metadataContainer = getGlobalMetadataContainer();
        // Note: We don't clear the container here because class decorators
        // run at definition time and would be lost
    });

    afterEach(() => {
        // Note: We don't reset global metadata here because shared mock entities
        // from mock-entities.ts should remain registered throughout the test suite.
        // The 'Shared Mock Entities Integration' tests rely on these being available.
        // Only inline test entities defined in individual tests need cleanup,
        // which happens naturally when test scope ends.
    });

    describe('@Entity Decorator', () => {
        test('should register entity with custom table name', () => {
            // Using shared DecoratorTestEntity which has table name 'decorator_test_entity'
            expect(metadataContainer.hasEntity(DecoratorTestEntity as EntityConstructor)).toBe(true);
            const tableName = metadataContainer.getTableName(DecoratorTestEntity as EntityConstructor);
            expect(tableName).toBe('decorator_test_entity');
        });

        test('should register entity with inferred table name', () => {
            // Using shared SimpleTestEntity which has table name 'test_simple'
            expect(metadataContainer.hasEntity(SimpleTestEntity as EntityConstructor)).toBe(true);
            const tableName = metadataContainer.getTableName(SimpleTestEntity as EntityConstructor);
            expect(tableName).toBe('test_simple');
        });

        test('should register entity without explicit decorator when columns are added', () => {
            // Using shared AutoRegisteredEntity which is auto-registered by column decorator
            expect(metadataContainer.hasEntity(AutoRegisteredEntity as EntityConstructor)).toBe(true);
            const tableName = metadataContainer.getTableName(AutoRegisteredEntity as EntityConstructor);
            expect(tableName).toBe('autoregisteredentity');
        });
    });

    describe('@Column Decorator', () => {
        test('should register basic column', () => {
            // Using shared SimpleTestEntity
            const columns = metadataContainer.getColumns(SimpleTestEntity as EntityConstructor);
            expect(columns.has('name')).toBe(true);

            const columnMeta = columns.get('name');
            expect(columnMeta).toBeDefined();
            expect(columnMeta?.propertyName).toBe('name');
            expect(columnMeta?.type).toBe('text');
            expect(columnMeta?.nullable).toBe(false);
            expect(columnMeta?.unique).toBe(false);
            expect(columnMeta?.isPrimary).toBe(false);
            expect(columnMeta?.isGenerated).toBe(false);
        });

        test('should register column with custom options', () => {
            // Using shared CustomOptionsEntity
            const columns = metadataContainer.getColumns(CustomOptionsEntity as EntityConstructor);
            const columnMeta = columns.get('count');

            expect(columnMeta).toBeDefined();
            expect(columnMeta?.type).toBe('integer');
            expect(columnMeta?.nullable).toBe(true);
            expect(columnMeta?.unique).toBe(true);
            expect(columnMeta?.default).toBe(42);
        });

        test('should infer type from TypeScript type', () => {
            // Using shared TypeInferenceEntity
            const columns = metadataContainer.getColumns(TypeInferenceEntity as EntityConstructor);

            expect(columns.get('stringProp')?.type).toBe('text');
            expect(columns.get('numberProp')?.type).toBe('integer');
            expect(columns.get('dateProp')?.type).toBe('text');
            expect(columns.get('booleanProp')?.type).toBe('integer');
        });

        test('should override TypeScript type with explicit type', () => {
            // Using shared AllColumnTypesEntity which has realColumn with explicit 'real' type
            const columns = metadataContainer.getColumns(AllColumnTypesEntity as EntityConstructor);
            expect(columns.get('realColumn')?.type).toBe('real');
        });
    });

    describe('@PrimaryColumn Decorator', () => {
        test('should register primary column', () => {
            // Using shared SimpleTestEntity which has a @PrimaryColumn() id
            const columns = metadataContainer.getColumns(SimpleTestEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(SimpleTestEntity as EntityConstructor);

            expect(columns.has('id')).toBe(true);
            expect(primaryColumns).toHaveLength(1);

            const columnMeta = columns.get('id');
            expect(columnMeta?.isPrimary).toBe(true);
            expect(columnMeta?.isGenerated).toBe(false);
            expect(columnMeta?.unique).toBe(true);
            expect(columnMeta?.nullable).toBe(false);
        });

        test('should infer primary column type', () => {
            // Using shared StringPrimaryKeyEntity (text) and IntPrimaryKeyEntity (integer)
            const stringColumns = metadataContainer.getColumns(StringPrimaryKeyEntity as EntityConstructor);
            const intColumns = metadataContainer.getColumns(IntPrimaryKeyEntity as EntityConstructor);

            expect(stringColumns.get('code')?.type).toBe('text');
            expect(intColumns.get('id')?.type).toBe('integer');
        });
    });

    describe('@PrimaryGeneratedColumn Decorator', () => {
        test('should register auto-increment primary column', () => {
            // Using shared IntPrimaryKeyEntity
            const columns = metadataContainer.getColumns(IntPrimaryKeyEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(IntPrimaryKeyEntity as EntityConstructor);

            expect(columns.has('id')).toBe(true);
            expect(primaryColumns).toHaveLength(1);

            const columnMeta = columns.get('id');
            expect(columnMeta?.isPrimary).toBe(true);
            expect(columnMeta?.isGenerated).toBe(true);
            expect(columnMeta?.generationStrategy).toBe('increment');
            expect(columnMeta?.type).toBe('integer');
        });

        test('should register UUID primary column', () => {
            // Using shared UuidPrimaryKeyEntity
            const columns = metadataContainer.getColumns(UuidPrimaryKeyEntity as EntityConstructor);
            const columnMeta = columns.get('id');

            expect(columnMeta?.isPrimary).toBe(true);
            expect(columnMeta?.isGenerated).toBe(true);
            expect(columnMeta?.generationStrategy).toBe('uuid');
            expect(columnMeta?.type).toBe('text');
        });

        test('should default to int strategy', () => {
            // Using shared IntPrimaryKeyEntity which uses default @PrimaryGeneratedColumn()
            const columns = metadataContainer.getColumns(IntPrimaryKeyEntity as EntityConstructor);
            const columnMeta = columns.get('id');

            expect(columnMeta?.generationStrategy).toBe('increment');
            expect(columnMeta?.type).toBe('integer');
        });
    });

    describe('Combined Decorators', () => {
        test('should handle entity with mixed column types', () => {
            // Using shared ComplexEntity
            const columns = metadataContainer.getColumns(ComplexEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(ComplexEntity as EntityConstructor);

            // Verify entity registration
            expect(metadataContainer.hasEntity(ComplexEntity as EntityConstructor)).toBe(true);
            expect(metadataContainer.getTableName(ComplexEntity as EntityConstructor)).toBe('complex_entity');

            // Verify column count
            expect(columns.size).toBe(5);

            // Verify primary key
            expect(primaryColumns).toHaveLength(1);
            expect(primaryColumns[0].propertyName).toBe('id');

            // Verify individual columns
            const idColumn = columns.get('id');
            expect(idColumn?.isPrimary).toBe(true);
            expect(idColumn?.isGenerated).toBe(true);

            const emailColumn = columns.get('email');
            expect(emailColumn?.unique).toBe(true);
            expect(emailColumn?.nullable).toBe(false);

            const nameColumn = columns.get('name');
            expect(nameColumn?.nullable).toBe(true);

            const scoreColumn = columns.get('score');
            expect(scoreColumn?.type).toBe('real');
            expect(scoreColumn?.default).toBe(0.0);

            const timestampColumn = columns.get('timestamp');
            expect(timestampColumn?.type).toBe('integer');
            expect(typeof timestampColumn?.default).toBe('function');
        });

        test('should handle multiple primary keys', () => {
            // Using shared UserRoleEntity which has composite primary keys
            const primaryColumns = metadataContainer.getPrimaryColumns(UserRoleEntity as EntityConstructor);

            expect(primaryColumns).toHaveLength(2);
            const primaryKeys = primaryColumns.map((col: { propertyName: string }) => col.propertyName);
            expect(primaryKeys).toContain('userId');
            expect(primaryKeys).toContain('roleId');
        });

        // Note: Composite primary key test removed - entities moved to prevent conflicts
    });

    describe('Auto-registration', () => {
        test('should auto-register entity when using any column decorator', () => {
            // Using shared auto-registration entities
            // All should be auto-registered
            expect(metadataContainer.hasEntity(AutoEntity1 as EntityConstructor)).toBe(true);
            expect(metadataContainer.hasEntity(AutoEntity2 as EntityConstructor)).toBe(true);
            expect(metadataContainer.hasEntity(AutoEntity3 as EntityConstructor)).toBe(true);

            // Table names should be inferred from class names
            expect(metadataContainer.getTableName(AutoEntity1 as EntityConstructor)).toBe('autoentity1');
            expect(metadataContainer.getTableName(AutoEntity2 as EntityConstructor)).toBe('autoentity2');
            expect(metadataContainer.getTableName(AutoEntity3 as EntityConstructor)).toBe('autoentity3');
        });

        test('should prefer explicit @Entity table name over auto-registration', () => {
            // Using shared ExplicitEntity with explicit table name
            expect(metadataContainer.getTableName(ExplicitEntity as EntityConstructor)).toBe('explicit_table');
        });
    });

    describe('Shared Mock Entities Integration', () => {
        test('should validate IntPrimaryKeyEntity decorator setup', () => {
            expect(metadataContainer.hasEntity(IntPrimaryKeyEntity as EntityConstructor)).toBe(true);
            expect(metadataContainer.getTableName(IntPrimaryKeyEntity as EntityConstructor)).toBe('int_pk_entity');

            const columns = metadataContainer.getColumns(IntPrimaryKeyEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(IntPrimaryKeyEntity as EntityConstructor);

            expect(primaryColumns).toHaveLength(1);
            expect(primaryColumns[0].propertyName).toBe('id');
            expect(primaryColumns[0].generationStrategy).toBe('increment');
            expect(columns.get('id')?.type).toBe('integer');
        });

        test('should validate UuidPrimaryKeyEntity decorator setup', () => {
            expect(metadataContainer.hasEntity(UuidPrimaryKeyEntity as EntityConstructor)).toBe(true);
            expect(metadataContainer.getTableName(UuidPrimaryKeyEntity as EntityConstructor)).toBe('uuid_pk_entity');

            const columns = metadataContainer.getColumns(UuidPrimaryKeyEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(UuidPrimaryKeyEntity as EntityConstructor);

            expect(primaryColumns).toHaveLength(1);
            expect(primaryColumns[0].propertyName).toBe('id');
            expect(primaryColumns[0].generationStrategy).toBe('uuid');
            expect(columns.get('id')?.type).toBe('text');
        });

        test('should validate StringPrimaryKeyEntity decorator setup', () => {
            expect(metadataContainer.hasEntity(StringPrimaryKeyEntity as EntityConstructor)).toBe(true);
            expect(metadataContainer.getTableName(StringPrimaryKeyEntity as EntityConstructor)).toBe(
                'string_pk_entity'
            );

            const columns = metadataContainer.getColumns(StringPrimaryKeyEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(StringPrimaryKeyEntity as EntityConstructor);

            expect(primaryColumns).toHaveLength(1);
            expect(primaryColumns[0].propertyName).toBe('code');
            expect(primaryColumns[0].isGenerated).toBe(false);
            expect(columns.get('code')?.type).toBe('text');
        });

        test('should validate AllColumnTypesEntity column type inference', () => {
            expect(metadataContainer.hasEntity(AllColumnTypesEntity as EntityConstructor)).toBe(true);

            const columns = metadataContainer.getColumns(AllColumnTypesEntity as EntityConstructor);

            // Verify all column types are properly registered
            expect(columns.get('textColumn')?.type).toBe('text');
            expect(columns.get('integerColumn')?.type).toBe('integer');
            expect(columns.get('realColumn')?.type).toBe('real');
            expect(columns.get('blobColumn')?.type).toBe('blob');
            expect(columns.get('nullableText')?.nullable).toBe(true);
            expect(columns.get('nullableInteger')?.nullable).toBe(true);
        });
    });
});
