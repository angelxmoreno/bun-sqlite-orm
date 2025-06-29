import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '../../../src';
import { resetGlobalMetadata } from '../../helpers';

describe('Update Method Type Safety', () => {
    beforeEach(() => {
        resetGlobalMetadata();
    });

    afterEach(() => {
        resetGlobalMetadata();
    });

    test('should provide type safety with Partial<T>', async () => {
        @Entity('test_users')
        class TestUser extends BaseEntity {
            @PrimaryGeneratedColumn()
            id!: number;

            @Column()
            name!: string;

            @Column()
            email!: string;

            @Column()
            age!: number;

            @Column()
            isActive!: boolean;

            @Column()
            metadata?: Record<string, unknown>;

            @Column()
            tags?: string[];

            @Column()
            settings?: { theme: string; notifications: boolean };
        }

        // Create test instance
        const user = new TestUser();
        user.id = 1;
        user.name = 'John Doe';
        user.email = 'john@example.com';
        user.age = 30;
        user.isActive = true;
        (user as unknown as { _isNew: boolean })._isNew = false; // Simulate existing entity

        // Mock the save method to avoid database calls
        user.save = async () => {};

        // Test 1: Valid updates with proper types
        await user.update({
            name: 'Updated Name',
            email: 'updated@example.com',
            age: 31,
            isActive: false,
        });

        expect(user.name).toBe('Updated Name');
        expect(user.email).toBe('updated@example.com');
        expect(user.age).toBe(31);
        expect(user.isActive).toBe(false);

        // Test 2: Partial updates (only some properties)
        await user.update({
            name: 'Partially Updated',
        });

        expect(user.name).toBe('Partially Updated');

        // Test 3: Complex object properties
        await user.update({
            metadata: { lastLogin: new Date().toISOString() },
            tags: ['admin', 'user'],
            settings: { theme: 'dark', notifications: true },
        });

        expect(user.metadata).toEqual({ lastLogin: expect.any(String) });
        expect(user.tags).toEqual(['admin', 'user']);
        expect(user.settings).toEqual({ theme: 'dark', notifications: true });

        // Test 4: Optional properties
        await user.update({
            metadata: undefined,
            tags: undefined,
        });

        expect(user.metadata).toBeUndefined();
        expect(user.tags).toBeUndefined();

        // Test 5: Date objects (Date type should be preserved)
        const now = new Date();
        await user.update({
            metadata: { timestamp: now },
        });

        expect(user.metadata).toEqual({ timestamp: now });
    });

    test('should maintain backward compatibility', async () => {
        @Entity('backward_test')
        class BackwardTestEntity extends BaseEntity {
            @PrimaryGeneratedColumn()
            id!: number;

            @Column()
            name!: string;

            @Column()
            value!: number;
        }

        const entity = new BackwardTestEntity();
        entity.id = 1;
        entity.name = 'Test';
        entity.value = 42;
        (entity as unknown as { _isNew: boolean })._isNew = false;

        // Mock save method
        entity.save = async () => {};

        // This should still work (backward compatibility)
        await entity.update({
            name: 'Updated',
            value: 100,
        });

        expect(entity.name).toBe('Updated');
        expect(entity.value).toBe(100);
    });

    test('should handle inheritance properly', async () => {
        @Entity('base_test')
        class BaseTestEntity extends BaseEntity {
            @PrimaryGeneratedColumn()
            id!: number;

            @Column()
            baseProperty!: string;
        }

        @Entity('extended_test')
        class ExtendedTestEntity extends BaseTestEntity {
            @Column()
            extendedProperty!: string;
        }

        const entity = new ExtendedTestEntity();
        entity.id = 1;
        entity.baseProperty = 'base';
        entity.extendedProperty = 'extended';
        (entity as unknown as { _isNew: boolean })._isNew = false;

        // Mock save method
        entity.save = async () => {};

        // Should be able to update both base and extended properties
        await entity.update({
            baseProperty: 'updated base',
            extendedProperty: 'updated extended',
        });

        expect(entity.baseProperty).toBe('updated base');
        expect(entity.extendedProperty).toBe('updated extended');
    });

    test('should work with all TypeScript types', async () => {
        @Entity('type_test')
        class TypeTestEntity extends BaseEntity {
            @PrimaryGeneratedColumn()
            id!: number;

            @Column()
            stringProp!: string;

            @Column()
            numberProp!: number;

            @Column()
            booleanProp!: boolean;

            @Column()
            dateProp!: Date;

            @Column()
            objectProp!: Record<string, unknown>;

            @Column()
            arrayProp!: string[];

            @Column()
            optionalProp?: string;

            @Column()
            nullableProp!: string | null;
        }

        const entity = new TypeTestEntity();
        entity.id = 1;
        (entity as unknown as { _isNew: boolean })._isNew = false;
        entity.save = async () => {};

        const testDate = new Date();

        // Test all different TypeScript types
        await entity.update({
            stringProp: 'test string',
            numberProp: 42,
            booleanProp: true,
            dateProp: testDate,
            objectProp: { key: 'value', nested: { prop: 'test' } },
            arrayProp: ['item1', 'item2'],
            optionalProp: 'optional value',
            nullableProp: null,
        });

        expect(entity.stringProp).toBe('test string');
        expect(entity.numberProp).toBe(42);
        expect(entity.booleanProp).toBe(true);
        expect(entity.dateProp).toBe(testDate);
        expect(entity.objectProp).toEqual({ key: 'value', nested: { prop: 'test' } });
        expect(entity.arrayProp).toEqual(['item1', 'item2']);
        expect(entity.optionalProp).toBe('optional value');
        expect(entity.nullableProp).toBeNull();
    });

    test('should preserve entity internal state', async () => {
        @Entity('state_test')
        class StateTestEntity extends BaseEntity {
            @PrimaryGeneratedColumn()
            id!: number;

            @Column()
            name!: string;
        }

        const entity = new StateTestEntity();
        entity.id = 1;
        entity.name = 'Original';
        (entity as unknown as { _isNew: boolean })._isNew = false;

        // Capture original values to simulate real entity state
        (entity as unknown as { _originalValues: Record<string, unknown> })._originalValues = {
            id: 1,
            name: 'Original',
        };

        // Mock save method to verify it gets called
        let saveCalled = false;
        entity.save = async () => {
            saveCalled = true;
        };

        await entity.update({ name: 'Updated' });

        // Verify the update went through save()
        expect(saveCalled).toBe(true);
        expect(entity.name).toBe('Updated');

        // Verify internal state is preserved
        expect((entity as unknown as { _isNew: boolean })._isNew).toBe(false);
        expect(entity.id).toBe(1);
    });
});
