import { BunSqliteOrmError } from './bun-sqlite-orm-error';

export class TransactionError extends BunSqliteOrmError {
    public readonly transactionId?: string;
    public readonly operation: 'begin' | 'commit' | 'rollback' | 'savepoint';

    constructor(message: string, operation: 'begin' | 'commit' | 'rollback' | 'savepoint', transactionId?: string) {
        super(message);
        this.operation = operation;
        this.transactionId = transactionId;
    }
}
