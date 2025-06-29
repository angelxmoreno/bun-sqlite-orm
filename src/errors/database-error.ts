import { BunSqliteOrmError } from './bun-sqlite-orm-error';

export class DatabaseError extends BunSqliteOrmError {
    public readonly originalError: Error;
    public readonly operation?: string;

    constructor(message: string, originalError: Error, entityName?: string, operation?: string) {
        super(message, entityName);
        this.originalError = originalError;
        this.operation = operation;
    }
}
