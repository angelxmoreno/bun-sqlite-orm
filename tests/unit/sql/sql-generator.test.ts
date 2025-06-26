import { beforeEach, describe, expect, test } from 'bun:test';
import { SqlGenerator } from '../../../src/sql/sql-generator';
import type { ColumnMetadata, EntityMetadata } from '../../../src/types';

describe('SqlGenerator', () => {
    let sqlGenerator: SqlGenerator;

    beforeEach(() => {
        sqlGenerator = new SqlGenerator();
    });

    describe('generateCreateTable', () => {
        test('should generate CREATE TABLE for simple entity', () => {
            const entityMetadata: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_entity',
                columns: new Map([
                    [
                        'id',
                        {
                            propertyName: 'id',
                            type: 'integer',
                            nullable: false,
                            unique: true,
                            isPrimary: true,
                            isGenerated: true,
                            generationStrategy: 'increment',
                        },
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
                        },
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(entityMetadata);

            expect(sql).toBe(
                'CREATE TABLE IF NOT EXISTS "test_entity" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL)'
            );
        });

        test('should generate CREATE TABLE with various column types', () => {
            const entityMetadata: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'complex_entity',
                columns: new Map([
                    [
                        'id',
                        {
                            propertyName: 'id',
                            type: 'integer',
                            nullable: false,
                            unique: true,
                            isPrimary: true,
                            isGenerated: false,
                        },
                    ],
                    [
                        'email',
                        {
                            propertyName: 'email',
                            type: 'text',
                            nullable: false,
                            unique: true,
                            isPrimary: false,
                            isGenerated: false,
                        },
                    ],
                    [
                        'age',
                        {
                            propertyName: 'age',
                            type: 'integer',
                            nullable: true,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                        },
                    ],
                    [
                        'score',
                        {
                            propertyName: 'score',
                            type: 'real',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                            default: 0.0,
                        },
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(entityMetadata);

            expect(sql).toBe(
                'CREATE TABLE IF NOT EXISTS "complex_entity" ("id" INTEGER PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "age" INTEGER, "score" REAL NOT NULL DEFAULT 0)'
            );
        });

        test('should handle string defaults with proper escaping', () => {
            const entityMetadata: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_entity',
                columns: new Map([
                    [
                        'id',
                        {
                            propertyName: 'id',
                            type: 'integer',
                            nullable: false,
                            unique: true,
                            isPrimary: true,
                            isGenerated: true,
                            generationStrategy: 'increment',
                        },
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
                        },
                    ],
                    [
                        'description',
                        {
                            propertyName: 'description',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                            default: "It's a test",
                        },
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(entityMetadata);

            expect(sql).toBe(
                'CREATE TABLE IF NOT EXISTS "test_entity" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "status" TEXT NOT NULL DEFAULT \'active\', "description" TEXT NOT NULL DEFAULT \'It\'\'s a test\')'
            );
        });

        test('should handle boolean defaults', () => {
            const entityMetadata: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_entity',
                columns: new Map([
                    [
                        'id',
                        {
                            propertyName: 'id',
                            type: 'integer',
                            nullable: false,
                            unique: true,
                            isPrimary: true,
                            isGenerated: true,
                            generationStrategy: 'increment',
                        },
                    ],
                    [
                        'isActive',
                        {
                            propertyName: 'isActive',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                            default: true,
                        },
                    ],
                    [
                        'isDeleted',
                        {
                            propertyName: 'isDeleted',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                            default: false,
                        },
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(entityMetadata);

            expect(sql).toBe(
                'CREATE TABLE IF NOT EXISTS "test_entity" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "isActive" INTEGER NOT NULL DEFAULT 1, "isDeleted" INTEGER NOT NULL DEFAULT 0)'
            );
        });
    });

    describe('generateInsert', () => {
        test('should generate INSERT statement', () => {
            const data = { name: 'John', email: 'john@example.com', age: 30 };
            const result = sqlGenerator.generateInsert('users', data);

            expect(result.sql).toBe('INSERT INTO "users" ("name", "email", "age") VALUES (?, ?, ?)');
            expect(result.values).toEqual(['John', 'john@example.com', 30]);
        });

        test('should handle single column insert', () => {
            const data = { name: 'John' };
            const result = sqlGenerator.generateInsert('users', data);

            expect(result.sql).toBe('INSERT INTO "users" ("name") VALUES (?)');
            expect(result.values).toEqual(['John']);
        });

        test('should throw error for empty data object', () => {
            const data = {};

            expect(() => sqlGenerator.generateInsert('users', data)).toThrow(
                'Cannot perform INSERT with empty data: at least one column value must be provided'
            );
        });

        test('should throw error for null data', () => {
            // @ts-expect-error Testing invalid input
            expect(() => sqlGenerator.generateInsert('users', null)).toThrow(
                'Cannot perform INSERT with empty data: at least one column value must be provided'
            );
        });

        test('should throw error for undefined data', () => {
            // @ts-expect-error Testing invalid input
            expect(() => sqlGenerator.generateInsert('users', undefined)).toThrow(
                'Cannot perform INSERT with empty data: at least one column value must be provided'
            );
        });
    });

    describe('generateSelect', () => {
        test('should generate SELECT statement without conditions', () => {
            const result = sqlGenerator.generateSelect('users');

            expect(result.sql).toBe('SELECT * FROM "users"');
            expect(result.values).toEqual([]);
        });

        test('should generate SELECT statement with conditions', () => {
            const conditions = { name: 'John', age: 30 };
            const result = sqlGenerator.generateSelect('users', conditions);

            expect(result.sql).toBe('SELECT * FROM "users" WHERE "name" = ? AND "age" = ?');
            expect(result.values).toEqual(['John', 30]);
        });

        test('should generate SELECT statement with single condition', () => {
            const conditions = { id: 1 };
            const result = sqlGenerator.generateSelect('users', conditions);

            expect(result.sql).toBe('SELECT * FROM "users" WHERE "id" = ?');
            expect(result.values).toEqual([1]);
        });

        test('should handle empty conditions object', () => {
            const result = sqlGenerator.generateSelect('users', {});

            expect(result.sql).toBe('SELECT * FROM "users"');
            expect(result.values).toEqual([]);
        });
    });

    describe('generateUpdate', () => {
        test('should generate UPDATE statement', () => {
            const data = { name: 'Jane', email: 'jane@example.com' };
            const conditions = { id: 1 };
            const result = sqlGenerator.generateUpdate('users', data, conditions);

            expect(result.sql).toBe('UPDATE "users" SET "name" = ?, "email" = ? WHERE "id" = ?');
            expect(result.values).toEqual(['Jane', 'jane@example.com', 1]);
        });

        test('should generate UPDATE statement with multiple conditions', () => {
            const data = { status: 'inactive' };
            const conditions = { name: 'John', age: 30 };
            const result = sqlGenerator.generateUpdate('users', data, conditions);

            expect(result.sql).toBe('UPDATE "users" SET "status" = ? WHERE "name" = ? AND "age" = ?');
            expect(result.values).toEqual(['inactive', 'John', 30]);
        });

        test('should handle single field update', () => {
            const data = { lastLogin: '2024-01-01' };
            const conditions = { id: 1 };
            const result = sqlGenerator.generateUpdate('users', data, conditions);

            expect(result.sql).toBe('UPDATE "users" SET "lastLogin" = ? WHERE "id" = ?');
            expect(result.values).toEqual(['2024-01-01', 1]);
        });
    });

    describe('generateDelete', () => {
        test('should generate DELETE statement', () => {
            const conditions = { id: 1 };
            const result = sqlGenerator.generateDelete('users', conditions);

            expect(result.sql).toBe('DELETE FROM "users" WHERE "id" = ?');
            expect(result.values).toEqual([1]);
        });

        test('should generate DELETE statement with multiple conditions', () => {
            const conditions = { name: 'John', age: 30 };
            const result = sqlGenerator.generateDelete('users', conditions);

            expect(result.sql).toBe('DELETE FROM "users" WHERE "name" = ? AND "age" = ?');
            expect(result.values).toEqual(['John', 30]);
        });
    });

    describe('generateCount', () => {
        test('should generate COUNT statement without conditions', () => {
            const result = sqlGenerator.generateCount('users');

            expect(result.sql).toBe('SELECT COUNT(*) as count FROM "users"');
            expect(result.values).toEqual([]);
        });

        test('should generate COUNT statement with conditions', () => {
            const conditions = { active: true, age: 30 };
            const result = sqlGenerator.generateCount('users', conditions);

            expect(result.sql).toBe('SELECT COUNT(*) as count FROM "users" WHERE "active" = ? AND "age" = ?');
            expect(result.values).toEqual([true, 30]);
        });

        test('should handle empty conditions object', () => {
            const result = sqlGenerator.generateCount('users', {});

            expect(result.sql).toBe('SELECT COUNT(*) as count FROM "users"');
            expect(result.values).toEqual([]);
        });
    });

    describe('formatDefaultValue (private method testing)', () => {
        test('should format string values with quote escaping', () => {
            const entityMetadata: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_entity',
                columns: new Map([
                    [
                        'id',
                        {
                            propertyName: 'id',
                            type: 'integer',
                            nullable: false,
                            unique: true,
                            isPrimary: true,
                            isGenerated: true,
                            generationStrategy: 'increment',
                        },
                    ],
                    [
                        'message',
                        {
                            propertyName: 'message',
                            type: 'text',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                            default: "Hello 'world'",
                        },
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(entityMetadata);

            expect(sql).toContain("DEFAULT 'Hello ''world'''");
        });

        test('should format numeric values', () => {
            const entityMetadata: EntityMetadata = {
                target: class TestEntity {},
                tableName: 'test_entity',
                columns: new Map([
                    [
                        'id',
                        {
                            propertyName: 'id',
                            type: 'integer',
                            nullable: false,
                            unique: true,
                            isPrimary: true,
                            isGenerated: true,
                            generationStrategy: 'increment',
                        },
                    ],
                    [
                        'count',
                        {
                            propertyName: 'count',
                            type: 'integer',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                            default: 42,
                        },
                    ],
                    [
                        'price',
                        {
                            propertyName: 'price',
                            type: 'real',
                            nullable: false,
                            unique: false,
                            isPrimary: false,
                            isGenerated: false,
                            default: 19.99,
                        },
                    ],
                ]),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: false,
            };

            const sql = sqlGenerator.generateCreateTable(entityMetadata);

            expect(sql).toContain('DEFAULT 42');
            expect(sql).toContain('DEFAULT 19.99');
        });
    });
});
