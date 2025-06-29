import { BunSqliteOrmError } from './bun-sqlite-orm-error';

export class TypeConversionError extends BunSqliteOrmError {
    public readonly propertyName: string;
    public readonly expectedType: string;
    public readonly actualValue: unknown;

    constructor(
        message: string,
        propertyName: string,
        expectedType: string,
        actualValue: unknown,
        entityName?: string
    ) {
        super(message, entityName);
        this.propertyName = propertyName;
        this.expectedType = expectedType;
        this.actualValue = actualValue;
    }
}
