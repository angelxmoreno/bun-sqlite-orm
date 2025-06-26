import { beforeEach, describe, expect, test } from 'bun:test';
import { SqlGenerator } from '../../../src/sql';
import type { ColumnMetadata, EntityMetadata } from '../../../src/types';

describe('SqlGenerator Composite Primary Keys', () => {
    let sqlGenerator: SqlGenerator;

    beforeEach(() => {
        sqlGenerator = new SqlGenerator();
    });

    describe('generateCreateTable', () => {
        test('should generate correct SQL for single primary key', () => {
            const mockEntity: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_single',
                columns: new Map([
                    [
                        'id',
                        {
                            propertyName: 'id',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'name',
                        {
                            propertyName: 'name',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(mockEntity);

            expect(sql).toBe(
                'CREATE TABLE IF NOT EXISTS "test_single" ("id" INTEGER PRIMARY KEY, "name" TEXT NOT NULL)'
            );
        });

        test('should generate correct SQL for single auto-increment primary key', () => {
            const mockEntity: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_auto',
                columns: new Map([
                    [
                        'id',
                        {
                            propertyName: 'id',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: true,
                            generationStrategy: 'increment',
                        } as ColumnMetadata,
                    ],
                    [
                        'name',
                        {
                            propertyName: 'name',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(mockEntity);

            expect(sql).toBe(
                'CREATE TABLE IF NOT EXISTS "test_auto" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL)'
            );
        });

        test('should generate correct SQL for composite primary key', () => {
            const mockEntity: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_composite',
                columns: new Map([
                    [
                        'userId',
                        {
                            propertyName: 'userId',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'roleId',
                        {
                            propertyName: 'roleId',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'assignedAt',
                        {
                            propertyName: 'assignedAt',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(mockEntity);

            expect(sql).toBe(
                'CREATE TABLE IF NOT EXISTS "test_composite" ("userId" INTEGER, "roleId" INTEGER, "assignedAt" TEXT NOT NULL, PRIMARY KEY ("userId", "roleId"))'
            );
        });

        test('should generate correct SQL for three-column composite primary key', () => {
            const mockEntity: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_triple',
                columns: new Map([
                    [
                        'companyId',
                        {
                            propertyName: 'companyId',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'userId',
                        {
                            propertyName: 'userId',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'projectId',
                        {
                            propertyName: 'projectId',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'role',
                        {
                            propertyName: 'role',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(mockEntity);

            expect(sql).toBe(
                'CREATE TABLE IF NOT EXISTS "test_triple" ("companyId" TEXT, "userId" INTEGER, "projectId" TEXT, "role" TEXT NOT NULL, PRIMARY KEY ("companyId", "userId", "projectId"))'
            );
        });

        test('should handle composite primary key with nullable and unique columns', () => {
            const mockEntity: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_mixed',
                columns: new Map([
                    [
                        'key1',
                        {
                            propertyName: 'key1',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'key2',
                        {
                            propertyName: 'key2',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'optional',
                        {
                            propertyName: 'optional',
                            type: 'text',
                            nullable: true,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'unique_field',
                        {
                            propertyName: 'unique_field',
                            type: 'text',
                            nullable: false,
                            unique: true,
                            isPrimary: false,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(mockEntity);

            expect(sql).toBe(
                'CREATE TABLE IF NOT EXISTS "test_mixed" ("key1" TEXT, "key2" INTEGER, "optional" TEXT, "unique_field" TEXT NOT NULL UNIQUE, PRIMARY KEY ("key1", "key2"))'
            );
        });

        test('should handle composite primary key with defaults', () => {
            const mockEntity: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_defaults',
                columns: new Map([
                    [
                        'orgId',
                        {
                            propertyName: 'orgId',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'userId',
                        {
                            propertyName: 'userId',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'status',
                        {
                            propertyName: 'status',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                            default: 'active',
                        } as ColumnMetadata,
                    ],
                    [
                        'created_at',
                        {
                            propertyName: 'created_at',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                            sqlDefault: 'CURRENT_TIMESTAMP',
                        } as ColumnMetadata,
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(mockEntity);

            expect(sql).toBe(
                'CREATE TABLE IF NOT EXISTS "test_defaults" ("orgId" TEXT, "userId" INTEGER, "status" TEXT NOT NULL DEFAULT \'active\', "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY ("orgId", "userId"))'
            );
        });

        test('should not apply column-level PRIMARY KEY when multiple primary keys exist', () => {
            const mockEntity: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_no_column_pk',
                columns: new Map([
                    [
                        'id1',
                        {
                            propertyName: 'id1',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: true,
                            generationStrategy: 'increment', // This should NOT add AUTOINCREMENT in composite key
                        } as ColumnMetadata,
                    ],
                    [
                        'id2',
                        {
                            propertyName: 'id2',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(mockEntity);

            // Should NOT have "PRIMARY KEY AUTOINCREMENT" on id1 column
            expect(sql).toBe(
                'CREATE TABLE IF NOT EXISTS "test_no_column_pk" ("id1" INTEGER, "id2" TEXT, PRIMARY KEY ("id1", "id2"))'
            );
            expect(sql).not.toContain('AUTOINCREMENT');
            expect(sql).not.toContain('INTEGER PRIMARY KEY'); // Should not have column-level PRIMARY KEY
            expect(sql).not.toContain('TEXT PRIMARY KEY');
        });
    });

    describe('SQL Syntax Validation', () => {
        test('generated SQL should be valid SQLite syntax', () => {
            // Test that our generated SQL doesn't have obvious syntax errors
            const mockEntity: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'syntax_test',
                columns: new Map([
                    [
                        'field_one',
                        {
                            propertyName: 'field_one',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                    [
                        'field_two',
                        {
                            propertyName: 'field_two',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: true,
                            isGenerated: false,
                        } as ColumnMetadata,
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(mockEntity);

            // Basic syntax checks
            expect(sql).toMatch(/^CREATE TABLE IF NOT EXISTS /);
            expect(sql).toContain('PRIMARY KEY (');
            expect(sql.match(/\(/g)?.length ?? 0).toBe(sql.match(/\)/g)?.length ?? 0); // Balanced parentheses
            expect(sql).not.toContain('PRIMARY KEY PRIMARY KEY'); // No duplicates
            expect(sql).toEndWith(')');
        });
    });
});
