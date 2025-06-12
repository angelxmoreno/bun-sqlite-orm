export interface ValidationErrorDetail {
    property: string;
    message: string;
    value?: unknown;
}

export class ValidationError extends Error {
    public errors: ValidationErrorDetail[];

    constructor(errors: ValidationErrorDetail[]) {
        super('Validation failed');
        this.name = 'ValidationError';
        this.errors = errors;
    }
}
