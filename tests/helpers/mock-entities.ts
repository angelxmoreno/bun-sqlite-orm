import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from '../../src/decorators';
import { BaseEntity } from '../../src/entity';

@Entity('test_users')
export class TestUser extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    @IsNotEmpty()
    @MinLength(2)
    name!: string;

    @Column({ type: 'text', unique: true })
    @IsEmail()
    email!: string;

    @Column({ type: 'integer', nullable: true })
    @IsOptional()
    age?: number;

    @Column({ type: 'text', nullable: true })
    @IsOptional()
    bio?: string;

    @Column({ type: 'text', default: () => new Date().toISOString() })
    createdAt!: string;
}

@Entity('test_posts')
export class TestPost extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text' })
    @IsNotEmpty()
    title!: string;

    @Column({ type: 'text' })
    @IsNotEmpty()
    content!: string;

    @Column({ type: 'integer' })
    authorId!: number;

    @Column({ type: 'text', default: () => new Date().toISOString() })
    createdAt!: string;

    @Column({ type: 'text', nullable: true })
    updatedAt?: string;
}

@Entity('test_comments')
export class TestComment extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    @IsNotEmpty()
    text!: string;

    @Column({ type: 'integer' })
    postId!: number;

    @Column({ type: 'integer' })
    authorId!: number;

    @Column({ type: 'text', default: () => new Date().toISOString() })
    createdAt!: string;
}

@Entity('test_simple')
export class SimpleTestEntity extends BaseEntity {
    @PrimaryColumn()
    id!: string;

    @Column({ type: 'text' })
    name!: string;
}

// Entity without primary key (for testing error cases)
@Entity('test_no_pk')
export class NoPrimaryKeyEntity extends BaseEntity {
    @Column({ type: 'text' })
    name!: string;
}

// Entity with validation errors (for testing validation)
@Entity('test_invalid')
export class InvalidTestEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    @IsEmail() // This will fail validation for non-email strings
    notAnEmail!: string;

    @Column({ type: 'text' })
    @MinLength(10) // This will fail for short strings
    shortText!: string;
}

// Entity with boolean properties (for testing boolean conversion)
@Entity('boolean_test_entities')
export class BooleanTestEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'integer' }) // SQLite stores booleans as integers
    isActive!: boolean;

    @Column({ type: 'integer', nullable: true })
    isPublished?: boolean;

    @Column({ type: 'integer', default: () => 0 }) // Default false
    isDeleted!: boolean;
}
