import 'reflect-metadata';
import { getGlobalMetadataContainer } from '../container';
import type { IndexMetadata, IndexOptions } from '../types';

/**
 * Index decorator for creating database indexes
 *
 * Usage:
 * @Index() - Creates simple index with auto-generated name
 * @Index('idx_user_email') - Creates named index on single column
 * @Index('idx_user_name', ['firstName', 'lastName']) - Creates composite index
 * @Index('idx_unique_email', ['email'], { unique: true }) - Creates unique index
 */
export function Index(): PropertyDecorator;
export function Index(name: string): PropertyDecorator;
export function Index(name: string, columns: string[], options?: IndexOptions): ClassDecorator;
export function Index(
    nameOrNothing?: string,
    columns?: string[],
    options: IndexOptions = {}
): PropertyDecorator | ClassDecorator {
    // Case 1: @Index() or @Index('name') on property
    if (!columns) {
        return (target: object, propertyKey?: string | symbol) => {
            if (typeof propertyKey !== 'string') {
                throw new Error('@Index decorator on property requires a property name');
            }

            const metadataContainer = getGlobalMetadataContainer();
            const entityConstructor = target.constructor as new () => unknown;

            // Auto-register entity if not already registered
            if (!metadataContainer.hasEntity(entityConstructor)) {
                const tableName = entityConstructor.name.toLowerCase();
                metadataContainer.addEntity(entityConstructor, tableName);
            }

            // Generate index name if not provided
            const tableName = metadataContainer.getTableName(entityConstructor);
            const indexName = nameOrNothing || `idx_${tableName}_${propertyKey}`;

            const indexMetadata: IndexMetadata = {
                name: indexName,
                columns: [propertyKey],
                unique: options.unique || false,
            };

            metadataContainer.addIndex(entityConstructor, indexMetadata);
        };
    }

    // Case 2: @Index('name', ['col1', 'col2'], options) on class
    return (target: new () => unknown) => {
        if (!nameOrNothing) {
            throw new Error('Index name is required for composite indexes');
        }

        const metadataContainer = getGlobalMetadataContainer();

        // Auto-register entity if not already registered
        if (!metadataContainer.hasEntity(target)) {
            const tableName = target.name.toLowerCase();
            metadataContainer.addEntity(target, tableName);
        }

        const indexMetadata: IndexMetadata = {
            name: nameOrNothing,
            columns: columns,
            unique: options.unique || false,
        };

        metadataContainer.addIndex(target, indexMetadata);
    };
}
