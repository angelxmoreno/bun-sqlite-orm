import { injectable } from 'tsyringe';
import type { EntityMetadata } from '../types';

@injectable()
export class SqlGenerator {
    generateCreateTable(entity: EntityMetadata): string {
        const columns: string[] = [];
        const primaryKeyColumns: string[] = [];

        if (entity.columns.size === 0) {
            throw new Error(
                `Cannot create table for entity "${entity.tableName}": Entity has no columns defined. Add @Column, @PrimaryColumn, or @PrimaryGeneratedColumn decorators.`
            );
        }

        // Collect primary key columns
        for (const [, column] of entity.columns) {
            if (column.isPrimary) {
                primaryKeyColumns.push(column.propertyName);
            }
        }

        // Generate column definitions
        for (const [, column] of entity.columns) {
            // Map JSON column type to TEXT for SQLite storage
            const sqlType = column.type === 'json' ? 'TEXT' : column.type.toUpperCase();
            let columnDef = `"${column.propertyName}" ${sqlType}`;

            // Handle single auto-increment primary key (SQLite special case)
            if (
                column.isPrimary &&
                column.isGenerated &&
                column.generationStrategy === 'increment' &&
                primaryKeyColumns.length === 1
            ) {
                columnDef += ' PRIMARY KEY AUTOINCREMENT';
            } else if (column.isPrimary && primaryKeyColumns.length === 1) {
                // Single primary key without auto-increment
                columnDef += ' PRIMARY KEY';
            }
            // For composite primary keys, we'll add the constraint at the table level

            if (!column.nullable && !column.isPrimary) {
                columnDef += ' NOT NULL';
            }

            if (column.unique && !column.isPrimary) {
                columnDef += ' UNIQUE';
            }

            // Handle SQL defaults first (takes precedence)
            if (column.sqlDefault !== undefined) {
                columnDef += ` DEFAULT ${this.formatSqlDefaultValue(column.sqlDefault)}`;
            } else if (column.default !== undefined && typeof column.default !== 'function') {
                columnDef += ` DEFAULT ${this.formatDefaultValue(column.default)}`;
            }

            columns.push(columnDef);
        }

        // Add table-level PRIMARY KEY constraint for composite keys
        if (primaryKeyColumns.length > 1) {
            const quotedPrimaryKeys = primaryKeyColumns.map((col) => `"${col}"`).join(', ');
            columns.push(`PRIMARY KEY (${quotedPrimaryKeys})`);
        }

        return `CREATE TABLE IF NOT EXISTS "${entity.tableName}" (${columns.join(', ')})`;
    }

    generateIndexes(entity: EntityMetadata): string[] {
        const indexStatements: string[] = [];

        for (const index of entity.indexes) {
            const uniqueKeyword = index.unique ? 'UNIQUE ' : '';
            const quotedColumns = index.columns.map((col) => `"${col}"`).join(', ');

            const createIndexSql = `CREATE ${uniqueKeyword}INDEX IF NOT EXISTS "${index.name}" ON "${entity.tableName}" (${quotedColumns})`;
            indexStatements.push(createIndexSql);
        }

        return indexStatements;
    }

    generateInsert(tableName: string, data: Record<string, unknown>): { sql: string; values: unknown[] } {
        // Prevent generating invalid SQL with empty data
        if (!data || Object.keys(data).length === 0) {
            throw new Error('Cannot perform INSERT with empty data: at least one column value must be provided');
        }

        const columns = Object.keys(data);
        const quotedColumns = columns.map((col) => `"${col}"`).join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        const values = Object.values(data);

        const sql = `INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders})`;
        return { sql, values };
    }

    generateSelect(tableName: string, conditions: Record<string, unknown> = {}): { sql: string; values: unknown[] } {
        let sql = `SELECT * FROM "${tableName}"`;
        const values: unknown[] = [];

        if (Object.keys(conditions).length > 0) {
            const whereConditions = Object.keys(conditions).map((key) => `"${key}" = ?`);
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
            .map((key) => `"${key}" = ?`)
            .join(', ');
        const whereClause = Object.keys(conditions)
            .map((key) => `"${key}" = ?`)
            .join(' AND ');

        const sql = `UPDATE "${tableName}" SET ${setClause} WHERE ${whereClause}`;
        const values = [...Object.values(data), ...Object.values(conditions)];

        return { sql, values };
    }

    generateDelete(tableName: string, conditions: Record<string, unknown>): { sql: string; values: unknown[] } {
        const whereClause = Object.keys(conditions)
            .map((key) => `"${key}" = ?`)
            .join(' AND ');
        const sql = `DELETE FROM "${tableName}" WHERE ${whereClause}`;
        const values = Object.values(conditions);

        return { sql, values };
    }

    generateCount(tableName: string, conditions: Record<string, unknown> = {}): { sql: string; values: unknown[] } {
        let sql = `SELECT COUNT(*) as count FROM "${tableName}"`;
        const values: unknown[] = [];

        if (Object.keys(conditions).length > 0) {
            const whereConditions = Object.keys(conditions).map((key) => `"${key}" = ?`);
            sql += ` WHERE ${whereConditions.join(' AND ')}`;
            values.push(...Object.values(conditions));
        }

        return { sql, values };
    }

    private formatSqlDefaultValue(value: string | number | boolean | null): string {
        // For SQL defaults, strings are usually SQL expressions or literals
        if (typeof value === 'string') {
            // Enhanced regex for SQLite-specific SQL expressions
            // Matches:
            // - CURRENT_TIME, CURRENT_DATE, CURRENT_TIMESTAMP (case insensitive)
            // - DEFAULT keyword (case insensitive)
            // - Simple functions with parentheses: RANDOM(), ABS(), etc.
            // - All uppercase constants: NULL, TRUE, FALSE (only if truly all uppercase)
            if (
                /^(CURRENT_(TIME|DATE|TIMESTAMP)|DEFAULT|RANDOM\(\)|ABS\(.*\)|COALESCE\(.*\))$/i.test(value) ||
                /^[A-Z_]+$/.test(value)
            ) {
                return value; // SQL expression, use as-is
            }
            // Otherwise treat as string literal
            return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
        }
        if (typeof value === 'number') {
            return String(value); // Numbers don't need quotes
        }
        if (typeof value === 'boolean') {
            return value ? '1' : '0'; // SQLite stores booleans as integers
        }
        if (value === null) {
            return 'NULL';
        }
        return String(value);
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
