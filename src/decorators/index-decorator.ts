import 'reflect-metadata';
import { getGlobalMetadataContainer } from '../container';
import type { IndexMetadata, IndexOptions } from '../types';

/**
 * Index decorator for creating database indexes
 *
 * Usage:
 * @Index() - Creates simple index with auto-generated name
 * @Index('idx_user_email') - Creates named index on single column
 * @Index({ unique: true }) - Creates unique index with auto-generated name
 * @Index('idx_unique_email', { unique: true }) - Creates unique index with custom name
 * @Index('idx_user_name', ['firstName', 'lastName']) - Creates composite index
 * @Index('idx_unique_email', ['email'], { unique: true }) - Creates unique composite index
 */
// Overloaded function signatures
export function Index(): PropertyDecorator;
export function Index(name: string): PropertyDecorator;
export function Index(options: IndexOptions): PropertyDecorator;
export function Index(name: string, options: IndexOptions): PropertyDecorator;
export function Index(name: string, columns: string[], options?: IndexOptions): ClassDecorator;

// Implementation
export function Index(
    nameOrOptions?: string | IndexOptions,
    columnsOrOptions?: string[] | IndexOptions,
    options: IndexOptions = {}
): PropertyDecorator | ClassDecorator {
    // Case 1: Property decorator - @Index(), @Index('name'), @Index(options), @Index('name', options)
    // For class decorators, we expect: @Index('name', ['col1', 'col2'], options?)
    // So if the second parameter exists but is not an array or IndexOptions object, it's invalid
    if (
        columnsOrOptions === undefined ||
        (typeof columnsOrOptions === 'object' && !Array.isArray(columnsOrOptions) && columnsOrOptions !== null)
    ) {
        const propertyDecorator: PropertyDecorator = (target: object, propertyKey?: string | symbol) => {
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

            // Parse arguments to determine name and options
            let indexName: string;
            let indexOptions: IndexOptions;

            if (typeof nameOrOptions === 'string') {
                // @Index('name') or @Index('name', options)
                indexName = nameOrOptions;
                indexOptions = (columnsOrOptions as IndexOptions) || {};
            } else if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
                // @Index(options)
                const tableName = metadataContainer.getTableName(entityConstructor);
                indexName = `idx_${tableName}_${propertyKey}`;
                indexOptions = nameOrOptions;
            } else {
                // @Index()
                const tableName = metadataContainer.getTableName(entityConstructor);
                indexName = `idx_${tableName}_${propertyKey}`;
                indexOptions = {};
            }

            const indexMetadata: IndexMetadata = {
                name: indexName,
                columns: [propertyKey],
                unique: indexOptions.unique || false,
            };

            metadataContainer.addIndex(entityConstructor, indexMetadata);
        };
        return propertyDecorator;
    }

    // Case 2: Class decorator - @Index('name', ['col1', 'col2'], options)
    const classDecorator: ClassDecorator = (target) => {
        if (typeof nameOrOptions !== 'string') {
            throw new Error('Index name is required for composite indexes');
        }

        const metadataContainer = getGlobalMetadataContainer();
        const entityConstructor = target as unknown as new () => unknown;

        // Auto-register entity if not already registered
        if (!metadataContainer.hasEntity(entityConstructor)) {
            const tableName = entityConstructor.name.toLowerCase();
            metadataContainer.addEntity(entityConstructor, tableName);
        }

        // Validate columns array for composite indexes
        const columns = columnsOrOptions as string[];

        // Check if columns array is empty
        if (!columns || columns.length === 0) {
            throw new Error('Composite index must specify at least one column');
        }

        // Check for duplicate column names
        const uniqueColumns = new Set(columns);
        if (uniqueColumns.size !== columns.length) {
            const duplicates = columns.filter((col, index) => columns.indexOf(col) !== index);
            throw new Error(`Duplicate column names in index '${nameOrOptions}': ${duplicates.join(', ')}`);
        }

        // Check if all columns exist on the target entity
        const entityColumns = metadataContainer.getColumns(entityConstructor);
        const invalidColumns = columns.filter((col) => !entityColumns.has(col));
        if (invalidColumns.length > 0) {
            throw new Error(`Index '${nameOrOptions}' references non-existent columns: ${invalidColumns.join(', ')}`);
        }

        const indexMetadata: IndexMetadata = {
            name: nameOrOptions,
            columns: columns,
            unique: options.unique || false,
        };

        metadataContainer.addIndex(entityConstructor, indexMetadata);
    };
    return classDecorator;
}
