import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { Column, Entity, PrimaryColumn } from '../../src/decorators';
import { BaseEntity } from '../../src/entity';
import { EntityNotFoundError } from '../../src/errors';
import { OrderItemEntity, TestUserComposite, UserRoleEntity } from '../helpers/composite-entities';
import { clearTestData, createTestDataSource } from '../helpers/test-datasource';
import type { TestDataSourceResult } from '../helpers/test-datasource';

// Use shared entities for better test organization
const UserRole = UserRoleEntity;
const OrderItem = OrderItemEntity;
const User = TestUserComposite;

describe('Composite Primary Keys Integration Tests', () => {
    let testDS: TestDataSourceResult;

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [UserRoleEntity, OrderItemEntity, TestUserComposite],
        });

        // Run migrations to create tables
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        // Clear all test data between tests
        await clearTestData([UserRoleEntity, OrderItemEntity, TestUserComposite]);

        // Insert fresh test data
        const db = testDS.dataSource.getDatabase();

        db.exec(`
            INSERT INTO "user_roles" (userId, roleId, assignedBy, assignedAt) VALUES
            (1, 1, 'admin', '2024-01-01'),
            (1, 2, 'admin', '2024-01-02'),
            (2, 1, 'manager', '2024-01-03')
        `);

        db.exec(`
            INSERT INTO "order_items" (orderId, productSku, quantity, unitPrice) VALUES
            ('ORD-001', 'SKU-A', 2, 19.99),
            ('ORD-001', 'SKU-B', 1, 29.99),
            ('ORD-002', 'SKU-A', 3, 19.99)
        `);

        db.exec(`
            INSERT INTO "users" (id, name) VALUES
            (1, 'John Doe'),
            (2, 'Jane Smith')
        `);
    });

    describe('SQL Generation', () => {
        test('should generate valid SQL for composite primary keys', () => {
            // This test verifies our SQL generation works by ensuring tables were created successfully
            const db = testDS.dataSource.getDatabase();
            const userRolesCount = db.query('SELECT COUNT(*) as count FROM user_roles').get() as { count: number };
            const orderItemsCount = db.query('SELECT COUNT(*) as count FROM order_items').get() as { count: number };

            expect(userRolesCount.count).toBe(3);
            expect(orderItemsCount.count).toBe(3);
        });

        test('should handle table constraints properly', () => {
            // Try to insert duplicate composite key - should fail
            const db = testDS.dataSource.getDatabase();
            expect(() => {
                db.exec(
                    `INSERT INTO "user_roles" (userId, roleId, assignedBy, assignedAt) VALUES (1, 1, 'duplicate', '2024-01-04')`
                );
            }).toThrow();
        });
    });

    describe('BaseEntity.get() Method', () => {
        test('should retrieve entity by composite key object', async () => {
            const userRole = await UserRole.get({ userId: 1, roleId: 2 });

            expect(userRole).toBeInstanceOf(UserRole);
            expect(userRole.userId).toBe(1);
            expect(userRole.roleId).toBe(2);
            expect(userRole.assignedBy).toBe('admin');
            expect(userRole.assignedAt).toBe('2024-01-02');
        });

        test('should retrieve entity by composite key with string keys', async () => {
            const orderItem = await OrderItem.get({ orderId: 'ORD-001', productSku: 'SKU-B' });

            expect(orderItem).toBeInstanceOf(OrderItem);
            expect(orderItem.orderId).toBe('ORD-001');
            expect(orderItem.productSku).toBe('SKU-B');
            expect(orderItem.quantity).toBe(1);
            expect(orderItem.unitPrice).toBe(29.99);
        });

        test('should throw EntityNotFoundError for non-existent composite key', async () => {
            await expect(UserRole.get({ userId: 999, roleId: 999 })).rejects.toThrow(EntityNotFoundError);
        });

        test('should throw error when missing required composite key properties', async () => {
            await expect(UserRole.get({ userId: 1 } as unknown as { userId: number; roleId: number })).rejects.toThrow(
                "Missing primary key property 'roleId' for entity UserRoleEntity"
            );
        });

        test('should throw error when providing wrong property names', async () => {
            await expect(
                UserRole.get({ wrongKey: 1, roleId: 1 } as unknown as { userId: number; roleId: number })
            ).rejects.toThrow("Missing primary key property 'userId' for entity UserRoleEntity");
        });

        test('should throw error when providing primitive value for composite key entity', async () => {
            await expect(UserRole.get(123 as unknown as { userId: number; roleId: number })).rejects.toThrow(
                'Entity UserRoleEntity has 2 primary keys. Expected object with keys: userId, roleId'
            );
        });
    });

    describe('Backward Compatibility', () => {
        test('should still work with single primary key entities using primitive values', async () => {
            const user = await User.get(1);

            expect(user).toBeInstanceOf(User);
            expect(user.id).toBe(1);
            expect(user.name).toBe('John Doe');
        });

        test('should work with single primary key entities using object notation', async () => {
            const user = await User.get({ id: 2 });

            expect(user).toBeInstanceOf(User);
            expect(user.id).toBe(2);
            expect(user.name).toBe('Jane Smith');
        });

        test('should throw error for invalid object notation on single key entity', async () => {
            await expect(User.get({ wrongKey: 1 } as unknown as number)).rejects.toThrow(
                'Invalid composite key object for entity TestUserComposite. Expected property: id'
            );
        });
    });

    describe('BaseEntity.reload() Method', () => {
        test('should reload composite key entity from database', async () => {
            const userRole = await UserRole.get({ userId: 1, roleId: 1 });

            // Modify the entity
            userRole.assignedBy = 'modified';

            // Reload should restore original values
            await userRole.reload();

            expect(userRole.assignedBy).toBe('admin');
            expect(userRole.assignedAt).toBe('2024-01-01');
        });

        test('should work with single primary key entities', async () => {
            const user = await User.get(1);

            // Modify the entity
            user.name = 'modified';

            // Reload should restore original values
            await user.reload();

            expect(user.name).toBe('John Doe');
        });

        test('should throw error when trying to reload unsaved entity', async () => {
            const userRole = new UserRole();
            userRole.userId = 999;
            userRole.roleId = 999;

            await expect(userRole.reload()).rejects.toThrow('Cannot reload unsaved entity');
        });
    });

    describe('CRUD Operations', () => {
        test('should save new entity with composite key', async () => {
            const newUserRole = new UserRole();
            newUserRole.userId = 3;
            newUserRole.roleId = 2;
            newUserRole.assignedBy = 'test';
            newUserRole.assignedAt = '2024-01-05';

            await newUserRole.save();

            // Verify it was saved
            const retrieved = await UserRole.get({ userId: 3, roleId: 2 });
            expect(retrieved.assignedBy).toBe('test');
            expect(retrieved.assignedAt).toBe('2024-01-05');
        });

        test('should update existing entity with composite key', async () => {
            const userRole = await UserRole.get({ userId: 1, roleId: 1 });
            userRole.assignedBy = 'updated';

            await userRole.save();

            // Verify update
            const retrieved = await UserRole.get({ userId: 1, roleId: 1 });
            expect(retrieved.assignedBy).toBe('updated');
        });

        test('should remove entity with composite key', async () => {
            const userRole = await UserRole.get({ userId: 2, roleId: 1 });
            await userRole.remove();

            // Verify removal
            await expect(UserRole.get({ userId: 2, roleId: 1 })).rejects.toThrow(EntityNotFoundError);
        });
    });

    describe('Query Methods', () => {
        test('should find entities with composite key conditions', async () => {
            const userRoles = await UserRole.find({ userId: 1 });
            expect(userRoles).toHaveLength(2);

            const specificRole = await UserRole.find({ userId: 1, roleId: 1 });
            expect(specificRole).toHaveLength(1);
            expect(specificRole[0].assignedBy).toBe('admin');
        });

        test('should count entities with composite key conditions', async () => {
            const countAll = await UserRole.count();
            expect(countAll).toBe(3);

            const countUser1 = await UserRole.count({ userId: 1 });
            expect(countUser1).toBe(2);
        });

        test('should check existence with composite key conditions', async () => {
            const exists = await UserRole.exists({ userId: 1, roleId: 1 });
            expect(exists).toBe(true);

            const notExists = await UserRole.exists({ userId: 999, roleId: 999 });
            expect(notExists).toBe(false);
        });

        test('should delete multiple entities with conditions', async () => {
            const deletedCount = await UserRole.deleteAll({ userId: 1 });
            expect(deletedCount).toBe(2);

            const remaining = await UserRole.count();
            expect(remaining).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        test('should handle entities with no primary keys gracefully', async () => {
            // This would be caught at the entity definition level, but test the runtime check
            @Entity('no_pk_table')
            class NoPrimaryKeyEntity extends BaseEntity {
                @Column({ type: 'text' })
                data!: string;
            }

            // Create a table without primary keys for this test
            const db = testDS.dataSource.getDatabase();
            db.exec('CREATE TABLE IF NOT EXISTS "no_pk_table" ("data" TEXT)');
            db.exec('INSERT INTO "no_pk_table" ("data") VALUES (\'test\')');

            const entity = new NoPrimaryKeyEntity();
            entity.data = 'test';
            // Mark as not new to bypass the "unsaved entity" check
            (entity as unknown as { _isNew: boolean })._isNew = false;

            await expect(entity.reload()).rejects.toThrow('No primary key defined for entity NoPrimaryKeyEntity');
        });

        test('should handle missing primary key values in reload', async () => {
            const userRole = await UserRole.get({ userId: 1, roleId: 1 });

            // Simulate missing primary key value
            (userRole as unknown as { userId: undefined }).userId = undefined;

            await expect(userRole.reload()).rejects.toThrow(
                'Cannot reload entity UserRoleEntity: missing primary key values'
            );
        });
    });
});
