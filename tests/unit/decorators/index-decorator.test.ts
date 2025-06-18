import { beforeEach, describe, expect, test } from 'bun:test';
import { getGlobalMetadataContainer } from '../../../src/container';
import { Column } from '../../../src/decorators/column';
import { Entity } from '../../../src/decorators/entity';
import { Index } from '../../../src/decorators/index-decorator';

// Test entities
@Entity('index_decorator_test')
class IndexDecoratorTestEntity {
    @Index()
    @Column()
    simpleIndex!: string;

    @Index('custom_index_name')
    @Column()
    namedIndex!: string;

    @Column()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column()
    email!: string;

    @Column()
    status!: string;
}

@Entity('composite_index_entity')
@Index('idx_name_composite', ['firstName', 'lastName'])
@Index('idx_unit_test_unique_email_status', ['email', 'status'], { unique: true })
class CompositeIndexEntity {
    @Column()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column()
    email!: string;

    @Column()
    status!: string;
}

describe('Index Decorator Unit Tests', () => {
    let metadataContainer: ReturnType<typeof getGlobalMetadataContainer>;

    beforeEach(() => {
        metadataContainer = getGlobalMetadataContainer();
        // Note: We don't clear the container here because class decorators
        // run at definition time and would be lost
    });

    test('should create simple property-level index with auto-generated name', () => {
        const indexes = metadataContainer.getIndexes(IndexDecoratorTestEntity);

        const simpleIndex = indexes.find((idx) => idx.columns.includes('simpleIndex'));
        expect(simpleIndex).toBeDefined();
        expect(simpleIndex?.name).toBe('idx_index_decorator_test_simpleIndex');
        expect(simpleIndex?.columns).toEqual(['simpleIndex']);
        expect(simpleIndex?.unique).toBe(false);
    });

    test('should create property-level index with custom name', () => {
        const indexes = metadataContainer.getIndexes(IndexDecoratorTestEntity);

        const namedIndex = indexes.find((idx) => idx.name === 'custom_index_name');
        expect(namedIndex).toBeDefined();
        expect(namedIndex?.columns).toEqual(['namedIndex']);
        expect(namedIndex?.unique).toBe(false);
    });

    test('should create composite indexes at class level', () => {
        const indexes = metadataContainer.getIndexes(CompositeIndexEntity);
        expect(indexes).toHaveLength(2);

        const nameComposite = indexes.find((idx) => idx.name === 'idx_name_composite');
        expect(nameComposite).toBeDefined();
        expect(nameComposite?.columns).toEqual(['firstName', 'lastName']);
        expect(nameComposite?.unique).toBe(false);

        const uniqueComposite = indexes.find((idx) => idx.name === 'idx_unit_test_unique_email_status');
        expect(uniqueComposite).toBeDefined();
        expect(uniqueComposite?.columns).toEqual(['email', 'status']);
        expect(uniqueComposite?.unique).toBe(true);
    });

    test('should auto-register entity when using Index decorator', () => {
        // Test that entity gets registered automatically when Index decorator is used
        expect(metadataContainer.hasEntity(IndexDecoratorTestEntity)).toBe(true);
        expect(metadataContainer.hasEntity(CompositeIndexEntity)).toBe(true);

        const tableName1 = metadataContainer.getTableName(IndexDecoratorTestEntity);
        expect(tableName1).toBe('index_decorator_test');

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
        const indexes = metadataContainer.getIndexes(IndexDecoratorTestEntity);

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

    @Entity('property_index_options_test')
    class PropertyIndexOptionsTestEntity {
        // Test @Index({ unique: true })
        @Index({ unique: true })
        @Column()
        uniqueWithOptions!: string;

        // Test @Index('custom_name', { unique: true })
        @Index('idx_custom_unique', { unique: true })
        @Column()
        uniqueWithCustomName!: string;

        // Test @Index({ unique: false }) - explicitly non-unique
        @Index({ unique: false })
        @Column()
        nonUniqueWithOptions!: string;

        // Test @Index('name', { unique: false })
        @Index('idx_custom_non_unique', { unique: false })
        @Column()
        nonUniqueWithCustomName!: string;
    }

    test('should create unique index with auto-generated name via @Index({ unique: true })', () => {
        const indexes = metadataContainer.getIndexes(PropertyIndexOptionsTestEntity);

        const uniqueIndex = indexes.find((idx) => idx.columns.includes('uniqueWithOptions'));
        expect(uniqueIndex).toBeDefined();
        expect(uniqueIndex?.unique).toBe(true);
        expect(uniqueIndex?.name).toBe('idx_property_index_options_test_uniqueWithOptions');
        expect(uniqueIndex?.columns).toEqual(['uniqueWithOptions']);
    });

    test('should create unique index with custom name via @Index("name", { unique: true })', () => {
        const indexes = metadataContainer.getIndexes(PropertyIndexOptionsTestEntity);

        const uniqueCustomIndex = indexes.find((idx) => idx.name === 'idx_custom_unique');
        expect(uniqueCustomIndex).toBeDefined();
        expect(uniqueCustomIndex?.unique).toBe(true);
        expect(uniqueCustomIndex?.columns).toEqual(['uniqueWithCustomName']);
    });

    test('should create non-unique index with auto-generated name via @Index({ unique: false })', () => {
        const indexes = metadataContainer.getIndexes(PropertyIndexOptionsTestEntity);

        const nonUniqueIndex = indexes.find((idx) => idx.columns.includes('nonUniqueWithOptions'));
        expect(nonUniqueIndex).toBeDefined();
        expect(nonUniqueIndex?.unique).toBe(false);
        expect(nonUniqueIndex?.name).toBe('idx_property_index_options_test_nonUniqueWithOptions');
        expect(nonUniqueIndex?.columns).toEqual(['nonUniqueWithOptions']);
    });

    test('should create non-unique index with custom name via @Index("name", { unique: false })', () => {
        const indexes = metadataContainer.getIndexes(PropertyIndexOptionsTestEntity);

        const nonUniqueCustomIndex = indexes.find((idx) => idx.name === 'idx_custom_non_unique');
        expect(nonUniqueCustomIndex).toBeDefined();
        expect(nonUniqueCustomIndex?.unique).toBe(false);
        expect(nonUniqueCustomIndex?.columns).toEqual(['nonUniqueWithCustomName']);
    });

    test('should have all four property-level indexes with options', () => {
        const indexes = metadataContainer.getIndexes(PropertyIndexOptionsTestEntity);
        expect(indexes).toHaveLength(4);

        const uniqueIndexes = indexes.filter((idx) => idx.unique);
        expect(uniqueIndexes).toHaveLength(2);

        const nonUniqueIndexes = indexes.filter((idx) => !idx.unique);
        expect(nonUniqueIndexes).toHaveLength(2);
    });
});

describe('Column-level Unique Index Tests', () => {
    let metadataContainer: ReturnType<typeof getGlobalMetadataContainer>;

    beforeEach(() => {
        metadataContainer = getGlobalMetadataContainer();
        // Note: We don't clear the container here because class decorators
        // run at definition time and would be lost
    });

    @Entity('column_unique_index_test')
    class ColumnUniqueIndexTestEntity {
        // Regular non-unique column index
        @Column({ index: true })
        regularIndex!: string;

        // Custom name non-unique column index
        @Column({ index: 'idx_custom_name' })
        customNameIndex!: string;

        // Unique index with auto-generated name
        @Column({ index: { unique: true } })
        uniqueAutoName!: string;

        // Unique index with custom name
        @Column({ index: { name: 'idx_unique_custom', unique: true } })
        uniqueCustomName!: string;

        // Non-unique index with custom name via object syntax
        @Column({ index: { name: 'idx_object_non_unique' } })
        objectNonUnique!: string;

        // Non-unique index with explicit unique: false
        @Column({ index: { name: 'idx_explicit_false', unique: false } })
        explicitFalse!: string;
    }

    test('should create non-unique indexes for boolean and string options', () => {
        const indexes = metadataContainer.getIndexes(ColumnUniqueIndexTestEntity);

        const regularIndex = indexes.find((idx) => idx.columns.includes('regularIndex'));
        expect(regularIndex).toBeDefined();
        expect(regularIndex?.unique).toBe(false);
        expect(regularIndex?.name).toBe('idx_column_unique_index_test_regularIndex');

        const customNameIndex = indexes.find((idx) => idx.columns.includes('customNameIndex'));
        expect(customNameIndex).toBeDefined();
        expect(customNameIndex?.unique).toBe(false);
        expect(customNameIndex?.name).toBe('idx_custom_name');
    });

    test('should create unique indexes when specified via object syntax', () => {
        const indexes = metadataContainer.getIndexes(ColumnUniqueIndexTestEntity);

        const uniqueAutoName = indexes.find((idx) => idx.columns.includes('uniqueAutoName'));
        expect(uniqueAutoName).toBeDefined();
        expect(uniqueAutoName?.unique).toBe(true);
        expect(uniqueAutoName?.name).toBe('idx_column_unique_index_test_uniqueAutoName');

        const uniqueCustomName = indexes.find((idx) => idx.columns.includes('uniqueCustomName'));
        expect(uniqueCustomName).toBeDefined();
        expect(uniqueCustomName?.unique).toBe(true);
        expect(uniqueCustomName?.name).toBe('idx_unique_custom');
    });

    test('should handle object syntax with non-unique indexes', () => {
        const indexes = metadataContainer.getIndexes(ColumnUniqueIndexTestEntity);

        const objectNonUnique = indexes.find((idx) => idx.columns.includes('objectNonUnique'));
        expect(objectNonUnique).toBeDefined();
        expect(objectNonUnique?.unique).toBe(false);
        expect(objectNonUnique?.name).toBe('idx_object_non_unique');

        const explicitFalse = indexes.find((idx) => idx.columns.includes('explicitFalse'));
        expect(explicitFalse).toBeDefined();
        expect(explicitFalse?.unique).toBe(false);
        expect(explicitFalse?.name).toBe('idx_explicit_false');
    });

    test('should handle all index configuration variations correctly', () => {
        const indexes = metadataContainer.getIndexes(ColumnUniqueIndexTestEntity);

        // Should have 6 indexes total
        expect(indexes).toHaveLength(6);

        // Check that unique indexes are correctly marked
        const uniqueIndexes = indexes.filter((idx) => idx.unique);
        expect(uniqueIndexes).toHaveLength(2);

        const nonUniqueIndexes = indexes.filter((idx) => !idx.unique);
        expect(nonUniqueIndexes).toHaveLength(4);
    });
});
