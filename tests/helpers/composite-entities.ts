import { Column, Entity, PrimaryColumn } from '../../src/decorators';
import { BaseEntity } from '../../src/entity';

/**
 * Specialized entities for composite primary key testing.
 *
 * These entities are kept separate from mock-entities.ts to prevent
 * conflicts with other tests that might not expect composite key entities.
 */

@Entity('user_roles')
export class UserRoleEntity extends BaseEntity {
    @PrimaryColumn()
    userId!: number;

    @PrimaryColumn()
    roleId!: number;

    @Column()
    assignedBy!: string;

    @Column()
    assignedAt!: string;
}

@Entity('order_items')
export class OrderItemEntity extends BaseEntity {
    @PrimaryColumn()
    orderId!: string;

    @PrimaryColumn()
    productSku!: string;

    @Column()
    quantity!: number;

    @Column()
    unitPrice!: number;
}

@Entity('users')
export class TestUserComposite extends BaseEntity {
    @PrimaryColumn()
    id!: number;

    @Column()
    name!: string;
}
