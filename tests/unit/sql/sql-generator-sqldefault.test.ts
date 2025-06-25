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

    test('should handle enhanced SQL expression detection', () => {
        const entityMetadata: EntityMetadata = {
            target: class TestEntity {},
            tableName: 'enhanced_sql_expressions',
            columns: new Map([
                // Case variations of CURRENT_ functions
                [
                    'upperCurrentTime',
                    {
                        propertyName: 'upperCurrentTime',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'CURRENT_TIME',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'lowerCurrentTime',
                    {
                        propertyName: 'lowerCurrentTime',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'current_time',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'mixedCurrentDate',
                    {
                        propertyName: 'mixedCurrentDate',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'Current_Date',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                // SQL functions with parentheses
                [
                    'randomFunc',
                    {
                        propertyName: 'randomFunc',
                        type: 'real',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'RANDOM()',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                // String literals that should NOT be treated as SQL expressions
                [
                    'literalRandom',
                    {
                        propertyName: 'literalRandom',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'random text',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'literalWithParens',
                    {
                        propertyName: 'literalWithParens',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'some text (with parens)',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                // Edge cases - strings that might look like SQL but aren't
                [
                    'fakeCurrentFunction',
                    {
                        propertyName: 'fakeCurrentFunction',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'not current_time',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
            ]),
            primaryColumns: [],
            indexes: [],
        };

        const sql = sqlGenerator.generateCreateTable(entityMetadata);

        // These should be treated as SQL expressions (unquoted)
        expect(sql).toContain('"upperCurrentTime" TEXT NOT NULL DEFAULT CURRENT_TIME');
        expect(sql).toContain('"lowerCurrentTime" TEXT NOT NULL DEFAULT current_time');
        expect(sql).toContain('"mixedCurrentDate" TEXT NOT NULL DEFAULT Current_Date');
        expect(sql).toContain('"randomFunc" REAL NOT NULL DEFAULT RANDOM()');

        // These should be treated as string literals (quoted)
        expect(sql).toContain('"literalRandom" TEXT NOT NULL DEFAULT \'random text\'');
        expect(sql).toContain('"literalWithParens" TEXT NOT NULL DEFAULT \'some text (with parens)\'');
        expect(sql).toContain('"fakeCurrentFunction" TEXT NOT NULL DEFAULT \'not current_time\'');
    });

    test('should handle false positive edge cases', () => {
        const entityMetadata: EntityMetadata = {
            target: class TestEntity {},
            tableName: 'false_positive_test',
            columns: new Map([
                // Strings that contain SQL-like patterns but should be literals
                [
                    'containsCurrent',
                    {
                        propertyName: 'containsCurrent',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'The current time is now',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'containsDefault',
                    {
                        propertyName: 'containsDefault',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'This is the default value',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'allCapsText',
                    {
                        propertyName: 'allCapsText',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'SOME ALL CAPS TEXT',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                // Valid SQL expressions that should NOT be quoted
                [
                    'validDefault',
                    {
                        propertyName: 'validDefault',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        sqlDefault: 'DEFAULT',
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
                [
                    'validCurrentTimestamp',
                    {
                        propertyName: 'validCurrentTimestamp',
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

        // These contain SQL-like words but should be treated as string literals
        expect(sql).toContain('"containsCurrent" TEXT NOT NULL DEFAULT \'The current time is now\'');
        expect(sql).toContain('"containsDefault" TEXT NOT NULL DEFAULT \'This is the default value\'');
        expect(sql).toContain('"allCapsText" TEXT NOT NULL DEFAULT \'SOME ALL CAPS TEXT\'');

        // These should be treated as SQL expressions (unquoted)
        expect(sql).toContain('"validDefault" TEXT NOT NULL DEFAULT DEFAULT');
        expect(sql).toContain('"validCurrentTimestamp" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');
    });
});
