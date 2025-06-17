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

export interface ColumnOptions {
    type?: 'text' | 'integer' | 'real' | 'blob';
    nullable?: boolean;
    unique?: boolean;
    default?: unknown;
    sqlDefault?: string;
}

export interface EntityMetadata {
    target: EntityConstructor;
    tableName: string;
    columns: Map<string, ColumnMetadata>;
    primaryColumns: ColumnMetadata[];
}

export interface ColumnMetadata {
    propertyName: string;
    type: 'text' | 'integer' | 'real' | 'blob';
    nullable: boolean;
    unique: boolean;
    default?: unknown;
    sqlDefault?: string;
    isPrimary: boolean;
    isGenerated: boolean;
    generationStrategy?: 'increment' | 'uuid';
}

export type PrimaryGeneratedColumnType = 'int' | 'uuid';

// Better type for entity constructors
export type EntityConstructor = new () => unknown;

// SQLite parameter types (from bun:sqlite)
export type SQLQueryBindings = null | string | number | bigint | boolean | Uint8Array;

// Helper type for static methods on entity classes
export interface BaseEntityStatic {
    find(conditions: Record<string, unknown>): Promise<unknown[]>;
    count(conditions?: Record<string, unknown>): Promise<number>;
}
