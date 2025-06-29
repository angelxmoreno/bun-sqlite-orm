import type { Database, Statement } from 'bun:sqlite';
import { validate } from 'class-validator';
import { typeBunContainer } from '../container';
import { DatabaseError, EntityNotFoundError, ValidationError } from '../errors';
import type { ValidationErrorDetail } from '../errors';
import type { MetadataContainer } from '../metadata';
import type { QueryBuilder } from '../sql';
import { StatementCache } from '../statement-cache';
import type { CompositeKeyValue, DbLogger, EntityConstructor, PrimaryKeyValue, SQLQueryBindings } from '../types';
import { storageToDate } from '../utils/date-utils';
import {
    buildDataObject,
    buildPrimaryKeyConditions,
    executeWithErrorHandling,
    getEntityMetadata,
    resolveDependencies,
    toSQLQueryBinding,
    validateDataSourceInitialization,
} from './entity-utils';

export abstract class BaseEntity {
    private _isNew = true;
    private _originalValues: Record<string, unknown> = {};

    // Private helper for executing queries with cached prepared statements
    private static _executeQuery<T>(sql: string, params: SQLQueryBindings[], method: 'get' | 'all' | 'run'): T {
        const db = typeBunContainer.resolve<Database>('DatabaseConnection');

        // Use StatementCache for optimized prepared statement reuse
        // This provides 30-50% performance improvement for repeated queries
        return StatementCache.executeQuery<T>(db, sql, params, method);
    }

    // Static methods
    static async create<T extends BaseEntity>(this: new () => T, data: Partial<T>): Promise<T> {
        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const instance = new this();
        Object.assign(instance, data);
        await instance.save();
        return instance;
    }

    static build<T extends BaseEntity>(this: new () => T, data: Partial<T>): T {
        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const instance = new this();
        Object.assign(instance, data);
        (instance as unknown as { _captureOriginalValues(): void })._captureOriginalValues();
        return instance;
    }

    static async get<T extends BaseEntity>(this: new () => T, id: PrimaryKeyValue): Promise<T> {
        const { metadataContainer, logger } = resolveDependencies();
        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const { tableName, primaryColumns } = getEntityMetadata(this, metadataContainer, true);

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        let conditions: Record<string, SQLQueryBindings>;

        // Handle single primary key
        if (primaryColumns.length === 1) {
            const primaryColumn = primaryColumns[0];

            // Support both single value and object notation for single keys
            if (typeof id === 'object' && id !== null && !Buffer.isBuffer(id) && !(id instanceof Uint8Array)) {
                const compositeId = id as CompositeKeyValue;
                // Validate that the object has the expected primary key
                if (!(primaryColumn.propertyName in compositeId)) {
                    throw new Error(
                        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                        `Invalid composite key object for entity ${this.name}. Expected property: ${primaryColumn.propertyName}`
                    );
                }
                conditions = { [primaryColumn.propertyName]: compositeId[primaryColumn.propertyName] };
            } else {
                // Traditional single value
                conditions = { [primaryColumn.propertyName]: id as SQLQueryBindings };
            }
        }
        // Handle composite primary keys
        else if (primaryColumns.length > 1) {
            if (typeof id !== 'object' || id === null || Buffer.isBuffer(id) || id instanceof Uint8Array) {
                throw new Error(
                    // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                    `Entity ${this.name} has ${primaryColumns.length} primary keys. Expected object with keys: ${primaryColumns.map((col) => col.propertyName).join(', ')}`
                );
            }

            const compositeId = id as CompositeKeyValue;
            conditions = {};

            // Validate all primary key properties are provided
            for (const primaryColumn of primaryColumns) {
                if (!(primaryColumn.propertyName in compositeId)) {
                    throw new Error(
                        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                        `Missing primary key property '${primaryColumn.propertyName}' for entity ${this.name}`
                    );
                }
                conditions[primaryColumn.propertyName] = compositeId[primaryColumn.propertyName];
            }
        } else {
            throw new Error(
                // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                `Entity ${this.name} has no primary keys defined`
            );
        }

        const { sql, params } = queryBuilder.select(tableName, conditions, 1);
        logger.debug(`Executing query: ${sql}`, { params });

        return executeWithErrorHandling(
            () => {
                const row = BaseEntity._executeQuery<Record<string, unknown> | undefined>(sql, params, 'get');
                if (!row) {
                    // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                    throw new EntityNotFoundError(this.name, conditions);
                }

                // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                const instance = new this();
                instance._loadFromRow(row);
                return instance;
            },
            'get',
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            this.name,
            logger
        );
    }

    static async find<T extends BaseEntity>(
        this: new () => T,
        conditions: Record<string, SQLQueryBindings>
    ): Promise<T[]> {
        const { metadataContainer, logger } = resolveDependencies();
        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const { tableName } = getEntityMetadata(this, metadataContainer);

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.select(tableName, conditions);

        logger.debug(`Executing query: ${sql}`, { params });

        return executeWithErrorHandling(
            () => {
                const rows = BaseEntity._executeQuery<Record<string, unknown>[]>(sql, params, 'all');
                return rows.map((row) => {
                    // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                    const instance = new this();
                    instance._loadFromRow(row);
                    return instance;
                });
            },
            'find',
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            this.name,
            logger
        );
    }

    static async findFirst<T extends BaseEntity>(
        this: new () => T,
        conditions: Record<string, SQLQueryBindings>
    ): Promise<T | null> {
        const { metadataContainer, logger } = resolveDependencies();
        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const { tableName } = getEntityMetadata(this, metadataContainer);

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.select(tableName, conditions, 1);

        logger.debug(`Executing query: ${sql}`, { params });

        return executeWithErrorHandling(
            () => {
                const row = BaseEntity._executeQuery<Record<string, unknown> | undefined>(sql, params, 'get');
                if (!row) {
                    return null;
                }

                // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                const instance = new this();
                instance._loadFromRow(row);
                return instance;
            },
            'findFirst',
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            this.name,
            logger
        );
    }

    static async count(conditions?: Record<string, SQLQueryBindings>): Promise<number> {
        const { metadataContainer, logger } = resolveDependencies();
        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const { tableName } = getEntityMetadata(this as unknown as EntityConstructor, metadataContainer);

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.count(tableName, conditions);

        logger.debug(`Executing query: ${sql}`, { params });

        return executeWithErrorHandling(
            () => {
                const result = BaseEntity._executeQuery<{ count: number }>(sql, params, 'get');
                return result.count;
            },
            'count',
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            this.name,
            logger
        );
    }

    static async exists(conditions: Record<string, SQLQueryBindings>): Promise<boolean> {
        const count = await // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        (this as unknown as { count: (conditions?: Record<string, SQLQueryBindings>) => Promise<number> }).count(
            conditions
        );
        return count > 0;
    }

    static async deleteAll(conditions: Record<string, SQLQueryBindings>): Promise<number> {
        validateDataSourceInitialization();
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const tableName = metadataContainer.getTableName(this as unknown as EntityConstructor);
        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.delete(tableName, conditions, true);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            const result = BaseEntity._executeQuery<{ changes: number }>(sql, params, 'run');
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            logger.info(`Deleted ${result.changes} ${this.name} records`);
            return result.changes;
        } catch (error) {
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            logger.error(`Database error in ${this.name}.deleteAll()`, error);
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            throw new DatabaseError(`Failed to delete ${this.name} records`, error as Error, this.name, 'delete');
        }
    }

    static async updateAll(
        data: Record<string, SQLQueryBindings>,
        conditions: Record<string, SQLQueryBindings>
    ): Promise<number> {
        validateDataSourceInitialization();
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const tableName = metadataContainer.getTableName(this as unknown as EntityConstructor);
        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.update(tableName, data, conditions, true);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            const result = BaseEntity._executeQuery<{ changes: number }>(sql, params, 'run');
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            logger.info(`Updated ${result.changes} ${this.name} records`);
            return result.changes;
        } catch (error) {
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            logger.error(`Database error in ${this.name}.updateAll()`, error);
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            throw new DatabaseError(`Failed to update ${this.name} records`, error as Error, this.name, 'update');
        }
    }

    // Instance methods
    async save(): Promise<void> {
        await this._validate();

        if (this._isNew) {
            await this._insert();
        } else {
            await this._update();
        }
    }

    async update(data: Record<string, SQLQueryBindings>): Promise<void> {
        Object.assign(this, data);
        await this.save();
    }

    async remove(): Promise<void> {
        if (this._isNew) {
            throw new Error('Cannot remove unsaved entity');
        }

        const { metadataContainer, logger } = resolveDependencies();
        const { tableName, primaryColumns } = getEntityMetadata(
            this.constructor as unknown as EntityConstructor,
            metadataContainer
        );

        const conditions = buildPrimaryKeyConditions(this, primaryColumns);

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.delete(tableName, conditions);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            BaseEntity._executeQuery<{ changes: number }>(sql, params, 'run');
            logger.info(`Removed ${this.constructor.name} entity`);
            this._isNew = true;
        } catch (error) {
            logger.error(`Database error in ${this.constructor.name}.remove()`, error);
            throw new DatabaseError(
                `Failed to remove ${this.constructor.name}`,
                error as Error,
                this.constructor.name,
                'remove'
            );
        }
    }

    async reload(): Promise<void> {
        if (this._isNew) {
            throw new Error('Cannot reload unsaved entity');
        }

        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const primaryColumns = metadataContainer.getPrimaryColumns(this.constructor as unknown as EntityConstructor);

        if (primaryColumns.length === 0) {
            throw new Error(`No primary key defined for entity ${this.constructor.name}`);
        }

        // Build primary key conditions from current entity values
        const primaryKeyConditions = buildPrimaryKeyConditions(this, primaryColumns);

        // Validate that all primary key values are present
        if (Object.keys(primaryKeyConditions).length !== primaryColumns.length) {
            throw new Error(`Cannot reload entity ${this.constructor.name}: missing primary key values`);
        }

        // Use appropriate format for get() method
        let keyValue: PrimaryKeyValue;
        if (primaryColumns.length === 1) {
            // Single primary key - use the value directly
            const primaryColumn = primaryColumns[0];
            keyValue = primaryKeyConditions[primaryColumn.propertyName];
        } else {
            // Composite primary key - use object notation
            keyValue = primaryKeyConditions as CompositeKeyValue;
        }

        const fresh = await (this.constructor as unknown as { get: (id: PrimaryKeyValue) => Promise<BaseEntity> }).get(
            keyValue
        );
        Object.assign(this, fresh);
    }

    isNew(): boolean {
        return this._isNew;
    }

    isChanged(): boolean {
        validateDataSourceInitialization();
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const columns = metadataContainer.getColumns(this.constructor as unknown as EntityConstructor);

        for (const [propertyName] of columns) {
            if (this._originalValues[propertyName] !== (this as Record<string, unknown>)[propertyName]) {
                return true;
            }
        }

        return false;
    }

    getChanges(): Record<string, { from: unknown; to: unknown }> {
        const changes: Record<string, { from: unknown; to: unknown }> = {};
        validateDataSourceInitialization();
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const columns = metadataContainer.getColumns(this.constructor as unknown as EntityConstructor);

        for (const [propertyName] of columns) {
            const originalValue = this._originalValues[propertyName];
            const currentValue = (this as Record<string, unknown>)[propertyName];

            if (originalValue !== currentValue) {
                changes[propertyName] = { from: originalValue, to: currentValue };
            }
        }

        return changes;
    }

    toJSON(): Record<string, unknown> {
        try {
            // Try to use entity metadata if DataSource is initialized
            const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
            const columns = metadataContainer.getColumns(this.constructor as unknown as EntityConstructor);

            const result: Record<string, unknown> = {};
            for (const [propertyName] of columns) {
                const value = (this as Record<string, unknown>)[propertyName];
                if (value !== undefined) {
                    result[propertyName] = value;
                }
            }

            return result;
        } catch (error) {
            // Only use fallback for specific initialization errors
            if (error instanceof Error && error.message.includes('not initialized')) {
                // Fallback: if DataSource is not initialized, return all non-internal properties
                // This ensures toJSON() works even before database initialization
                const result: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(this as Record<string, unknown>)) {
                    // Exclude internal ORM properties
                    if (!key.startsWith('_') && value !== undefined) {
                        result[key] = value;
                    }
                }

                return result;
            }

            // Re-throw unexpected errors
            throw error;
        }
    }

    // Private methods
    private async _validate(): Promise<void> {
        validateDataSourceInitialization();
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        const errors = await validate(this, {
            skipMissingProperties: true,
            forbidNonWhitelisted: false,
        });

        // Filter out the "unknown value" error which occurs for entities without validation decorators
        const realErrors = errors.filter((error) => {
            const constraints = error.constraints || {};
            return (
                !constraints.unknownValue ||
                constraints.unknownValue !== 'an unknown value was passed to the validate function'
            );
        });

        if (realErrors.length > 0) {
            const validationErrors: ValidationErrorDetail[] = realErrors.flatMap((error) =>
                Object.values(error.constraints || {}).map((message) => ({
                    property: error.property,
                    message,
                    value: error.value,
                }))
            );

            logger.warn('Validation failed', { errors: validationErrors });
            throw new ValidationError(this.constructor.name, validationErrors);
        }
    }

    private async _insert(): Promise<void> {
        validateDataSourceInitialization();
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        const tableName = metadataContainer.getTableName(this.constructor as unknown as EntityConstructor);
        const columns = metadataContainer.getColumns(this.constructor as unknown as EntityConstructor);

        // Apply application defaults and generate values
        for (const [propertyName, metadata] of columns) {
            if (metadata.isGenerated && metadata.generationStrategy === 'uuid') {
                if (!(this as Record<string, unknown>)[propertyName]) {
                    (this as Record<string, unknown>)[propertyName] = crypto.randomUUID();
                }
            } else if (metadata.default !== undefined && typeof metadata.default === 'function') {
                // Only apply JS function defaults if no SQL default is defined
                // SQL defaults are handled by the database automatically
                if (
                    metadata.sqlDefault === undefined &&
                    (this as Record<string, unknown>)[propertyName] === undefined
                ) {
                    (this as Record<string, unknown>)[propertyName] = metadata.default();
                }
            }
        }

        const data = buildDataObject(this, columns);
        // Remove auto-increment columns
        for (const [propertyName, metadata] of columns) {
            if (metadata.isGenerated && metadata.generationStrategy === 'increment') {
                delete data[propertyName];
            }
        }

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.insert(tableName, data);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            const result = BaseEntity._executeQuery<{ lastInsertRowid: number | bigint; changes: number }>(
                sql,
                params,
                'run'
            );

            // Set auto-generated ID if applicable
            const primaryColumns = metadataContainer.getPrimaryColumns(
                this.constructor as unknown as EntityConstructor
            );
            const autoIncrementColumn = primaryColumns.find((col) => col.generationStrategy === 'increment');
            if (autoIncrementColumn) {
                (this as Record<string, unknown>)[autoIncrementColumn.propertyName] = result.lastInsertRowid;
            }

            // Reload entity to get SQL defaults that were applied by the database
            const columnsWithSqlDefaults = Array.from(columns.values()).filter((col) => col.sqlDefault !== undefined);
            if (columnsWithSqlDefaults.length > 0) {
                // Build conditions for the reload using primary key(s)
                const conditions = buildPrimaryKeyConditions(this, primaryColumns);

                if (Object.keys(conditions).length > 0) {
                    const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
                    const { sql, params } = queryBuilder.select(tableName, conditions, 1);

                    logger.debug(`Reloading entity to get SQL defaults: ${sql}`, { params });

                    const row = BaseEntity._executeQuery<Record<string, unknown> | undefined>(sql, params, 'get');
                    if (row) {
                        this._loadFromRow(row);
                    }
                }
            }

            this._isNew = false;
            this._captureOriginalValues();
            logger.info(`Created new ${this.constructor.name} entity`);
        } catch (error) {
            logger.error(`Database error in ${this.constructor.name}._insert()`, error);
            throw new DatabaseError(
                `Failed to create ${this.constructor.name}`,
                error as Error,
                this.constructor.name,
                'create'
            );
        }
    }

    private async _update(): Promise<void> {
        validateDataSourceInitialization();
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        const tableName = metadataContainer.getTableName(this.constructor as unknown as EntityConstructor);
        const columns = metadataContainer.getColumns(this.constructor as unknown as EntityConstructor);
        const primaryColumns = metadataContainer.getPrimaryColumns(this.constructor as unknown as EntityConstructor);

        // Build data object excluding primary keys
        const data = buildDataObject(this, columns, true);

        // If no data to update, skip the database call
        if (Object.keys(data).length === 0) {
            logger.debug(`No data to update for ${this.constructor.name} entity`);
            return;
        }

        // Build conditions from primary keys
        const conditions = buildPrimaryKeyConditions(this, primaryColumns);

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.update(tableName, data, conditions);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            BaseEntity._executeQuery<{ changes: number }>(sql, params, 'run');
            this._captureOriginalValues();
            logger.info(`Updated ${this.constructor.name} entity`);
        } catch (error) {
            logger.error(`Database error in ${this.constructor.name}._update()`, error);
            throw new DatabaseError(
                `Failed to update ${this.constructor.name}`,
                error as Error,
                this.constructor.name,
                'update'
            );
        }
    }

    private _loadFromRow(row: Record<string, unknown>): void {
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const columns = metadataContainer.getColumns(this.constructor as unknown as EntityConstructor);

        for (const [propertyName, metadata] of columns) {
            const value = row[propertyName];

            if (value !== undefined) {
                if (value === null) {
                    // Only explicitly set null values for fields that have sqlDefault: null
                    // This preserves the distinction between explicit null and missing optional fields
                    if (metadata.sqlDefault === null) {
                        (this as Record<string, unknown>)[propertyName] = null;
                    }
                    // For other nullable fields, leave them as undefined if they weren't set
                } else {
                    const tsType = Reflect.getMetadata('design:type', this, propertyName);

                    // Convert INTEGER (1/0) back to boolean for boolean properties
                    if (metadata.type === 'integer' && tsType === Boolean) {
                        (this as Record<string, unknown>)[propertyName] = value === 1;
                    }
                    // Convert stored date values back to Date objects using DateUtils
                    else if (tsType === Date && (typeof value === 'string' || typeof value === 'number')) {
                        (this as Record<string, unknown>)[propertyName] = storageToDate(value);
                    }
                    // Default: use value as-is
                    else {
                        (this as Record<string, unknown>)[propertyName] = value;
                    }
                }
            }
        }

        this._isNew = false;
        this._captureOriginalValues();
    }

    private _captureOriginalValues(): void {
        try {
            // Try to capture original values using metadata if available
            const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
            const columns = metadataContainer.getColumns(this.constructor as unknown as EntityConstructor);

            this._originalValues = {};
            for (const [propertyName] of columns) {
                this._originalValues[propertyName] = (this as Record<string, unknown>)[propertyName];
            }
        } catch (error) {
            // If DataSource is not initialized, fall back to capturing all enumerable properties
            // This allows build() to work without database initialization
            this._originalValues = {};
            for (const propertyName of Object.keys(this as Record<string, unknown>)) {
                // Skip internal properties
                if (!propertyName.startsWith('_')) {
                    this._originalValues[propertyName] = (this as Record<string, unknown>)[propertyName];
                }
            }
        }
    }
}
