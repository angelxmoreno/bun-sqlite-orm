import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getGlobalMetadataContainer } from '../../../src/container';
import { Column } from '../../../src/decorators/column';
import { Entity } from '../../../src/decorators/entity';
import { Index } from '../../../src/decorators/index-decorator';
import { PrimaryGeneratedColumn } from '../../../src/decorators/primary-generated-column';
import { BaseEntity } from '../../../src/entity';

describe('Index Decorator Unit Tests', () => {
    let metadataContainer: ReturnType<typeof getGlobalMetadataContainer>;

    beforeEach(() => {
        metadataContainer = getGlobalMetadataContainer();
        // Note: We don't clear the container here because class decorators
        // run at definition time and would be lost
    });

    afterEach(() => {
        // Note: We don't reset global metadata here because this is testing
        // decorator infrastructure and inline entities are necessary for testing
        // the actual decorator registration behavior.
    });

    test('should create simple property-level index with auto-generated name', () => {
        // Define test entity inline to avoid inheritance dependency issues
        @Entity('test_simple_index_entity')
        class TestSimpleIndexEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text' })
            name!: string;

            @Column({ type: 'text', index: true })
            email!: string;

            @Index()
            @Column({ type: 'text' })
            phone!: string;

            @Column({ type: 'text' })
            address!: string;
        }

        const indexes = metadataContainer.getIndexes(TestSimpleIndexEntity);

        const phoneIndex = indexes.find((idx) => idx.columns.includes('phone'));
        expect(phoneIndex).toBeDefined();
        expect(phoneIndex?.name).toBe('idx_test_simple_index_entity_phone');
        expect(phoneIndex?.columns).toEqual(['phone']);
        expect(phoneIndex?.unique).toBe(false);
    });

    test('should create property-level index with custom name', () => {
        // Define test entity inline to avoid inheritance dependency issues
        @Entity('test_custom_index_entity')
        class TestCustomIndexEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text' })
            name!: string;

            @Column({ type: 'text', index: 'idx_custom_email' })
            email!: string;

            @Index('idx_custom_phone')
            @Column({ type: 'text' })
            phone!: string;

            @Column({ type: 'text' })
            city!: string;
        }

        const indexes = metadataContainer.getIndexes(TestCustomIndexEntity);

        const phoneIndex = indexes.find((idx) => idx.name === 'idx_custom_phone');
        expect(phoneIndex).toBeDefined();
        expect(phoneIndex?.columns).toEqual(['phone']);
        expect(phoneIndex?.unique).toBe(false);
    });

    test('should create composite indexes at class level', () => {
        // Define test entity inline to avoid inheritance dependency issues
        @Entity('test_composite_index_entity')
        @Index('idx_full_name', ['firstName', 'lastName'])
        @Index('idx_name_age', ['firstName', 'lastName', 'age'])
        @Index('idx_unique_email_status', ['email', 'status'], { unique: true })
        class TestCompositeIndexEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text' })
            firstName!: string;

            @Column({ type: 'text' })
            lastName!: string;

            @Column({ type: 'integer' })
            age!: number;

            @Column({ type: 'text' })
            email!: string;

            @Column({ type: 'text' })
            status!: string;
        }

        const indexes = metadataContainer.getIndexes(TestCompositeIndexEntity);
        expect(indexes).toHaveLength(3);

        const nameComposite = indexes.find((idx) => idx.name === 'idx_full_name');
        expect(nameComposite).toBeDefined();
        expect(nameComposite?.columns).toEqual(['firstName', 'lastName']);
        expect(nameComposite?.unique).toBe(false);

        const uniqueComposite = indexes.find((idx) => idx.name === 'idx_unique_email_status');
        expect(uniqueComposite).toBeDefined();
        expect(uniqueComposite?.columns).toEqual(['email', 'status']);
        expect(uniqueComposite?.unique).toBe(true);
    });

    test('should auto-register entity when using Index decorator', () => {
        // Define test entities inline to ensure reliable decorator execution
        @Entity('test_auto_register_simple')
        class TestAutoRegisterSimple extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index()
            @Column({ type: 'text' })
            name!: string;
        }

        @Entity('test_auto_register_composite')
        @Index('idx_test_composite', ['firstName', 'lastName'])
        class TestAutoRegisterComposite extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text' })
            firstName!: string;

            @Column({ type: 'text' })
            lastName!: string;
        }

        // Test that entities are registered automatically when Index decorator is used
        expect(metadataContainer.hasEntity(TestAutoRegisterSimple)).toBe(true);
        expect(metadataContainer.hasEntity(TestAutoRegisterComposite)).toBe(true);

        const tableName1 = metadataContainer.getTableName(TestAutoRegisterSimple);
        expect(tableName1).toBe('test_auto_register_simple');

        const tableName2 = metadataContainer.getTableName(TestAutoRegisterComposite);
        expect(tableName2).toBe('test_auto_register_composite');
    });

    test('should throw error for duplicate index names', () => {
        expect(() => {
            @Entity('duplicate_index_test')
            @Index('duplicate_name', ['firstName'])
            @Index('duplicate_name', ['lastName']) // This should throw
            class DuplicateIndexEntity {
                @Column()
                firstName!: string;

                @Column()
                lastName!: string;
            }
        }).toThrow("Index name 'duplicate_name' is already used by another entity");
    });

    test('should require index name for composite indexes', () => {
        expect(() => {
            // @ts-expect-error Testing invalid usage
            @Index(undefined, ['firstName', 'lastName'])
            class InvalidCompositeIndex {
                @Column()
                firstName!: string;

                @Column()
                lastName!: string;
            }
        }).toThrow('Index name is required for composite indexes');
    });

    test('should throw error when composite index has empty columns array', () => {
        expect(() => {
            @Entity('empty_columns_composite_test')
            @Index('idx_empty_composite', []) // Empty array should throw
            class EmptyColumnsCompositeEntity {
                @Column()
                name!: string;

                @Column()
                email!: string;
            }
        }).toThrow('Composite index must specify at least one column');
    });

    test('should handle property decorator without property name', () => {
        expect(() => {
            class TestEntity {
                // This would be invalid usage - decorator without proper property
            }

            const decorator = Index();
            // @ts-expect-error Testing invalid usage
            decorator(TestEntity.prototype, undefined);
        }).toThrow('@Index decorator on property requires a property name');
    });

    test('should create index metadata with correct default options', () => {
        // Define test entity inline to avoid inheritance dependency issues
        @Entity('test_index_metadata_entity')
        class TestIndexMetadataEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index()
            @Column({ type: 'text' })
            name!: string;

            @Index('idx_custom')
            @Column({ type: 'text' })
            email!: string;
        }

        const indexes = metadataContainer.getIndexes(TestIndexMetadataEntity);

        for (const index of indexes) {
            expect(index.name).toBeDefined();
            expect(index.columns).toBeDefined();
            expect(Array.isArray(index.columns)).toBe(true);
            expect(index.columns.length).toBeGreaterThan(0);
            expect(typeof index.unique).toBe('boolean');
        }
    });
});

describe('Property-level @Index Decorator with Options Tests', () => {
    let metadataContainer: ReturnType<typeof getGlobalMetadataContainer>;

    beforeEach(() => {
        metadataContainer = getGlobalMetadataContainer();
        // Note: We don't clear the container here because class decorators
        // run at definition time and would be lost
    });

    // Using shared UniqueIndexEntity which has the required index patterns

    test('should create unique index with auto-generated name via @Index({ unique: true })', () => {
        // Define test entity inline to avoid inheritance dependency issues
        @Entity('test_unique_index_entity')
        class TestUniqueIndexEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text' })
            name!: string;

            @Index({ unique: true })
            @Column({ type: 'text' })
            uniqueEmail!: string;

            @Index('idx_unique_auto_code', { unique: true })
            @Column({ type: 'text' })
            uniqueCode!: string;
        }

        const indexes = metadataContainer.getIndexes(TestUniqueIndexEntity);

        const uniqueIndex = indexes.find((idx) => idx.columns.includes('uniqueEmail'));
        expect(uniqueIndex).toBeDefined();
        expect(uniqueIndex?.unique).toBe(true);
        expect(uniqueIndex?.name).toBe('idx_test_unique_index_entity_uniqueEmail');
        expect(uniqueIndex?.columns).toEqual(['uniqueEmail']);
    });

    test('should create unique index with custom name via @Index("name", { unique: true })', () => {
        // Define test entity inline to avoid inheritance dependency issues
        @Entity('test_unique_custom_entity')
        class TestUniqueCustomEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index('idx_unique_custom_code', { unique: true })
            @Column({ type: 'text' })
            uniqueCode!: string;
        }

        const indexes = metadataContainer.getIndexes(TestUniqueCustomEntity);

        const uniqueCustomIndex = indexes.find((idx) => idx.name === 'idx_unique_custom_code');
        expect(uniqueCustomIndex).toBeDefined();
        expect(uniqueCustomIndex?.unique).toBe(true);
        expect(uniqueCustomIndex?.columns).toEqual(['uniqueCode']);
    });

    test('should create non-unique index with auto-generated name via @Index({ unique: false })', () => {
        // Define test entity inline to avoid inheritance dependency issues
        @Entity('test_non_unique_entity')
        class TestNonUniqueEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index({ unique: false })
            @Column({ type: 'text' })
            phone!: string;
        }

        const indexes = metadataContainer.getIndexes(TestNonUniqueEntity);

        const phoneIndex = indexes.find((idx) => idx.columns.includes('phone'));
        expect(phoneIndex).toBeDefined();
        expect(phoneIndex?.unique).toBe(false);
        expect(phoneIndex?.name).toBe('idx_test_non_unique_entity_phone');
        expect(phoneIndex?.columns).toEqual(['phone']);
    });

    test('should create non-unique index with custom name via @Index("name", { unique: false })', () => {
        // Define test entity inline to avoid inheritance dependency issues
        @Entity('test_custom_non_unique_entity')
        class TestCustomNonUniqueEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index('idx_custom_non_unique_phone', { unique: false })
            @Column({ type: 'text' })
            phone!: string;
        }

        const indexes = metadataContainer.getIndexes(TestCustomNonUniqueEntity);

        const phoneIndex = indexes.find((idx) => idx.name === 'idx_custom_non_unique_phone');
        expect(phoneIndex).toBeDefined();
        expect(phoneIndex?.unique).toBe(false);
        expect(phoneIndex?.columns).toEqual(['phone']);
    });

    test('should have correct mix of unique and non-unique indexes', () => {
        // Define test entities inline to avoid inheritance dependency issues
        @Entity('test_unique_mix_entity')
        class TestUniqueMixEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index({ unique: true })
            @Column({ type: 'text' })
            uniqueEmail!: string;

            @Index('idx_unique_mix_code', { unique: true })
            @Column({ type: 'text' })
            uniqueCode!: string;
        }

        @Entity('test_non_unique_mix_entity')
        class TestNonUniqueMixEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index()
            @Column({ type: 'text' })
            name!: string;

            @Index({ unique: false })
            @Column({ type: 'text' })
            email!: string;
        }

        const uniqueIndexes = metadataContainer.getIndexes(TestUniqueMixEntity);
        expect(uniqueIndexes).toHaveLength(2);

        const allUnique = uniqueIndexes.every((idx) => idx.unique);
        expect(allUnique).toBe(true);

        const nonUniqueIndexes = metadataContainer.getIndexes(TestNonUniqueMixEntity);
        const allNonUnique = nonUniqueIndexes.filter((idx) => !idx.unique);
        expect(allNonUnique.length).toBeGreaterThan(0);
    });
});

describe('Column-level Unique Index Tests', () => {
    let metadataContainer: ReturnType<typeof getGlobalMetadataContainer>;

    beforeEach(() => {
        metadataContainer = getGlobalMetadataContainer();
        // Note: We don't clear the container here because class decorators
        // run at definition time and would be lost
    });

    // Using shared SimpleIndexEntity and CustomIndexEntity for column index testing

    test('should create non-unique indexes for boolean and string options', () => {
        // Define test entities inline to avoid inheritance dependency issues
        @Entity('test_column_index_simple')
        class TestColumnIndexSimple extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text', index: true })
            email!: string;
        }

        @Entity('test_column_index_custom')
        class TestColumnIndexCustom extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text', index: 'idx_column_custom_email' })
            email!: string;
        }

        const simpleIndexes = metadataContainer.getIndexes(TestColumnIndexSimple);
        const emailIndex = simpleIndexes.find((idx) => idx.columns.includes('email'));
        expect(emailIndex).toBeDefined();
        expect(emailIndex?.unique).toBe(false);
        expect(emailIndex?.name).toBe('idx_test_column_index_simple_email');

        const customIndexes = metadataContainer.getIndexes(TestColumnIndexCustom);
        const customEmailIndex = customIndexes.find((idx) => idx.columns.includes('email'));
        expect(customEmailIndex).toBeDefined();
        expect(customEmailIndex?.unique).toBe(false);
        expect(customEmailIndex?.name).toBe('idx_column_custom_email');
    });

    test('should create unique indexes when specified via object syntax', () => {
        // Define test entity inline to avoid inheritance dependency issues
        @Entity('test_unique_object_syntax')
        class TestUniqueObjectSyntax extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index({ unique: true })
            @Column({ type: 'text' })
            uniqueEmail!: string;

            @Index('idx_unique_syntax_code', { unique: true })
            @Column({ type: 'text' })
            uniqueCode!: string;
        }

        const indexes = metadataContainer.getIndexes(TestUniqueObjectSyntax);

        const uniqueEmailIndex = indexes.find((idx) => idx.columns.includes('uniqueEmail'));
        expect(uniqueEmailIndex).toBeDefined();
        expect(uniqueEmailIndex?.unique).toBe(true);
        expect(uniqueEmailIndex?.name).toBe('idx_test_unique_object_syntax_uniqueEmail');

        const uniqueCodeIndex = indexes.find((idx) => idx.columns.includes('uniqueCode'));
        expect(uniqueCodeIndex).toBeDefined();
        expect(uniqueCodeIndex?.unique).toBe(true);
        expect(uniqueCodeIndex?.name).toBe('idx_unique_syntax_code');
    });

    test('should handle object syntax with non-unique indexes', () => {
        // Define test entities inline to avoid inheritance dependency issues
        @Entity('test_object_syntax_simple')
        class TestObjectSyntaxSimple extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text', index: true })
            email!: string;
        }

        @Entity('test_object_syntax_custom')
        class TestObjectSyntaxCustom extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index('idx_object_syntax_phone')
            @Column({ type: 'text' })
            phone!: string;
        }

        const simpleIndexes = metadataContainer.getIndexes(TestObjectSyntaxSimple);
        const customIndexes = metadataContainer.getIndexes(TestObjectSyntaxCustom);

        const emailIndex = simpleIndexes.find((idx) => idx.columns.includes('email'));
        expect(emailIndex).toBeDefined();
        expect(emailIndex?.unique).toBe(false);
        expect(emailIndex?.name).toBe('idx_test_object_syntax_simple_email');

        const phoneIndex = customIndexes.find((idx) => idx.columns.includes('phone'));
        expect(phoneIndex).toBeDefined();
        expect(phoneIndex?.unique).toBe(false);
        expect(phoneIndex?.name).toBe('idx_object_syntax_phone');
    });

    test('should handle all index configuration variations correctly', () => {
        // Define test entities inline to avoid inheritance dependency issues
        @Entity('test_config_unique')
        class TestConfigUnique extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index({ unique: true })
            @Column({ type: 'text' })
            uniqueEmail!: string;

            @Index('idx_config_unique_code', { unique: true })
            @Column({ type: 'text' })
            uniqueCode!: string;
        }

        @Entity('test_config_simple')
        class TestConfigSimple extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index()
            @Column({ type: 'text' })
            name!: string;

            @Column({ type: 'text', index: true })
            email!: string;
        }

        @Entity('test_config_custom')
        class TestConfigCustom extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Index('idx_config_custom_phone')
            @Column({ type: 'text' })
            phone!: string;
        }

        const uniqueIndexes = metadataContainer.getIndexes(TestConfigUnique);
        const simpleIndexes = metadataContainer.getIndexes(TestConfigSimple);
        const customIndexes = metadataContainer.getIndexes(TestConfigCustom);

        // Check that unique indexes are correctly marked
        const allUniqueIndexes = uniqueIndexes.filter((idx) => idx.unique);
        expect(allUniqueIndexes).toHaveLength(2);

        const allNonUniqueFromSimple = simpleIndexes.filter((idx) => !idx.unique);
        const allNonUniqueFromCustom = customIndexes.filter((idx) => !idx.unique);
        expect(allNonUniqueFromSimple.length + allNonUniqueFromCustom.length).toBeGreaterThan(0);
    });
});

describe('Composite Index Validation Tests', () => {
    let metadataContainer: ReturnType<typeof getGlobalMetadataContainer>;

    beforeEach(() => {
        metadataContainer = getGlobalMetadataContainer();
    });

    test('should throw error for empty columns array', () => {
        expect(() => {
            @Entity('empty_columns_test')
            @Index('idx_empty', []) // Empty array should throw
            class EmptyColumnsEntity {
                @Column()
                name!: string;
            }
        }).toThrow('Composite index must specify at least one column');
    });

    test('should throw error for duplicate column names', () => {
        expect(() => {
            @Entity('duplicate_columns_test')
            @Index('idx_duplicate', ['name', 'email', 'name']) // Duplicate 'name'
            class DuplicateColumnsEntity {
                @Column()
                name!: string;

                @Column()
                email!: string;
            }
        }).toThrow("Duplicate column names in index 'idx_duplicate': name");
    });

    test('should throw error for non-existent columns', () => {
        expect(() => {
            @Entity('non_existent_columns_test')
            @Index('idx_invalid', ['name', 'nonExistentColumn']) // nonExistentColumn doesn't exist
            class NonExistentColumnsEntity {
                @Column()
                name!: string;
            }
        }).toThrow("Index 'idx_invalid' references non-existent columns: nonExistentColumn");
    });

    test('should throw error for multiple non-existent columns', () => {
        expect(() => {
            @Entity('multiple_invalid_test')
            @Index('idx_multiple_invalid', ['name', 'invalid1', 'invalid2'])
            class MultipleInvalidEntity {
                @Column()
                name!: string;
            }
        }).toThrow("Index 'idx_multiple_invalid' references non-existent columns: invalid1, invalid2");
    });

    test('should allow valid composite index with existing columns', () => {
        @Entity('valid_composite_test')
        @Index('idx_valid_composite', ['firstName', 'lastName'])
        class ValidCompositeEntity {
            @Column()
            firstName!: string;

            @Column()
            lastName!: string;
        }

        // Should not throw and should create the index
        const indexes = metadataContainer.getIndexes(ValidCompositeEntity);
        const compositeIndex = indexes.find((idx) => idx.name === 'idx_valid_composite');
        expect(compositeIndex).toBeDefined();
        expect(compositeIndex?.columns).toEqual(['firstName', 'lastName']);
    });

    test('should validate columns in correct order for composite index', () => {
        @Entity('ordered_composite_test')
        @Index('idx_ordered', ['lastName', 'firstName', 'middleName'])
        class OrderedCompositeEntity {
            @Column()
            firstName!: string;

            @Column()
            middleName!: string;

            @Column()
            lastName!: string;
        }

        const indexes = metadataContainer.getIndexes(OrderedCompositeEntity);
        const orderedIndex = indexes.find((idx) => idx.name === 'idx_ordered');
        expect(orderedIndex).toBeDefined();
        expect(orderedIndex?.columns).toEqual(['lastName', 'firstName', 'middleName']);
    });

    test('should handle null columns parameter', () => {
        expect(() => {
            @Entity('null_columns_test')
            // Testing invalid usage - passing null as columns array
            @Index('idx_null', null as unknown as string[])
            class NullColumnsEntity {
                @Column()
                name!: string;
            }
        }).toThrow('Composite index must specify at least one column');
    });
});
