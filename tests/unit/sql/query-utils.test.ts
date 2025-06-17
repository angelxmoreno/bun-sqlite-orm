import { describe, expect, test } from 'bun:test';
import { buildInsertClause, buildSetClause, buildWhereClause } from '../../../src/sql/query-utils';

describe('Query Utils', () => {
    describe('buildSetClause', () => {
        test('should build SET clause with single field', () => {
            const data = { name: 'John' };
            const result = buildSetClause(data);

            expect(result.setClause).toBe('name = ?');
            expect(result.params).toEqual(['John']);
        });

        test('should build SET clause with multiple fields', () => {
            const data = { name: 'John', age: 30 };
            const result = buildSetClause(data);

            expect(result.setClause).toBe('name = ?, age = ?');
            expect(result.params).toEqual(['John', 30]);
        });

        test('should handle null values', () => {
            const data = { name: 'John', description: null };
            const result = buildSetClause(data);

            expect(result.setClause).toBe('name = ?, description = ?');
            expect(result.params).toEqual(['John', null]);
        });

        test('should throw error for empty data object', () => {
            expect(() => buildSetClause({})).toThrow('Cannot build SET clause: data object is empty');
        });

        test('should throw error for null data', () => {
            // @ts-expect-error Testing invalid input
            expect(() => buildSetClause(null)).toThrow('Cannot build SET clause: data object is empty');
        });

        test('should throw error for undefined data', () => {
            // @ts-expect-error Testing invalid input
            expect(() => buildSetClause(undefined)).toThrow('Cannot build SET clause: data object is empty');
        });
    });

    describe('buildWhereClause', () => {
        test('should build WHERE clause with single condition', () => {
            const conditions = { id: 1 };
            const result = buildWhereClause(conditions);

            expect(result.whereClause).toBe(' WHERE id = ?');
            expect(result.params).toEqual([1]);
        });

        test('should build WHERE clause with multiple conditions', () => {
            const conditions = { id: 1, name: 'John' };
            const result = buildWhereClause(conditions);

            expect(result.whereClause).toBe(' WHERE id = ? AND name = ?');
            expect(result.params).toEqual([1, 'John']);
        });

        test('should handle empty conditions object', () => {
            const conditions = {};
            const result = buildWhereClause(conditions);

            expect(result.whereClause).toBe('');
            expect(result.params).toEqual([]);
        });

        test('should handle null values in conditions', () => {
            const conditions = { id: 1, deleted_at: null };
            const result = buildWhereClause(conditions);

            expect(result.whereClause).toBe(' WHERE id = ? AND deleted_at = ?');
            expect(result.params).toEqual([1, null]);
        });
    });

    describe('buildInsertClause', () => {
        test('should build INSERT clause with single field', () => {
            const data = { name: 'John' };
            const result = buildInsertClause(data);

            expect(result.columns).toBe('name');
            expect(result.placeholders).toBe('?');
            expect(result.params).toEqual(['John']);
        });

        test('should build INSERT clause with multiple fields', () => {
            const data = { name: 'John', age: 30 };
            const result = buildInsertClause(data);

            expect(result.columns).toBe('name, age');
            expect(result.placeholders).toBe('?, ?');
            expect(result.params).toEqual(['John', 30]);
        });

        test('should handle empty data object', () => {
            const data = {};
            const result = buildInsertClause(data);

            expect(result.columns).toBe('');
            expect(result.placeholders).toBe('');
            expect(result.params).toEqual([]);
        });

        test('should handle null values', () => {
            const data = { name: 'John', description: null };
            const result = buildInsertClause(data);

            expect(result.columns).toBe('name, description');
            expect(result.placeholders).toBe('?, ?');
            expect(result.params).toEqual(['John', null]);
        });
    });
});
