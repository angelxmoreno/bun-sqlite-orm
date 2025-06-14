import type { Database } from 'bun:sqlite';
import { validate } from 'class-validator';
import { typeBunContainer } from '../container';
import { DatabaseError, EntityNotFoundError, ValidationError } from '../errors';
import type { ValidationErrorDetail } from '../errors';
import type { MetadataContainer } from '../metadata';
import type { QueryBuilder } from '../sql';
import type { DbLogger, EntityConstructor, SQLQueryBindings } from '../types';

export abstract class BaseEntity {
    private _isNew = true;
    private _originalValues: Record<string, unknown> = {};

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

    static async get<T extends BaseEntity>(this: new () => T, id: unknown): Promise<T> {
        const db = typeBunContainer.resolve<Database>('DatabaseConnection');
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const tableName = metadataContainer.getTableName(this);
        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const primaryColumns = metadataContainer.getPrimaryColumns(this);

        if (primaryColumns.length === 0) {
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            throw new Error(`No primary key defined for entity ${this.name}`);
        }

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const primaryColumn = primaryColumns[0]; // Assume single primary key for now
        const { sql, params } = queryBuilder.select(tableName, { [primaryColumn.propertyName]: id }, 1);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            const row = db.query(sql).get(...(params as SQLQueryBindings[]));
            if (!row) {
                // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                throw new EntityNotFoundError(this.name, { [primaryColumn.propertyName]: id });
            }

            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            const instance = new this();
            instance._loadFromRow(row as Record<string, unknown>);
            return instance;
        } catch (error) {
            if (error instanceof EntityNotFoundError) {
                throw error;
            }
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            logger.error(`Database error in ${this.name}.get()`, error);
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            throw new DatabaseError(`Failed to fetch ${this.name}`, error as Error);
        }
    }

    static async find<T extends BaseEntity>(this: new () => T, conditions: Record<string, unknown>): Promise<T[]> {
        const db = typeBunContainer.resolve<Database>('DatabaseConnection');
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const tableName = metadataContainer.getTableName(this);
        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.select(tableName, conditions);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            const rows = db.query(sql).all(...(params as SQLQueryBindings[]));
            return (rows as Record<string, unknown>[]).map((row) => {
                // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
                const instance = new this();
                instance._loadFromRow(row);
                return instance;
            });
        } catch (error) {
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            logger.error(`Database error in ${this.name}.find()`, error);
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            throw new DatabaseError(`Failed to fetch ${this.name} records`, error as Error);
        }
    }

    static async findFirst<T extends BaseEntity>(
        this: new () => T,
        conditions: Record<string, unknown>
    ): Promise<T | null> {
        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const results = await (this as unknown as { find: (conditions: Record<string, unknown>) => Promise<T[]> }).find(
            conditions
        );
        return results.length > 0 ? results[0] : null;
    }

    static async count(conditions?: Record<string, unknown>): Promise<number> {
        const db = typeBunContainer.resolve<Database>('DatabaseConnection');
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const tableName = metadataContainer.getTableName(this as unknown as EntityConstructor);
        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.count(tableName, conditions);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            const result = db.query(sql).get(...(params as SQLQueryBindings[])) as { count: number };
            return result.count;
        } catch (error) {
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            logger.error(`Database error in ${this.name}.count()`, error);
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            throw new DatabaseError(`Failed to count ${this.name} records`, error as Error);
        }
    }

    static async exists(conditions: Record<string, unknown>): Promise<boolean> {
        const count = await // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        (this as unknown as { count: (conditions?: Record<string, unknown>) => Promise<number> }).count(conditions);
        return count > 0;
    }

    static async deleteAll(conditions: Record<string, unknown>): Promise<number> {
        const db = typeBunContainer.resolve<Database>('DatabaseConnection');
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const tableName = metadataContainer.getTableName(this as unknown as EntityConstructor);
        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.delete(tableName, conditions);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            const result = db.query(sql).run(...(params as SQLQueryBindings[]));
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

    static async updateAll(data: Record<string, unknown>, conditions: Record<string, unknown>): Promise<number> {
        const db = typeBunContainer.resolve<Database>('DatabaseConnection');
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
        const tableName = metadataContainer.getTableName(this as unknown as EntityConstructor);
        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.update(tableName, data, conditions);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            const result = db.query(sql).run(...(params as SQLQueryBindings[]));
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            logger.info(`Updated ${result.changes} ${this.name} records`);
            return result.changes;
        } catch (error) {
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            logger.error(`Database error in ${this.constructor.name}.updateAll()`, error);
            // biome-ignore lint/complexity/noThisInStatic: Required for Active Record polymorphism
            throw new DatabaseError(`Failed to update ${this.constructor.name} records`, error as Error);
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

    async update(data: Record<string, unknown>): Promise<void> {
        Object.assign(this, data);
        await this.save();
    }

    async remove(): Promise<void> {
        if (this._isNew) {
            throw new Error('Cannot remove unsaved entity');
        }

        const db = typeBunContainer.resolve<Database>('DatabaseConnection');
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        const tableName = metadataContainer.getTableName(this.constructor as unknown as EntityConstructor);
        const primaryColumns = metadataContainer.getPrimaryColumns(this.constructor as unknown as EntityConstructor);

        const conditions: Record<string, unknown> = {};
        for (const primaryColumn of primaryColumns) {
            conditions[primaryColumn.propertyName] = (this as Record<string, unknown>)[primaryColumn.propertyName];
        }

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.delete(tableName, conditions);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            db.query(sql).run(...(params as SQLQueryBindings[]));
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
        const db = typeBunContainer.resolve<Database>('DatabaseConnection');
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

        const data: Record<string, unknown> = {};
        for (const [propertyName, metadata] of columns) {
            // Skip auto-increment columns
            if (metadata.isGenerated && metadata.generationStrategy === 'increment') {
                continue;
            }

            const value = (this as Record<string, unknown>)[propertyName];
            if (value !== undefined) {
                // Convert Date to ISO string for storage
                data[propertyName] = value instanceof Date ? value.toISOString() : value;
            }
        }

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.insert(tableName, data);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            const result = db.query(sql).run(...(params as SQLQueryBindings[]));

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
        const db = typeBunContainer.resolve<Database>('DatabaseConnection');
        const metadataContainer = typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
        const logger = typeBunContainer.resolve<DbLogger>('DbLogger');

        const tableName = metadataContainer.getTableName(this.constructor as unknown as EntityConstructor);
        const columns = metadataContainer.getColumns(this.constructor as unknown as EntityConstructor);
        const primaryColumns = metadataContainer.getPrimaryColumns(this.constructor as unknown as EntityConstructor);

        // Build data object excluding primary keys
        const data: Record<string, unknown> = {};
        for (const [propertyName, metadata] of columns) {
            if (!metadata.isPrimary) {
                const value = (this as Record<string, unknown>)[propertyName];
                if (value !== undefined) {
                    data[propertyName] = value instanceof Date ? value.toISOString() : value;
                }
            }
        }

        // Build conditions from primary keys
        const conditions: Record<string, unknown> = {};
        for (const primaryColumn of primaryColumns) {
            conditions[primaryColumn.propertyName] = (this as Record<string, unknown>)[primaryColumn.propertyName];
        }

        const queryBuilder = typeBunContainer.resolve<QueryBuilder>('QueryBuilder');
        const { sql, params } = queryBuilder.update(tableName, data, conditions);

        logger.debug(`Executing query: ${sql}`, { params });

        try {
            db.query(sql).run(...(params as SQLQueryBindings[]));
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
                    (this as Record<string, unknown>)[propertyName] = Boolean(value);
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
