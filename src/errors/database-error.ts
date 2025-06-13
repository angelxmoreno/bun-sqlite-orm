export class DatabaseError extends Error {
    public originalError: Error;

    constructor(message: string, originalError: Error) {
        super(`${message}: ${originalError.message}`);
        this.name = 'DatabaseError';
        this.originalError = originalError;
    }
}
