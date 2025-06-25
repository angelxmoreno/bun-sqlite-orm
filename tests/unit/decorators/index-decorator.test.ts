import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getGlobalMetadataContainer } from '../../../src/container';
import { Column } from '../../../src/decorators/column';
import { Entity } from '../../../src/decorators/entity';
import { Index } from '../../../src/decorators/index-decorator';
import {
    CompositeIndexEntity,
    CustomIndexEntity,
    SimpleIndexEntity,
    UniqueIndexEntity,
} from '../../helpers/mock-entities';

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
        const indexes = metadataContainer.getIndexes(SimpleIndexEntity);

        const phoneIndex = indexes.find((idx) => idx.columns.includes('phone'));
        expect(phoneIndex).toBeDefined();
        expect(phoneIndex?.name).toBe('idx_simple_index_entity_phone');
        expect(phoneIndex?.columns).toEqual(['phone']);
        expect(phoneIndex?.unique).toBe(false);
    });

    test('should create property-level index with custom name', () => {
        const indexes = metadataContainer.getIndexes(CustomIndexEntity);

        const phoneIndex = indexes.find((idx) => idx.name === 'idx_custom_phone');
        expect(phoneIndex).toBeDefined();
        expect(phoneIndex?.columns).toEqual(['phone']);
        expect(phoneIndex?.unique).toBe(false);
    });

    test('should create composite indexes at class level', () => {
        const indexes = metadataContainer.getIndexes(CompositeIndexEntity);
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
        // Test that entity gets registered automatically when Index decorator is used
        expect(metadataContainer.hasEntity(SimpleIndexEntity)).toBe(true);
        expect(metadataContainer.hasEntity(CompositeIndexEntity)).toBe(true);

        const tableName1 = metadataContainer.getTableName(SimpleIndexEntity);
        expect(tableName1).toBe('simple_index_entity');

        const tableName2 = metadataContainer.getTableName(CompositeIndexEntity);
        expect(tableName2).toBe('composite_index_entity');
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
        const indexes = metadataContainer.getIndexes(SimpleIndexEntity);

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
        const indexes = metadataContainer.getIndexes(UniqueIndexEntity);

        const uniqueIndex = indexes.find((idx) => idx.columns.includes('uniqueEmail'));
        expect(uniqueIndex).toBeDefined();
        expect(uniqueIndex?.unique).toBe(true);
        expect(uniqueIndex?.name).toBe('idx_unique_index_entity_uniqueEmail');
        expect(uniqueIndex?.columns).toEqual(['uniqueEmail']);
    });

    test('should create unique index with custom name via @Index("name", { unique: true })', () => {
        const indexes = metadataContainer.getIndexes(UniqueIndexEntity);

        const uniqueCustomIndex = indexes.find((idx) => idx.name === 'idx_unique_code');
        expect(uniqueCustomIndex).toBeDefined();
        expect(uniqueCustomIndex?.unique).toBe(true);
        expect(uniqueCustomIndex?.columns).toEqual(['uniqueCode']);
    });

    test('should create non-unique index with auto-generated name via @Index({ unique: false })', () => {
        const indexes = metadataContainer.getIndexes(SimpleIndexEntity);

        const phoneIndex = indexes.find((idx) => idx.columns.includes('phone'));
        expect(phoneIndex).toBeDefined();
        expect(phoneIndex?.unique).toBe(false);
        expect(phoneIndex?.name).toBe('idx_simple_index_entity_phone');
        expect(phoneIndex?.columns).toEqual(['phone']);
    });

    test('should create non-unique index with custom name via @Index("name", { unique: false })', () => {
        const indexes = metadataContainer.getIndexes(CustomIndexEntity);

        const phoneIndex = indexes.find((idx) => idx.name === 'idx_custom_phone');
        expect(phoneIndex).toBeDefined();
        expect(phoneIndex?.unique).toBe(false);
        expect(phoneIndex?.columns).toEqual(['phone']);
    });

    test('should have correct mix of unique and non-unique indexes', () => {
        const uniqueIndexes = metadataContainer.getIndexes(UniqueIndexEntity);
        expect(uniqueIndexes).toHaveLength(2);

        const allUnique = uniqueIndexes.every((idx) => idx.unique);
        expect(allUnique).toBe(true);

        const simpleIndexes = metadataContainer.getIndexes(SimpleIndexEntity);
        const nonUniqueFromSimple = simpleIndexes.filter((idx) => !idx.unique);
        expect(nonUniqueFromSimple.length).toBeGreaterThan(0);
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
        const simpleIndexes = metadataContainer.getIndexes(SimpleIndexEntity);

        const emailIndex = simpleIndexes.find((idx) => idx.columns.includes('email'));
        expect(emailIndex).toBeDefined();
        expect(emailIndex?.unique).toBe(false);
        expect(emailIndex?.name).toBe('idx_simple_index_entity_email');

        const customIndexes = metadataContainer.getIndexes(CustomIndexEntity);
        const customEmailIndex = customIndexes.find((idx) => idx.columns.includes('email'));
        expect(customEmailIndex).toBeDefined();
        expect(customEmailIndex?.unique).toBe(false);
        expect(customEmailIndex?.name).toBe('idx_custom_email');
    });

    test('should create unique indexes when specified via object syntax', () => {
        const indexes = metadataContainer.getIndexes(UniqueIndexEntity);

        const uniqueEmailIndex = indexes.find((idx) => idx.columns.includes('uniqueEmail'));
        expect(uniqueEmailIndex).toBeDefined();
        expect(uniqueEmailIndex?.unique).toBe(true);
        expect(uniqueEmailIndex?.name).toBe('idx_unique_index_entity_uniqueEmail');

        const uniqueCodeIndex = indexes.find((idx) => idx.columns.includes('uniqueCode'));
        expect(uniqueCodeIndex).toBeDefined();
        expect(uniqueCodeIndex?.unique).toBe(true);
        expect(uniqueCodeIndex?.name).toBe('idx_unique_code');
    });

    test('should handle object syntax with non-unique indexes', () => {
        const simpleIndexes = metadataContainer.getIndexes(SimpleIndexEntity);
        const customIndexes = metadataContainer.getIndexes(CustomIndexEntity);

        const emailIndex = simpleIndexes.find((idx) => idx.columns.includes('email'));
        expect(emailIndex).toBeDefined();
        expect(emailIndex?.unique).toBe(false);
        expect(emailIndex?.name).toBe('idx_simple_index_entity_email');

        const phoneIndex = customIndexes.find((idx) => idx.columns.includes('phone'));
        expect(phoneIndex).toBeDefined();
        expect(phoneIndex?.unique).toBe(false);
        expect(phoneIndex?.name).toBe('idx_custom_phone');
    });

    test('should handle all index configuration variations correctly', () => {
        const uniqueIndexes = metadataContainer.getIndexes(UniqueIndexEntity);
        const simpleIndexes = metadataContainer.getIndexes(SimpleIndexEntity);
        const customIndexes = metadataContainer.getIndexes(CustomIndexEntity);

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
