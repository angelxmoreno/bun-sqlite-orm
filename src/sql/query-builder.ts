import { injectable } from 'tsyringe';
import type { ColumnMetadata, SQLQueryBindings } from '../types';

@injectable()
export class QueryBuilder {
    createTable(tableName: string, columns: Map<string, ColumnMetadata>): string {
        const columnDefinitions: string[] = [];

        for (const [propertyName, metadata] of columns) {
            let definition = `${propertyName} ${metadata.type.toUpperCase()}`;

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

    insert(tableName: string, data: Record<string, unknown>): { sql: string; params: SQLQueryBindings[] } {
        const columns = Object.keys(data);
        const placeholders = columns.map(() => '?').join(', ');
        const values = Object.values(data) as SQLQueryBindings[];

        return {
            sql: `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
            params: values,
        };
    }

    select(
        tableName: string,
        conditions?: Record<string, unknown>,
        limit?: number
    ): { sql: string; params: SQLQueryBindings[] } {
        let sql = `SELECT * FROM ${tableName}`;
        const params: SQLQueryBindings[] = [];

        if (conditions && Object.keys(conditions).length > 0) {
            const whereClause = Object.keys(conditions)
                .map((key) => `${key} = ?`)
                .join(' AND ');
            sql += ` WHERE ${whereClause}`;
            params.push(...(Object.values(conditions) as SQLQueryBindings[]));
        }

        if (limit) {
            sql += ` LIMIT ${limit}`;
        }

        return { sql, params };
    }

    update(
        tableName: string,
        data: Record<string, unknown>,
        conditions: Record<string, unknown>
    ): { sql: string; params: SQLQueryBindings[] } {
        const setClause = Object.keys(data)
            .map((key) => `${key} = ?`)
            .join(', ');

        const whereClause = Object.keys(conditions)
            .map((key) => `${key} = ?`)
            .join(' AND ');

        return {
            sql: `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`,
            params: [...Object.values(data), ...Object.values(conditions)] as SQLQueryBindings[],
        };
    }

    delete(tableName: string, conditions: Record<string, unknown>): { sql: string; params: SQLQueryBindings[] } {
        if (Object.keys(conditions).length === 0) {
            // Delete all records when no conditions provided
            return {
                sql: `DELETE FROM ${tableName}`,
                params: [],
            };
        }

        const whereClause = Object.keys(conditions)
            .map((key) => `${key} = ?`)
            .join(' AND ');

        return {
            sql: `DELETE FROM ${tableName} WHERE ${whereClause}`,
            params: Object.values(conditions) as SQLQueryBindings[],
        };
    }

    count(tableName: string, conditions?: Record<string, unknown>): { sql: string; params: SQLQueryBindings[] } {
        let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
        const params: SQLQueryBindings[] = [];

        if (conditions && Object.keys(conditions).length > 0) {
            const whereClause = Object.keys(conditions)
                .map((key) => `${key} = ?`)
                .join(' AND ');
            sql += ` WHERE ${whereClause}`;
            params.push(...(Object.values(conditions) as SQLQueryBindings[]));
        }

        return { sql, params };
    }
}
