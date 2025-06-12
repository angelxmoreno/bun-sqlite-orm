export class EntityNotFoundError extends Error {
    constructor(entityName: string, criteria: unknown) {
        super(`${entityName} not found with criteria: ${JSON.stringify(criteria)}`);
        this.name = 'EntityNotFoundError';
    }
}
