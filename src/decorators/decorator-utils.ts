import { typeBunContainer } from '../container';
import type { MetadataContainer } from '../metadata';
import type { EntityConstructor } from '../types';

/**
 * Utility functions to reduce code duplication in decorators
 */

/**
 * Ensures entity is registered in metadata container (auto-registration)
 */
export function ensureEntityRegistered(entityConstructor: EntityConstructor): void {
    const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');

    if (!metadataContainer.hasEntity(entityConstructor)) {
        const tableName = entityConstructor.name.toLowerCase();
        metadataContainer.addEntity(entityConstructor, tableName);
    }
}

/**
 * Infers SQLite type from TypeScript type
 */
export function inferSQLiteType(target: object, propertyKey: string | symbol): 'text' | 'integer' | 'real' | 'blob' {
    const type = Reflect.getMetadata('design:type', target, propertyKey);

    if (type === Number) {
        return 'integer';
    }
    if (type === String) {
        return 'text';
    }
    if (type === Boolean) {
        return 'integer'; // SQLite stores booleans as integers
    }
    if (type === Date) {
        return 'text'; // Store dates as ISO strings
    }

    return 'text'; // Default fallback
}
