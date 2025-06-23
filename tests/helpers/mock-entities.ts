import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from '../../src/decorators';
import { BaseEntity } from '../../src/entity';

// =============================================================================
// BASIC ENTITIES (Original)
// =============================================================================

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

// =============================================================================
// PRIMARY KEY VARIATIONS
// =============================================================================

@Entity('int_pk_entity')
export class IntPrimaryKeyEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'text' })
    value!: string;
}

@Entity('uuid_pk_entity')
export class UuidPrimaryKeyEntity extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'text' })
    description!: string;
}

@Entity('string_pk_entity')
export class StringPrimaryKeyEntity extends BaseEntity {
    @PrimaryColumn()
    code!: string;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'text' })
    category!: string;
}

// Note: Composite primary key entities moved to separate file to prevent conflicts

// =============================================================================
// COLUMN TYPE TESTING
// =============================================================================

@Entity('all_column_types')
export class AllColumnTypesEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    textColumn!: string;

    @Column({ type: 'integer' })
    integerColumn!: number;

    @Column({ type: 'real' })
    realColumn!: number;

    @Column({ type: 'blob', nullable: true })
    blobColumn?: Buffer;

    @Column({ type: 'text', nullable: true })
    nullableText?: string;

    @Column({ type: 'integer', nullable: true })
    nullableInteger?: number;
}

@Entity('unique_columns')
export class UniqueColumnsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text', unique: true })
    uniqueEmail!: string;

    @Column({ type: 'text', unique: true })
    uniqueUsername!: string;

    @Column({ type: 'text' })
    description!: string;
}

// =============================================================================
// DEFAULT VALUE TESTING
// =============================================================================

@Entity('sql_defaults')
export class SqlDefaultsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'text', sqlDefault: 'CURRENT_TIMESTAMP' })
    createdAt!: string;

    @Column({ type: 'text', sqlDefault: 'CURRENT_TIMESTAMP' })
    updatedAt!: string;

    @Column({ type: 'text', sqlDefault: "'active'" })
    status!: string;

    @Column({ type: 'integer', sqlDefault: '0' })
    priority!: number;
}

@Entity('js_defaults')
export class JsDefaultsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'text', default: () => new Date().toISOString() })
    createdAt!: string;

    @Column({ type: 'text', default: () => crypto.randomUUID() })
    sessionId!: string;

    @Column({ type: 'integer', default: () => Math.floor(Math.random() * 1000) })
    randomValue!: number;
}

@Entity('static_defaults')
export class StaticDefaultsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'text', default: 'pending' })
    status!: string;

    @Column({ type: 'integer', default: 1 })
    version!: number;

    @Column({ type: 'integer', default: 0 })
    retryCount!: number;
}

@Entity('mixed_defaults')
export class MixedDefaultsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'text', sqlDefault: 'CURRENT_TIMESTAMP' })
    sqlTimestamp!: string;

    @Column({ type: 'text', default: () => new Date().toISOString() })
    jsTimestamp!: string;

    @Column({ type: 'text', default: 'draft' })
    staticStatus!: string;

    @Column({ type: 'integer', sqlDefault: '1' })
    sqlVersion!: number;
}

@Entity('comprehensive_sql_defaults')
export class ComprehensiveSqlDefaultsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    // SQL default - should use SQLite's CURRENT_TIMESTAMP
    @Column({ sqlDefault: 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    // JS default - should use JavaScript function
    @Column({ default: () => new Date('2024-01-01') })
    jsDefaultDate!: Date;

    // Static default value
    @Column({ default: 'active' })
    status!: string;

    // Mixed: SQL default takes precedence over JS default
    @Column({ sqlDefault: 'CURRENT_TIMESTAMP', default: () => 'should not be used' })
    mixedDefault!: Date;
}

// =============================================================================
// INDEX TESTING
// =============================================================================

@Entity('simple_index_entity')
export class SimpleIndexEntity extends BaseEntity {
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

@Entity('custom_index_entity')
export class CustomIndexEntity extends BaseEntity {
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

@Entity('unique_index_entity')
export class UniqueIndexEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    @Index({ unique: true })
    @Column({ type: 'text' })
    uniqueEmail!: string;

    @Index('idx_unique_code', { unique: true })
    @Column({ type: 'text' })
    uniqueCode!: string;
}

@Entity('composite_index_entity')
@Index('idx_full_name', ['firstName', 'lastName'])
@Index('idx_name_age', ['firstName', 'lastName', 'age'])
@Index('idx_unique_email_status', ['email', 'status'], { unique: true })
export class CompositeIndexEntity extends BaseEntity {
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

// =============================================================================
// VALIDATION TESTING
// =============================================================================

@Entity('comprehensive_validation')
export class ComprehensiveValidationEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    @IsNotEmpty()
    @MinLength(2)
    name!: string;

    @Column({ type: 'text' })
    @IsEmail()
    email!: string;

    @Column({ type: 'integer', nullable: true })
    @IsOptional()
    age?: number;

    @Column({ type: 'text', nullable: true })
    @IsOptional()
    @MinLength(10)
    description?: string;
}

@Entity('email_validation')
export class EmailValidationEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'text' })
    @IsEmail()
    email!: string;

    @Column({ type: 'text', nullable: true })
    @IsOptional()
    @IsEmail()
    secondaryEmail?: string;
}

@Entity('length_validation')
export class LengthValidationEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    @MinLength(3)
    shortText!: string;

    @Column({ type: 'text' })
    @MinLength(10)
    longText!: string;

    @Column({ type: 'text', nullable: true })
    @IsOptional()
    @MinLength(5)
    optionalText?: string;
}

// =============================================================================
// BOOLEAN TESTING
// =============================================================================

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

@Entity('comprehensive_boolean')
export class ComprehensiveBooleanEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'integer' })
    isActive!: boolean;

    @Column({ type: 'integer', nullable: true })
    isOptional?: boolean;

    @Column({ type: 'integer', default: () => 1 })
    defaultTrue!: boolean;

    @Column({ type: 'integer', default: () => 0 })
    defaultFalse!: boolean;

    @Column({ type: 'integer', sqlDefault: '1' })
    sqlDefaultTrue!: boolean;

    @Column({ type: 'integer', sqlDefault: '0' })
    sqlDefaultFalse!: boolean;
}

// =============================================================================
// ERROR TESTING ENTITIES
// =============================================================================

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

// Note: NoColumnsEntity moved to error-entities.ts to prevent automatic registration

// =============================================================================
// JSON SERIALIZATION TESTING
// =============================================================================

@Entity('json_test_entity')
export class JsonTestEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' })
    name!: string;

    @Column({ type: 'text', unique: true })
    email!: string;

    @Column({ type: 'integer', nullable: true })
    age?: number;

    @Column({ type: 'integer', sqlDefault: '1' })
    isActive!: boolean;

    @Column({ sqlDefault: 'CURRENT_TIMESTAMP' })
    createdAt!: string;

    @Column({ type: 'text', nullable: true })
    updatedAt?: string;

    // Method to test custom JSON serialization
    getDisplayName(): string {
        return `${this.name} <${this.email}>`;
    }
}

@Entity('json_user_profiles')
export class JsonUserProfile extends BaseEntity {
    @PrimaryColumn()
    userId!: number;

    @PrimaryColumn()
    profileType!: string;

    @Column({ type: 'text', nullable: true })
    bio?: string;

    @Column({ type: 'text', nullable: true })
    avatar?: string;
}

// =============================================================================
// PERFORMANCE TESTING
// =============================================================================

@Entity('large_entity')
export class LargeEntity extends BaseEntity {
    @PrimaryGeneratedColumn('int')
    id!: number;

    @Column({ type: 'text' }) field1!: string;
    @Column({ type: 'text' }) field2!: string;
    @Column({ type: 'text' }) field3!: string;
    @Column({ type: 'text' }) field4!: string;
    @Column({ type: 'text' }) field5!: string;
    @Column({ type: 'integer' }) intField1!: number;
    @Column({ type: 'integer' }) intField2!: number;
    @Column({ type: 'integer' }) intField3!: number;
    @Column({ type: 'integer' }) intField4!: number;
    @Column({ type: 'integer' }) intField5!: number;
    @Column({ type: 'real' }) realField1!: number;
    @Column({ type: 'real' }) realField2!: number;
    @Column({ type: 'real' }) realField3!: number;
    @Column({ type: 'text', nullable: true }) optionalField1?: string;
    @Column({ type: 'text', nullable: true }) optionalField2?: string;
    @Column({ type: 'text', nullable: true }) optionalField3?: string;
    @Column({ type: 'text', default: () => new Date().toISOString() }) createdAt!: string;
    @Column({ type: 'text', nullable: true }) updatedAt?: string;
    @Column({ type: 'text', default: 'active' }) status!: string;
    @Column({ type: 'integer', default: () => 1 }) version!: number;
}
