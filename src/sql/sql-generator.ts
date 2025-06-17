import { injectable } from 'tsyringe';
import type { EntityMetadata } from '../types';

@injectable()
export class SqlGenerator {
    generateCreateTable(entity: EntityMetadata): string {
        const columns: string[] = [];

        for (const [, column] of entity.columns) {
            let columnDef = `${column.propertyName} ${column.type.toUpperCase()}`;

            if (column.isPrimary && column.isGenerated && column.generationStrategy === 'increment') {
                columnDef += ' PRIMARY KEY AUTOINCREMENT';
            } else if (column.isPrimary) {
                columnDef += ' PRIMARY KEY';
            }

            if (!column.nullable && !column.isPrimary) {
                columnDef += ' NOT NULL';
            }

            if (column.unique && !column.isPrimary) {
                columnDef += ' UNIQUE';
            }

            // Handle SQL defaults first (takes precedence)
            if (column.sqlDefault !== undefined) {
                columnDef += ` DEFAULT ${column.sqlDefault}`;
            } else if (column.default !== undefined && typeof column.default !== 'function') {
                columnDef += ` DEFAULT ${this.formatDefaultValue(column.default)}`;
            }

            columns.push(columnDef);
        }

        return `CREATE TABLE IF NOT EXISTS ${entity.tableName} (${columns.join(', ')})`;
    }

    generateInsert(tableName: string, data: Record<string, unknown>): { sql: string; values: unknown[] } {
        // Prevent generating invalid SQL with empty data
        if (!data || Object.keys(data).length === 0) {
            throw new Error('Cannot perform INSERT with empty data: at least one column value must be provided');
        }

        const columns = Object.keys(data);
        const placeholders = columns.map(() => '?').join(', ');
        const values = Object.values(data);

        const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        return { sql, values };
    }

    generateSelect(tableName: string, conditions: Record<string, unknown> = {}): { sql: string; values: unknown[] } {
        let sql = `SELECT * FROM ${tableName}`;
        const values: unknown[] = [];

        if (Object.keys(conditions).length > 0) {
            const whereConditions = Object.keys(conditions).map((key) => `${key} = ?`);
            sql += ` WHERE ${whereConditions.join(' AND ')}`;
            values.push(...Object.values(conditions));
        }

        return { sql, values };
    }

    generateUpdate(
        tableName: string,
        data: Record<string, unknown>,
        conditions: Record<string, unknown>
    ): { sql: string; values: unknown[] } {
        const setClause = Object.keys(data)
            .map((key) => `${key} = ?`)
            .join(', ');
        const whereClause = Object.keys(conditions)
            .map((key) => `${key} = ?`)
            .join(' AND ');

        const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
        const values = [...Object.values(data), ...Object.values(conditions)];

        return { sql, values };
    }

    generateDelete(tableName: string, conditions: Record<string, unknown>): { sql: string; values: unknown[] } {
        const whereClause = Object.keys(conditions)
            .map((key) => `${key} = ?`)
            .join(' AND ');
        const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
        const values = Object.values(conditions);

        return { sql, values };
    }

    generateCount(tableName: string, conditions: Record<string, unknown> = {}): { sql: string; values: unknown[] } {
        let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
        const values: unknown[] = [];

        if (Object.keys(conditions).length > 0) {
            const whereConditions = Object.keys(conditions).map((key) => `${key} = ?`);
            sql += ` WHERE ${whereConditions.join(' AND ')}`;
            values.push(...Object.values(conditions));
        }

        return { sql, values };
    }

    private formatDefaultValue(value: unknown): string {
        if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
        }
        if (typeof value === 'boolean') {
            return value ? '1' : '0';
        }
        if (typeof value === 'function') {
            // For function defaults, we'll handle them at insert time, not in DDL
            // Return CURRENT_TIMESTAMP for date functions as a common case
            return 'CURRENT_TIMESTAMP';
        }
        return String(value);
    }
}
