export class EntityNotFoundError extends Error {
    constructor(entityName: string, criteria: unknown) {
        let criteriaString: string;
        try {
            criteriaString = JSON.stringify(criteria);
        } catch (error) {
            // Handle circular references or other JSON.stringify errors
            criteriaString = '[object with circular reference or non-serializable data]';
        }
        super(`${entityName} not found with criteria: ${criteriaString}`);
        this.name = 'EntityNotFoundError';
    }
}
