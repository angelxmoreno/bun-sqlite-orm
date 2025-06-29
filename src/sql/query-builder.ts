import { injectable } from 'tsyringe';
import type { ColumnMetadata, SQLQueryBindings } from '../types';
import { buildInsertClause, buildSetClause, buildWhereClause } from './query-utils';

@injectable()
export class QueryBuilder {
    createTable(tableName: string, columns: Map<string, ColumnMetadata>): string {
        const columnDefinitions: string[] = [];

        for (const [propertyName, metadata] of columns) {
            // Map JSON column type to TEXT for SQLite storage
            const sqlType = metadata.type === 'json' ? 'TEXT' : metadata.type.toUpperCase();
            let definition = `${propertyName} ${sqlType}`;

            if (metadata.isPrimary && metadata.generationStrategy === 'increment') {
                definition += ' PRIMARY KEY AUTOINCREMENT';
            } else if (metadata.isPrimary) {
                definition += ' PRIMARY KEY';
            }

            if (!metadata.nullable && !metadata.isPrimary) {
                definition += ' NOT NULL';
            }

            if (metadata.unique && !metadata.isPrimary) {
                definition += ' UNIQUE';
            }

            if (metadata.default !== undefined && typeof metadata.default === 'string') {
                definition += ` DEFAULT '${metadata.default}'`;
            } else if (metadata.default !== undefined && typeof metadata.default === 'number') {
                definition += ` DEFAULT ${metadata.default}`;
            }

            columnDefinitions.push(definition);
        }

        return `CREATE TABLE ${tableName} (${columnDefinitions.join(', ')})`;
    }

    insert(tableName: string, data: Record<string, SQLQueryBindings>): { sql: string; params: SQLQueryBindings[] } {
        // Prevent generating invalid SQL with empty data
        if (!data || Object.keys(data).length === 0) {
            throw new Error('Cannot perform INSERT with empty data: at least one column value must be provided');
        }

        const { columns, placeholders, params } = buildInsertClause(data);

        return {
            sql: `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
            params,
        };
    }

    select(
        tableName: string,
        conditions?: Record<string, SQLQueryBindings>,
        limit?: number
    ): { sql: string; params: SQLQueryBindings[] } {
        let sql = `SELECT * FROM ${tableName}`;
        const { whereClause, params } = buildWhereClause(conditions || {});

        sql += whereClause;

        if (limit) {
            sql += ` LIMIT ${limit}`;
        }

        return { sql, params };
    }

    update(
        tableName: string,
        data: Record<string, SQLQueryBindings>,
        conditions: Record<string, SQLQueryBindings>,
        allowBulkUpdate = false
    ): { sql: string; params: SQLQueryBindings[] } {
        // Prevent accidental full-table updates unless explicitly allowed
        if (!allowBulkUpdate && (!conditions || Object.keys(conditions).length === 0)) {
            throw new Error('Cannot perform UPDATE without WHERE conditions: this would update all rows in the table');
        }

        const { setClause, params: setParams } = buildSetClause(data);
        const { whereClause, params: whereParams } = buildWhereClause(conditions || {});

        return {
            sql: `UPDATE ${tableName} SET ${setClause}${whereClause}`,
            params: [...setParams, ...whereParams],
        };
    }

    delete(
        tableName: string,
        conditions: Record<string, SQLQueryBindings>,
        allowBulkDelete = false
    ): { sql: string; params: SQLQueryBindings[] } {
        // Prevent accidental full-table deletions unless explicitly allowed
        if (!allowBulkDelete && (!conditions || Object.keys(conditions).length === 0)) {
            throw new Error('Cannot perform DELETE without WHERE conditions: this would delete all rows in the table');
        }

        const { whereClause, params } = buildWhereClause(conditions || {});

        return {
            sql: `DELETE FROM ${tableName}${whereClause}`,
            params,
        };
    }

    count(
        tableName: string,
        conditions?: Record<string, SQLQueryBindings>
    ): { sql: string; params: SQLQueryBindings[] } {
        let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
        const { whereClause, params } = buildWhereClause(conditions || {});

        sql += whereClause;

        return { sql, params };
    }
}
