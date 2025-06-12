import { beforeEach, describe, expect, test } from 'bun:test';
import { QueryBuilder } from '../../../src/sql/query-builder';
import type { ColumnMetadata } from '../../../src/types';

describe('QueryBuilder', () => {
    let queryBuilder: QueryBuilder;

    beforeEach(() => {
        queryBuilder = new QueryBuilder();
    });

    describe('createTable', () => {
        test('should create table with auto-increment primary key', () => {
            const columns = new Map<string, ColumnMetadata>([
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
            ]);

            const sql = queryBuilder.createTable('users', columns);

            expect(sql).toBe('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)');
        });

        test('should create table with UUID primary key', () => {
            const columns = new Map<string, ColumnMetadata>([
                [
                    'id',
                    {
                        propertyName: 'id',
                        type: 'text',
                        nullable: false,
                        unique: true,
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid',
                    },
                ],
                [
                    'title',
                    {
                        propertyName: 'title',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
            ]);

            const sql = queryBuilder.createTable('posts', columns);

            expect(sql).toBe('CREATE TABLE posts (id TEXT PRIMARY KEY, title TEXT NOT NULL)');
        });

        test('should create table with manual primary key', () => {
            const columns = new Map<string, ColumnMetadata>([
                [
                    'code',
                    {
                        propertyName: 'code',
                        type: 'text',
                        nullable: false,
                        unique: true,
                        isPrimary: true,
                        isGenerated: false,
                    },
                ],
                [
                    'description',
                    {
                        propertyName: 'description',
                        type: 'text',
                        nullable: true,
                        unique: false,
                        isPrimary: false,
                        isGenerated: false,
                    },
                ],
            ]);

            const sql = queryBuilder.createTable('categories', columns);

            expect(sql).toBe('CREATE TABLE categories (code TEXT PRIMARY KEY, description TEXT)');
        });

        test('should create table with various column constraints', () => {
            const columns = new Map<string, ColumnMetadata>([
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
                    },
                ],
            ]);

            const sql = queryBuilder.createTable('complex_users', columns);

            expect(sql).toBe(
                'CREATE TABLE complex_users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, age INTEGER, score REAL NOT NULL)'
            );
        });

        test('should handle string defaults', () => {
            const columns = new Map<string, ColumnMetadata>([
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
            ]);

            const sql = queryBuilder.createTable('users', columns);

            expect(sql).toBe(
                "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT NOT NULL DEFAULT 'active')"
            );
        });

        test('should handle numeric defaults', () => {
            const columns = new Map<string, ColumnMetadata>([
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
                        default: 0,
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
            ]);

            const sql = queryBuilder.createTable('products', columns);

            expect(sql).toBe(
                'CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, count INTEGER NOT NULL DEFAULT 0, price REAL NOT NULL DEFAULT 19.99)'
            );
        });

        test('should ignore non-string and non-number defaults', () => {
            const columns = new Map<string, ColumnMetadata>([
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
                    'data',
                    {
                        propertyName: 'data',
                        type: 'text',
                        nullable: false,
                        unique: false,
                        isPrimary: false,
                        isGenerated: false,
                        default: () => 'dynamic value', // Function defaults should be ignored
                    },
                ],
            ]);

            const sql = queryBuilder.createTable('test_table', columns);

            expect(sql).toBe('CREATE TABLE test_table (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL)');
        });
    });

    describe('insert', () => {
        test('should generate INSERT statement', () => {
            const data = { name: 'John', email: 'john@example.com', age: 30 };
            const result = queryBuilder.insert('users', data);

            expect(result.sql).toBe('INSERT INTO users (name, email, age) VALUES (?, ?, ?)');
            expect(result.params).toEqual(['John', 'john@example.com', 30]);
        });

        test('should handle single column insert', () => {
            const data = { name: 'John' };
            const result = queryBuilder.insert('users', data);

            expect(result.sql).toBe('INSERT INTO users (name) VALUES (?)');
            expect(result.params).toEqual(['John']);
        });

        test('should handle empty data object', () => {
            const data = {};
            const result = queryBuilder.insert('users', data);

            expect(result.sql).toBe('INSERT INTO users () VALUES ()');
            expect(result.params).toEqual([]);
        });

        test('should handle various data types', () => {
            const data = {
                name: 'John',
                age: 30,
                score: 95.5,
                isActive: true,
                metadata: null,
            };
            const result = queryBuilder.insert('users', data);

            expect(result.sql).toBe('INSERT INTO users (name, age, score, isActive, metadata) VALUES (?, ?, ?, ?, ?)');
            expect(result.params).toEqual(['John', 30, 95.5, true, null]);
        });
    });

    describe('select', () => {
        test('should generate SELECT statement without conditions', () => {
            const result = queryBuilder.select('users');

            expect(result.sql).toBe('SELECT * FROM users');
            expect(result.params).toEqual([]);
        });

        test('should generate SELECT statement with conditions', () => {
            const conditions = { name: 'John', age: 30 };
            const result = queryBuilder.select('users', conditions);

            expect(result.sql).toBe('SELECT * FROM users WHERE name = ? AND age = ?');
            expect(result.params).toEqual(['John', 30]);
        });

        test('should generate SELECT statement with limit', () => {
            const result = queryBuilder.select('users', undefined, 10);

            expect(result.sql).toBe('SELECT * FROM users LIMIT 10');
            expect(result.params).toEqual([]);
        });

        test('should generate SELECT statement with conditions and limit', () => {
            const conditions = { isActive: true };
            const result = queryBuilder.select('users', conditions, 5);

            expect(result.sql).toBe('SELECT * FROM users WHERE isActive = ? LIMIT 5');
            expect(result.params).toEqual([true]);
        });

        test('should handle empty conditions object', () => {
            const result = queryBuilder.select('users', {});

            expect(result.sql).toBe('SELECT * FROM users');
            expect(result.params).toEqual([]);
        });

        test('should handle single condition', () => {
            const conditions = { id: 1 };
            const result = queryBuilder.select('users', conditions);

            expect(result.sql).toBe('SELECT * FROM users WHERE id = ?');
            expect(result.params).toEqual([1]);
        });
    });

    describe('update', () => {
        test('should generate UPDATE statement', () => {
            const data = { name: 'Jane', email: 'jane@example.com' };
            const conditions = { id: 1 };
            const result = queryBuilder.update('users', data, conditions);

            expect(result.sql).toBe('UPDATE users SET name = ?, email = ? WHERE id = ?');
            expect(result.params).toEqual(['Jane', 'jane@example.com', 1]);
        });

        test('should generate UPDATE statement with multiple conditions', () => {
            const data = { status: 'inactive' };
            const conditions = { name: 'John', age: 30 };
            const result = queryBuilder.update('users', data, conditions);

            expect(result.sql).toBe('UPDATE users SET status = ? WHERE name = ? AND age = ?');
            expect(result.params).toEqual(['inactive', 'John', 30]);
        });

        test('should handle single field update', () => {
            const data = { lastLogin: '2024-01-01' };
            const conditions = { id: 1 };
            const result = queryBuilder.update('users', data, conditions);

            expect(result.sql).toBe('UPDATE users SET lastLogin = ? WHERE id = ?');
            expect(result.params).toEqual(['2024-01-01', 1]);
        });

        test('should handle various data types in update', () => {
            const data = {
                name: 'Updated Name',
                age: 35,
                score: 88.5,
                isActive: false,
            };
            const conditions = { id: 1 };
            const result = queryBuilder.update('users', data, conditions);

            expect(result.sql).toBe('UPDATE users SET name = ?, age = ?, score = ?, isActive = ? WHERE id = ?');
            expect(result.params).toEqual(['Updated Name', 35, 88.5, false, 1]);
        });
    });

    describe('delete', () => {
        test('should generate DELETE statement', () => {
            const conditions = { id: 1 };
            const result = queryBuilder.delete('users', conditions);

            expect(result.sql).toBe('DELETE FROM users WHERE id = ?');
            expect(result.params).toEqual([1]);
        });

        test('should generate DELETE statement with multiple conditions', () => {
            const conditions = { name: 'John', age: 30 };
            const result = queryBuilder.delete('users', conditions);

            expect(result.sql).toBe('DELETE FROM users WHERE name = ? AND age = ?');
            expect(result.params).toEqual(['John', 30]);
        });

        test('should handle various condition types', () => {
            const conditions = {
                isActive: false,
                score: 0,
                lastLogin: null,
            };
            const result = queryBuilder.delete('users', conditions);

            expect(result.sql).toBe('DELETE FROM users WHERE isActive = ? AND score = ? AND lastLogin = ?');
            expect(result.params).toEqual([false, 0, null]);
        });
    });

    describe('count', () => {
        test('should generate COUNT statement without conditions', () => {
            const result = queryBuilder.count('users');

            expect(result.sql).toBe('SELECT COUNT(*) as count FROM users');
            expect(result.params).toEqual([]);
        });

        test('should generate COUNT statement with conditions', () => {
            const conditions = { isActive: true, age: 30 };
            const result = queryBuilder.count('users', conditions);

            expect(result.sql).toBe('SELECT COUNT(*) as count FROM users WHERE isActive = ? AND age = ?');
            expect(result.params).toEqual([true, 30]);
        });

        test('should handle empty conditions object', () => {
            const result = queryBuilder.count('users', {});

            expect(result.sql).toBe('SELECT COUNT(*) as count FROM users');
            expect(result.params).toEqual([]);
        });

        test('should handle single condition', () => {
            const conditions = { department: 'Engineering' };
            const result = queryBuilder.count('employees', conditions);

            expect(result.sql).toBe('SELECT COUNT(*) as count FROM employees WHERE department = ?');
            expect(result.params).toEqual(['Engineering']);
        });
    });

    describe('SQL injection protection', () => {
        test('should use parameterized queries for insert', () => {
            const data = {
                name: "'; DROP TABLE users; --",
                description: 'Malicious input',
            };
            const result = queryBuilder.insert('users', data);

            expect(result.sql).toBe('INSERT INTO users (name, description) VALUES (?, ?)');
            expect(result.params).toEqual(["'; DROP TABLE users; --", 'Malicious input']);
        });

        test('should use parameterized queries for select conditions', () => {
            const conditions = {
                name: "'; DROP TABLE users; --",
            };
            const result = queryBuilder.select('users', conditions);

            expect(result.sql).toBe('SELECT * FROM users WHERE name = ?');
            expect(result.params).toEqual(["'; DROP TABLE users; --"]);
        });

        test('should use parameterized queries for update', () => {
            const data = { name: "'; DROP TABLE users; --" };
            const conditions = { id: 1 };
            const result = queryBuilder.update('users', data, conditions);

            expect(result.sql).toBe('UPDATE users SET name = ? WHERE id = ?');
            expect(result.params).toEqual(["'; DROP TABLE users; --", 1]);
        });

        test('should use parameterized queries for delete', () => {
            const conditions = {
                name: "'; DROP TABLE users; --",
            };
            const result = queryBuilder.delete('users', conditions);

            expect(result.sql).toBe('DELETE FROM users WHERE name = ?');
            expect(result.params).toEqual(["'; DROP TABLE users; --"]);
        });
    });
});
