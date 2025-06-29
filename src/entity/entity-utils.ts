import type { Database } from 'bun:sqlite';
import { typeBunContainer } from '../container';
import { DatabaseError, EntityNotFoundError } from '../errors';
import type { MetadataContainer } from '../metadata';
import type { DbLogger, EntityConstructor, SQLQueryBindings } from '../types';
import { dateToStorage } from '../utils/date-utils';

/**
 * Utility functions to reduce code duplication in BaseEntity
 */

export interface EntityDependencies {
    metadataContainer: MetadataContainer;
    logger: DbLogger;
    db: Database;
}

/**
 * Validates that DataSource is properly initialized before database operations
 */
export function validateDataSourceInitialization(): void {
    try {
        // Try to resolve required services - if this succeeds, we're either properly initialized
        // or in a test environment with mocked services
        typeBunContainer.resolve<Database>('DatabaseConnection');
        typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        typeBunContainer.resolve<DbLogger>('DbLogger');
    } catch (error) {
        // If any service resolution fails, the DataSource is not properly initialized
        throw new Error(
            'DataSource must be initialized before database operations. Call DataSource.initialize() first.'
        );
    }
}

/**
 * Resolves common dependencies used across entity methods
 */
export function resolveDependencies(): EntityDependencies {
    // Validate initialization before attempting to resolve dependencies
    validateDataSourceInitialization();

    return {
        metadataContainer: typeBunContainer.resolve<MetadataContainer>('MetadataContainer'),
        logger: typeBunContainer.resolve<DbLogger>('DbLogger'),
        db: typeBunContainer.resolve<Database>('DatabaseConnection'),
    };
}

/**
 * Executes a database operation with standardized error handling
 */
export async function executeWithErrorHandling<T>(
    operation: () => Promise<T> | T,
    operationName: string,
    entityName: string,
    logger: DbLogger
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        // Preserve specific error types like EntityNotFoundError
        if (error instanceof EntityNotFoundError) {
            throw error;
        }
        logger.error(`Database error in ${entityName}.${operationName}()`, error);
        throw new DatabaseError(
            `Failed to ${operationName.toLowerCase()} ${entityName}`,
            error as Error,
            entityName,
            operationName.toLowerCase()
        );
    }
}

/**
 * Validates if a value is a valid SQLQueryBinding
 */
export function isValidSQLQueryBinding(value: unknown): value is SQLQueryBindings {
    return (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint' ||
        value instanceof Uint8Array
    );
}

/**
 * Converts a value to a valid SQLQueryBinding, handling Date conversion using DateUtils
 */
export function toSQLQueryBinding(value: unknown): SQLQueryBindings | undefined {
    if (value === undefined) {
        return undefined;
    }

    const convertedValue = value instanceof Date ? dateToStorage(value) : value;

    return isValidSQLQueryBinding(convertedValue) ? convertedValue : undefined;
}

/**
 * Builds conditions object from primary key values
 */
export function buildPrimaryKeyConditions(
    entity: object,
    primaryColumns: Array<{ propertyName: string }>
): Record<string, SQLQueryBindings> {
    const conditions: Record<string, SQLQueryBindings> = {};

    for (const primaryColumn of primaryColumns) {
        const value = (entity as Record<string, unknown>)[primaryColumn.propertyName];
        const sqlBinding = toSQLQueryBinding(value);

        if (sqlBinding !== undefined) {
            conditions[primaryColumn.propertyName] = sqlBinding;
        }
    }

    return conditions;
}

/**
 * Builds data object for insert/update operations, filtering valid SQLQueryBindings
 */
export function buildDataObject(
    entity: object,
    columns: Map<string, { propertyName: string; isPrimary?: boolean }>,
    excludePrimary = false
): Record<string, SQLQueryBindings> {
    const data: Record<string, SQLQueryBindings> = {};

    for (const [propertyName, metadata] of columns) {
        if (excludePrimary && metadata.isPrimary) {
            continue;
        }

        const value = (entity as Record<string, unknown>)[propertyName];
        const sqlBinding = toSQLQueryBinding(value);

        if (sqlBinding !== undefined) {
            data[propertyName] = sqlBinding;
        }
    }

    return data;
}

/**
 * Gets table name and validates entity has primary keys
 */
export function getEntityMetadata(
    entityConstructor: EntityConstructor,
    metadataContainer: MetadataContainer,
    requirePrimaryKey = false
): { tableName: string; primaryColumns: Array<{ propertyName: string; generationStrategy?: string }> } {
    const tableName = metadataContainer.getTableName(entityConstructor);
    const primaryColumns = metadataContainer.getPrimaryColumns(entityConstructor);

    if (requirePrimaryKey && primaryColumns.length === 0) {
        throw new Error(`No primary key defined for entity ${entityConstructor.name}`);
    }

    return { tableName, primaryColumns };
}
