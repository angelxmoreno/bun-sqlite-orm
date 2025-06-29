import { BunSqliteOrmError } from './bun-sqlite-orm-error';

export class ConstraintViolationError extends BunSqliteOrmError {
    public readonly constraintType: 'unique' | 'foreign_key' | 'check' | 'not_null';
    public readonly columnName?: string;
    public readonly value?: unknown;

    constructor(
        message: string,
        constraintType: 'unique' | 'foreign_key' | 'check' | 'not_null',
        entityName?: string,
        columnName?: string,
        value?: unknown
    ) {
        super(message, entityName);
        this.constraintType = constraintType;
        this.columnName = columnName;
        this.value = value;
    }
}
