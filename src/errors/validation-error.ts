export interface ValidationErrorDetail {
    property: string;
    message: string;
    value?: unknown;
}

import { BunSqliteOrmError } from './bun-sqlite-orm-error';

export class ValidationError extends BunSqliteOrmError {
    public readonly errors: ValidationErrorDetail[];

    constructor(entityName: string, errors: ValidationErrorDetail[]) {
        super(`Validation failed for ${entityName}`, entityName);
        this.errors = errors;
    }
}
