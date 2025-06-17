import type { Database, Statement } from 'bun:sqlite';
import { validate } from 'class-validator';
import { typeBunContainer } from '../container';
import { DatabaseError, EntityNotFoundError, ValidationError } from '../errors';
import type { ValidationErrorDetail } from '../errors';
import type { MetadataContainer } from '../metadata';
import type { QueryBuilder } from '../sql';
import type { DbLogger, EntityConstructor, SQLQueryBindings } from '../types';
import {
    buildDataObject,
    buildPrimaryKeyConditions,
    executeWithErrorHandling,
    getEntityMetadata,
    resolveDependencies,
    toSQLQueryBinding,
} from './entity-utils';

export abstract class BaseEntity {
    private _isNew = true;
    private _originalValues: Record<string, unknown> = {};

    // Private helper for executing queries with proper statement management
    private static _executeQuery<T>(sql: string, params: SQLQueryBindings[], method: 'get' | 'all' | 'run'): T {
        const db = typeBunContainer.resolve<Database>('DatabaseConnection');
        const stmt: Statement = db.prepare(sql);

        try {
            return stmt[method](...params) as T;
        } finally {
            // Always finalize the statement to prevent memory leaks
            stmt.finalize();
        }
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

    static async get<T extends BaseEntity>(this: new () => T, id: SQLQueryBindings): Promise<T> {
        const { metadataContainer, logger } = resolveDependencies();
        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const { tableName, primaryColumns } = getEntityMetadata(this, metadataContainer, true);

        // Ensure single primary key - composite keys not yet supported in get() method
        if (primaryColumns.length !== 1) {
            throw new Error(
                // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                `Entity ${this.name} has ${primaryColumns.length} primary keys. The get() method currently only supports entities with exactly one primary key. Use find() with conditions for composite key entities.`
            );
        }

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const primaryColumn = primaryColumns[0];
        const { sql, params } = queryBuilder.select(tableName, { [primaryColumn.propertyName]: id }, 1);

        logger.debug(`Executing query: ${sql}`, { params });

        return executeWithErrorHandling(
            () => {
                const row = BaseEntity._executeQuery<Record<string, unknown> | undefined>(sql, params, 'get');
                if (!row) {
                    // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                    throw new EntityNotFoundError(this.name, { [primaryColumn.propertyName]: id });
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
            throw new DatabaseError(`Failed to delete ${this.name} records`, error as Error);
        }
    }

    static async updateAll(
        data: Record<string, SQLQueryBindings>,
        conditions: Record<string, SQLQueryBindings>
    ): Promise<number> {
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
            throw new DatabaseError(`Failed to update ${this.name} records`, error as Error);
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
            throw new DatabaseError(`Failed to remove ${this.constructor.name}`, error as Error);
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

        // Ensure single primary key - composite keys not yet supported in reload() method
        if (primaryColumns.length !== 1) {
            throw new Error(
                `Entity ${this.constructor.name} has ${primaryColumns.length} primary keys. The reload() method currently only supports entities with exactly one primary key.`
            );
        }

        const primaryColumn = primaryColumns[0];
        const id = (this as Record<string, unknown>)[primaryColumn.propertyName];

        const fresh = await (this.constructor as unknown as { get: (id: unknown) => Promise<BaseEntity> }).get(id);
        Object.assign(this, fresh);
    }

    isNew(): boolean {
        return this._isNew;
    }

    isChanged(): boolean {
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

    // Private methods
    private async _validate(): Promise<void> {
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
            throw new ValidationError(validationErrors);
        }
    }

    private async _insert(): Promise<void> {
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
                if ((this as Record<string, unknown>)[propertyName] === undefined) {
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

            this._isNew = false;
            this._captureOriginalValues();
            logger.info(`Created new ${this.constructor.name} entity`);
        } catch (error) {
            logger.error(`Database error in ${this.constructor.name}._insert()`, error);
            throw new DatabaseError(`Failed to create ${this.constructor.name}`, error as Error);
        }
    }

    private async _update(): Promise<void> {
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
            throw new DatabaseError(`Failed to update ${this.constructor.name}`, error as Error);
        }
    }

    private _loadFromRow(row: Record<string, unknown>): void {
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const columns = metadataContainer.getColumns(this.constructor as unknown as EntityConstructor);

        for (const [propertyName, metadata] of columns) {
            const value = row[propertyName];

            if (value !== undefined && value !== null) {
                const tsType = Reflect.getMetadata('design:type', this, propertyName);

                // Convert INTEGER (1/0) back to boolean for boolean properties
                if (metadata.type === 'integer' && tsType === Boolean) {
                    (this as Record<string, unknown>)[propertyName] = value === 1;
                }
                // Convert ISO string back to Date
                else if (metadata.type === 'text' && typeof value === 'string' && tsType === Date) {
                    (this as Record<string, unknown>)[propertyName] = new Date(value);
                }
                // Default: use value as-is
                else {
                    (this as Record<string, unknown>)[propertyName] = value;
                }
            }
        }

        this._isNew = false;
        this._captureOriginalValues();
    }

    private _captureOriginalValues(): void {
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const columns = metadataContainer.getColumns(this.constructor as unknown as EntityConstructor);

        this._originalValues = {};
        for (const [propertyName] of columns) {
            this._originalValues[propertyName] = (this as Record<string, unknown>)[propertyName];
        }
    }
}
