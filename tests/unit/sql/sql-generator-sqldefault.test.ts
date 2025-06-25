import { describe, expect, test } from 'bun:test';
import { SqlGenerator } from '../../../src/sql/sql-generator';
import type { EntityMetadata } from '../../../src/types';

describe('SqlGenerator - SQL Default Value Formatting', () => {
    const sqlGenerator = new SqlGenerator();

    test('should format numeric sqlDefault values correctly', () => {
        const entityMetadata: EntityMetadata = {
            target: class TestEntity {},
            tableName: 'test_table',
            columns: new Map([
                [
                    'integerField',
                    {
                        propertyName: 'integerField',
                        type: 'integer',
                        nullable: false,
                        unique: false,
                        sqlDefault: 42,
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'realField',
                    {
                        propertyName: 'realField',
                        type: 'real',
                        nullable: false,
                        unique: false,
                        sqlDefault: 3.14,
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'negativeField',
                    {
                        propertyName: 'negativeField',
                        type: 'real',
                        nullable: false,
                        unique: false,
                        sqlDefault: -1.5,
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
            ]),
            primaryColumns: [],
            indexes: [],
        };

        const sql = sqlGenerator.generateCreateTable(entityMetadata);

        expect(sql).toContain('"integerField" INTEGER NOT NULL DEFAULT 42');
        expect(sql).toContain('"realField" REAL NOT NULL DEFAULT 3.14');
        expect(sql).toContain('"negativeField" REAL NOT NULL DEFAULT -1.5');
    });

    test('should format boolean sqlDefault values correctly', () => {
        const entityMetadata: EntityMetadata = {
            target: class TestEntity {},
            tableName: 'test_table',
            columns: new Map([
                [
                    'trueField',
                    {
                        propertyName: 'trueField',
                        type: 'integer',
                        nullable: false,
                        unique: false,
                        sqlDefault: true,
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'falseField',
                    {
                        propertyName: 'falseField',
                        type: 'integer',
                        nullable: false,
                        unique: false,
                        sqlDefault: false,
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
            ]),
            primaryColumns: [],
            indexes: [],
        };

        const sql = sqlGenerator.generateCreateTable(entityMetadata);

        expect(sql).toContain('"trueField" INTEGER NOT NULL DEFAULT 1');
        expect(sql).toContain('"falseField" INTEGER NOT NULL DEFAULT 0');
    });

    test('should format null sqlDefault values correctly', () => {
        const entityMetadata: EntityMetadata = {
            target: class TestEntity {},
            tableName: 'test_table',
            columns: new Map([
                [
                    'nullField',
                    {
                        propertyName: 'nullField',
                        type: 'text',
                        nullable: true,
                        unique: false,
                        sqlDefault: null,
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
            ]),
            primaryColumns: [],
            indexes: [],
        };

        const sql = sqlGenerator.generateCreateTable(entityMetadata);

        expect(sql).toContain('"nullField" TEXT DEFAULT NULL');
    });

    test('should format string sqlDefault values correctly', () => {
        const entityMetadata: EntityMetadata = {
            target: class TestEntity {},
            tableName: 'test_table',
            columns: new Map([
                [
                    'literalField',
                    {
                        propertyName: 'literalField',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'default_value',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'timestampField',
                    {
                        propertyName: 'timestampField',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'CURRENT_TIMESTAMP',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'quotedStringField',
                    {
                        propertyName: 'quotedStringField',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: "value with 'quotes'",
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
            ]),
            primaryColumns: [],
            indexes: [],
        };

        const sql = sqlGenerator.generateCreateTable(entityMetadata);

        expect(sql).toContain('"literalField" TEXT NOT NULL DEFAULT \'default_value\'');
        expect(sql).toContain('"timestampField" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');
        expect(sql).toContain("\"quotedStringField\" TEXT NOT NULL DEFAULT 'value with ''quotes'''");
    });

    test('should handle mixed sqlDefault types in one table', () => {
        const entityMetadata: EntityMetadata = {
            target: class TestEntity {},
            tableName: 'mixed_defaults',
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
                    },
                ],
                [
                    'count',
                    {
                        propertyName: 'count',
                        type: 'integer',
                        nullable: false,
                        unique: false,
                        sqlDefault: 0,
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'isActive',
                    {
                        propertyName: 'isActive',
                        type: 'integer',
                        nullable: false,
                        unique: false,
                        sqlDefault: true,
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'name',
                    {
                        propertyName: 'name',
                        type: 'text',
                        nullable: true,
                        unique: false,
                        sqlDefault: null,
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'createdAt',
                    {
                        propertyName: 'createdAt',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'CURRENT_TIMESTAMP',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
            ]),
            primaryColumns: [],
            indexes: [],
        };

        const sql = sqlGenerator.generateCreateTable(entityMetadata);

        expect(sql).toContain('"id" INTEGER PRIMARY KEY AUTOINCREMENT');
        expect(sql).toContain('"count" INTEGER NOT NULL DEFAULT 0');
        expect(sql).toContain('"isActive" INTEGER NOT NULL DEFAULT 1');
        expect(sql).toContain('"name" TEXT DEFAULT NULL');
        expect(sql).toContain('"createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');
    });
});
