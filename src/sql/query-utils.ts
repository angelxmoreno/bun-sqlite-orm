import type { SQLQueryBindings } from '../types';

/**
 * Utility functions to reduce code duplication in SQL generation
 */

/**
 * Builds a WHERE clause from conditions
 */
export function buildWhereClause(conditions: Record<string, SQLQueryBindings>): {
    whereClause: string;
    params: SQLQueryBindings[];
} {
    if (!conditions || Object.keys(conditions).length === 0) {
        return { whereClause: '', params: [] };
    }

    const whereClause = Object.keys(conditions)
        .map((key) => `${key} = ?`)
        .join(' AND ');

    const params = Object.values(conditions);

    return { whereClause: ` WHERE ${whereClause}`, params };
}

/**
 * Builds a SET clause for UPDATE statements
 */
export function buildSetClause(data: Record<string, SQLQueryBindings>): {
    setClause: string;
    params: SQLQueryBindings[];
} {
    if (!data || Object.keys(data).length === 0) {
        throw new Error('Cannot build SET clause: data object is empty');
    }

    const setClause = Object.keys(data)
        .map((key) => `${key} = ?`)
        .join(', ');

    const params = Object.values(data);

    return { setClause, params };
}

/**
 * Builds column list and placeholders for INSERT statements
 */
export function buildInsertClause(data: Record<string, SQLQueryBindings>): {
    columns: string;
    placeholders: string;
    params: SQLQueryBindings[];
} {
    const keys = Object.keys(data);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const params = Object.values(data);

    return { columns, placeholders, params };
}
