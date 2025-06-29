import { BunSqliteOrmError } from './bun-sqlite-orm-error';

export class EntityNotFoundError extends BunSqliteOrmError {
    public readonly criteria: unknown;

    constructor(entityName: string, criteria: unknown) {
        let criteriaString: string;
        try {
            criteriaString = JSON.stringify(criteria);
        } catch (error) {
            // Handle circular references or other JSON.stringify errors
            criteriaString = '[object with circular reference or non-serializable data]';
        }
        super(`${entityName} not found with criteria: ${criteriaString}`, entityName);
        this.criteria = criteria;
    }

    get entity(): string {
        if (!this.entityName) {
            throw new Error('EntityNotFoundError must have an entityName');
        }
        return this.entityName;
    }
}
