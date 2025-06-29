export interface DbLogger {
    debug(message: string, meta?: unknown): void;
    info(message: string, meta?: unknown): void;
    warn(message: string, meta?: unknown): void;
    error(message: string, meta?: unknown): void;
}

export interface DataSourceOptions {
    database: string;
    entities: EntityConstructor[];
    migrations?: string[];
    logger?: DbLogger;
}

/**
 * Transformer for converting between entity property values and database storage values
 */
export interface ColumnTransformer<EntityType = unknown, DatabaseType = unknown> {
    /**
     * Transform entity property value to database storage value
     * Called during entity save operations
     */
    to(value: EntityType): DatabaseType;

    /**
     * Transform database storage value to entity property value
     * Called during entity load operations
     */
    from(value: DatabaseType): EntityType;
}

export interface ColumnOptions {
    type?: 'text' | 'integer' | 'real' | 'blob' | 'json';
    nullable?: boolean;
    unique?: boolean;
    default?: unknown;
    sqlDefault?: string | number | boolean | null;
    /**
     * Index configuration for the column:
     * - `true` → auto-named, non-unique index
     * - `string` → custom name, non-unique index
     * - `{ name?: string; unique?: boolean }` → fully-featured index
     */
    index?: boolean | string | { name?: string; unique?: boolean };
    /**
     * Optional transformer for custom data conversion between entity and database
     * Transforms values during save/load operations
     */
    transformer?: ColumnTransformer;
}

export interface IndexOptions {
    unique?: boolean;
}

export interface IndexMetadata {
    name: string;
    columns: string[]; // Array of column property names
    unique: boolean;
}

export interface EntityMetadata {
    target: EntityConstructor;
    tableName: string;
    columns: Map<string, ColumnMetadata>;
    primaryColumns: ColumnMetadata[];
    indexes: IndexMetadata[];
    isExplicitlyRegistered: boolean; // True if registered via @Entity decorator
}

export interface ColumnMetadata {
    propertyName: string;
    type: 'text' | 'integer' | 'real' | 'blob' | 'json';
    nullable: boolean;
    unique: boolean;
    default?: unknown;
    sqlDefault?: string | number | boolean | null;
    isPrimary: boolean;
    isGenerated: boolean;
    generationStrategy?: 'increment' | 'uuid';
    transformer?: ColumnTransformer;
}

export type PrimaryGeneratedColumnType = 'int' | 'uuid';

// Better type for entity constructors
export type EntityConstructor = new () => unknown;

// SQLite parameter types (from bun:sqlite)
export type SQLQueryBindings = null | string | number | bigint | boolean | Uint8Array;

// Types for composite key operations
export type CompositeKeyValue = Record<string, SQLQueryBindings>;
export type PrimaryKeyValue = SQLQueryBindings | CompositeKeyValue;

// Helper type for static methods on entity classes
export interface BaseEntityStatic {
    find(conditions: Record<string, unknown>): Promise<unknown[]>;
    count(conditions?: Record<string, unknown>): Promise<number>;
}
