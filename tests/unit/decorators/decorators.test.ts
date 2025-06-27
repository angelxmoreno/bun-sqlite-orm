import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getGlobalMetadataContainer } from '../../../src/container';
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from '../../../src/decorators';
import { BaseEntity } from '../../../src/entity';
import type { MetadataContainer } from '../../../src/metadata';
import type { EntityConstructor } from '../../../src/types';
import { resetGlobalMetadata } from '../../helpers/test-utils';

describe('Decorators', () => {
    let metadataContainer: MetadataContainer;

    beforeEach(() => {
        resetGlobalMetadata();
        metadataContainer = getGlobalMetadataContainer();
    });

    afterEach(() => {
        resetGlobalMetadata();
    });

    describe('@Entity Decorator', () => {
        test('should register entity with custom table name', () => {
            @Entity('decorator_test_entity')
            class TestDecoratorEntity extends BaseEntity {
                @PrimaryGeneratedColumn('int')
                id!: number;
            }

            expect(metadataContainer.hasEntity(TestDecoratorEntity as EntityConstructor)).toBe(true);
            const tableName = metadataContainer.getTableName(TestDecoratorEntity as EntityConstructor);
            expect(tableName).toBe('decorator_test_entity');
        });

        test('should register entity with inferred table name', () => {
            @Entity('test_simple')
            class TestSimpleEntity extends BaseEntity {
                @PrimaryColumn()
                id!: number;

                @Column()
                name!: string;
            }

            expect(metadataContainer.hasEntity(TestSimpleEntity as EntityConstructor)).toBe(true);
            const tableName = metadataContainer.getTableName(TestSimpleEntity as EntityConstructor);
            expect(tableName).toBe('test_simple');
        });

        test('should register entity with explicit @Entity decorator', () => {
            @Entity('auto_registered_entity')
            class TestAutoRegisteredEntity extends BaseEntity {
                @Column()
                name!: string;
            }

            expect(metadataContainer.hasEntity(TestAutoRegisteredEntity as EntityConstructor)).toBe(true);
            const tableName = metadataContainer.getTableName(TestAutoRegisteredEntity as EntityConstructor);
            expect(tableName).toBe('auto_registered_entity');
        });
    });

    describe('@Column Decorator', () => {
        test('should register basic column', () => {
            @Entity('test_simple_column')
            class TestSimpleColumnEntity extends BaseEntity {
                @PrimaryColumn()
                id!: number;

                @Column()
                name!: string;
            }

            const columns = metadataContainer.getColumns(TestSimpleColumnEntity as EntityConstructor);
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
            @Entity('test_custom_options')
            class TestCustomOptionsEntity extends BaseEntity {
                @PrimaryColumn()
                id!: number;

                @Column({ type: 'integer', nullable: true, unique: true, default: 42 })
                count!: number;
            }

            const columns = metadataContainer.getColumns(TestCustomOptionsEntity as EntityConstructor);
            const columnMeta = columns.get('count');

            expect(columnMeta).toBeDefined();
            expect(columnMeta?.type).toBe('integer');
            expect(columnMeta?.nullable).toBe(true);
            expect(columnMeta?.unique).toBe(true);
            expect(columnMeta?.default).toBe(42);
        });

        test('should infer type from TypeScript type', () => {
            @Entity('test_type_inference')
            class TestTypeInferenceEntity extends BaseEntity {
                @Column()
                stringProp!: string;

                @Column()
                numberProp!: number;

                @Column()
                dateProp!: Date;

                @Column()
                booleanProp!: boolean;
            }

            const columns = metadataContainer.getColumns(TestTypeInferenceEntity as EntityConstructor);

            expect(columns.get('stringProp')?.type).toBe('text');
            expect(columns.get('numberProp')?.type).toBe('integer');
            expect(columns.get('dateProp')?.type).toBe('text');
            expect(columns.get('booleanProp')?.type).toBe('integer');
        });

        test('should override TypeScript type with explicit type', () => {
            @Entity('test_type_override')
            class TestTypeOverrideEntity extends BaseEntity {
                @Column({ type: 'real' })
                realColumn!: number;
            }

            const columns = metadataContainer.getColumns(TestTypeOverrideEntity as EntityConstructor);
            expect(columns.get('realColumn')?.type).toBe('real');
        });
    });

    describe('@PrimaryColumn Decorator', () => {
        test('should register primary column', () => {
            @Entity('test_primary_column')
            class TestPrimaryColumnEntity extends BaseEntity {
                @PrimaryColumn()
                id!: number;

                @Column()
                name!: string;
            }

            const columns = metadataContainer.getColumns(TestPrimaryColumnEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(TestPrimaryColumnEntity as EntityConstructor);

            expect(columns.has('id')).toBe(true);
            expect(primaryColumns).toHaveLength(1);

            const columnMeta = columns.get('id');
            expect(columnMeta?.isPrimary).toBe(true);
            expect(columnMeta?.isGenerated).toBe(false);
            expect(columnMeta?.unique).toBe(true);
            expect(columnMeta?.nullable).toBe(false);
        });

        test('should infer primary column type', () => {
            @Entity('test_string_primary')
            class TestStringPrimaryEntity extends BaseEntity {
                @PrimaryColumn()
                code!: string;
            }

            @Entity('test_int_primary')
            class TestIntPrimaryEntity extends BaseEntity {
                @PrimaryColumn()
                id!: number;
            }

            const stringColumns = metadataContainer.getColumns(TestStringPrimaryEntity as EntityConstructor);
            const intColumns = metadataContainer.getColumns(TestIntPrimaryEntity as EntityConstructor);

            expect(stringColumns.get('code')?.type).toBe('text');
            expect(intColumns.get('id')?.type).toBe('integer');
        });
    });

    describe('@PrimaryGeneratedColumn Decorator', () => {
        test('should register auto-increment primary column', () => {
            @Entity('test_auto_increment')
            class TestAutoIncrementEntity extends BaseEntity {
                @PrimaryGeneratedColumn('int')
                id!: number;

                @Column()
                name!: string;
            }

            const columns = metadataContainer.getColumns(TestAutoIncrementEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(TestAutoIncrementEntity as EntityConstructor);

            expect(columns.has('id')).toBe(true);
            expect(primaryColumns).toHaveLength(1);

            const columnMeta = columns.get('id');
            expect(columnMeta?.isPrimary).toBe(true);
            expect(columnMeta?.isGenerated).toBe(true);
            expect(columnMeta?.generationStrategy).toBe('increment');
            expect(columnMeta?.type).toBe('integer');
        });

        test('should register UUID primary column', () => {
            @Entity('test_uuid_primary')
            class TestUuidPrimaryEntity extends BaseEntity {
                @PrimaryGeneratedColumn('uuid')
                id!: string;

                @Column()
                name!: string;
            }

            const columns = metadataContainer.getColumns(TestUuidPrimaryEntity as EntityConstructor);
            const columnMeta = columns.get('id');

            expect(columnMeta?.isPrimary).toBe(true);
            expect(columnMeta?.isGenerated).toBe(true);
            expect(columnMeta?.generationStrategy).toBe('uuid');
            expect(columnMeta?.type).toBe('text');
        });

        test('should default to int strategy', () => {
            @Entity('test_default_strategy')
            class TestDefaultStrategyEntity extends BaseEntity {
                @PrimaryGeneratedColumn()
                id!: number;

                @Column()
                name!: string;
            }

            const columns = metadataContainer.getColumns(TestDefaultStrategyEntity as EntityConstructor);
            const columnMeta = columns.get('id');

            expect(columnMeta?.generationStrategy).toBe('increment');
            expect(columnMeta?.type).toBe('integer');
        });
    });

    describe('Combined Decorators', () => {
        test('should handle entity with mixed column types', () => {
            @Entity('test_complex_entity')
            class TestComplexEntity extends BaseEntity {
                @PrimaryGeneratedColumn('int')
                id!: number;

                @Column({ unique: true, nullable: false })
                email!: string;

                @Column({ nullable: true })
                name?: string;

                @Column({ type: 'real', default: 0.0 })
                score!: number;

                @Column({ type: 'integer', default: () => Date.now() })
                timestamp!: number;
            }

            const columns = metadataContainer.getColumns(TestComplexEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(TestComplexEntity as EntityConstructor);

            // Verify entity registration
            expect(metadataContainer.hasEntity(TestComplexEntity as EntityConstructor)).toBe(true);
            expect(metadataContainer.getTableName(TestComplexEntity as EntityConstructor)).toBe('test_complex_entity');

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
            @Entity('test_user_role')
            class TestUserRoleEntity extends BaseEntity {
                @PrimaryColumn()
                userId!: number;

                @PrimaryColumn()
                roleId!: number;

                @Column()
                createdAt!: Date;
            }

            const primaryColumns = metadataContainer.getPrimaryColumns(TestUserRoleEntity as EntityConstructor);

            expect(primaryColumns).toHaveLength(2);
            const primaryKeys = primaryColumns.map((col: { propertyName: string }) => col.propertyName);
            expect(primaryKeys).toContain('userId');
            expect(primaryKeys).toContain('roleId');
        });
    });

    describe('Entity Registration', () => {
        test('should register entities with explicit @Entity decorators', () => {
            @Entity('auto_entity1')
            class TestAutoEntity1 extends BaseEntity {
                @Column()
                name!: string;
            }

            @Entity('auto_entity2')
            class TestAutoEntity2 extends BaseEntity {
                @Column()
                value!: number;
            }

            @Entity('auto_entity3')
            class TestAutoEntity3 extends BaseEntity {
                @Column()
                data!: string;
            }

            // All should be explicitly registered
            expect(metadataContainer.hasEntity(TestAutoEntity1 as EntityConstructor)).toBe(true);
            expect(metadataContainer.hasEntity(TestAutoEntity2 as EntityConstructor)).toBe(true);
            expect(metadataContainer.hasEntity(TestAutoEntity3 as EntityConstructor)).toBe(true);

            // Table names should match explicit @Entity decorator names
            expect(metadataContainer.getTableName(TestAutoEntity1 as EntityConstructor)).toBe('auto_entity1');
            expect(metadataContainer.getTableName(TestAutoEntity2 as EntityConstructor)).toBe('auto_entity2');
            expect(metadataContainer.getTableName(TestAutoEntity3 as EntityConstructor)).toBe('auto_entity3');
        });

        test('should prefer explicit @Entity table name over auto-registration', () => {
            @Entity('explicit_table')
            class TestExplicitEntity extends BaseEntity {
                @Column()
                name!: string;
            }

            expect(metadataContainer.getTableName(TestExplicitEntity as EntityConstructor)).toBe('explicit_table');
        });
    });

    describe('Inline Entity Integration', () => {
        test('should validate auto-increment primary key setup', () => {
            @Entity('test_int_pk_entity')
            class TestIntPrimaryKeyEntity extends BaseEntity {
                @PrimaryGeneratedColumn('int')
                id!: number;

                @Column()
                name!: string;
            }

            expect(metadataContainer.hasEntity(TestIntPrimaryKeyEntity as EntityConstructor)).toBe(true);
            expect(metadataContainer.getTableName(TestIntPrimaryKeyEntity as EntityConstructor)).toBe(
                'test_int_pk_entity'
            );

            const columns = metadataContainer.getColumns(TestIntPrimaryKeyEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(TestIntPrimaryKeyEntity as EntityConstructor);

            expect(primaryColumns).toHaveLength(1);
            expect(primaryColumns[0].propertyName).toBe('id');
            expect(primaryColumns[0].generationStrategy).toBe('increment');
            expect(columns.get('id')?.type).toBe('integer');
        });

        test('should validate UUID primary key setup', () => {
            @Entity('test_uuid_pk_entity')
            class TestUuidPrimaryKeyEntity extends BaseEntity {
                @PrimaryGeneratedColumn('uuid')
                id!: string;

                @Column()
                name!: string;
            }

            expect(metadataContainer.hasEntity(TestUuidPrimaryKeyEntity as EntityConstructor)).toBe(true);
            expect(metadataContainer.getTableName(TestUuidPrimaryKeyEntity as EntityConstructor)).toBe(
                'test_uuid_pk_entity'
            );

            const columns = metadataContainer.getColumns(TestUuidPrimaryKeyEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(TestUuidPrimaryKeyEntity as EntityConstructor);

            expect(primaryColumns).toHaveLength(1);
            expect(primaryColumns[0].propertyName).toBe('id');
            expect(primaryColumns[0].generationStrategy).toBe('uuid');
            expect(columns.get('id')?.type).toBe('text');
        });

        test('should validate string primary key setup', () => {
            @Entity('test_string_pk_entity')
            class TestStringPrimaryKeyEntity extends BaseEntity {
                @PrimaryColumn()
                code!: string;

                @Column()
                name!: string;
            }

            expect(metadataContainer.hasEntity(TestStringPrimaryKeyEntity as EntityConstructor)).toBe(true);
            expect(metadataContainer.getTableName(TestStringPrimaryKeyEntity as EntityConstructor)).toBe(
                'test_string_pk_entity'
            );

            const columns = metadataContainer.getColumns(TestStringPrimaryKeyEntity as EntityConstructor);
            const primaryColumns = metadataContainer.getPrimaryColumns(TestStringPrimaryKeyEntity as EntityConstructor);

            expect(primaryColumns).toHaveLength(1);
            expect(primaryColumns[0].propertyName).toBe('code');
            expect(primaryColumns[0].isGenerated).toBe(false);
            expect(columns.get('code')?.type).toBe('text');
        });

        test('should validate all column types', () => {
            @Entity('test_all_column_types')
            class TestAllColumnTypesEntity extends BaseEntity {
                @PrimaryGeneratedColumn('int')
                id!: number;

                @Column()
                textColumn!: string;

                @Column()
                integerColumn!: number;

                @Column({ type: 'real' })
                realColumn!: number;

                @Column({ type: 'blob' })
                blobColumn!: Buffer;

                @Column({ nullable: true })
                nullableText?: string;

                @Column({ nullable: true })
                nullableInteger?: number;
            }

            expect(metadataContainer.hasEntity(TestAllColumnTypesEntity as EntityConstructor)).toBe(true);

            const columns = metadataContainer.getColumns(TestAllColumnTypesEntity as EntityConstructor);

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
