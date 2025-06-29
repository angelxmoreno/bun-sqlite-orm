import { BunSqliteOrmError } from './bun-sqlite-orm-error';

export class QueryError extends BunSqliteOrmError {
    public readonly sql?: string;
    public readonly parameters?: unknown[];

    constructor(message: string, entityName?: string, sql?: string, parameters?: unknown[]) {
        super(message, entityName);
        this.sql = sql;
        this.parameters = parameters;
    }
}
