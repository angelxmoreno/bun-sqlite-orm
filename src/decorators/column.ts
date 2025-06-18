import 'reflect-metadata';
import { getGlobalMetadataContainer } from '../container';
import type { ColumnMetadata, ColumnOptions, IndexMetadata } from '../types';

export function Column(options: ColumnOptions = {}) {
    return (target: object, propertyKey: string) => {
        const metadataContainer = getGlobalMetadataContainer();

        // Get TypeScript type information
        const type = Reflect.getMetadata('design:type', target, propertyKey);

        // Infer SQLite type from TypeScript type
        let sqliteType: 'text' | 'integer' | 'real' | 'blob' = 'text';
        if (type === Number) {
            sqliteType = options.type === 'real' ? 'real' : 'integer';
        } else if (type === String || type === Date) {
            sqliteType = 'text';
        } else if (type === Boolean) {
            sqliteType = 'integer'; // SQLite stores booleans as integers
        }

        // Check if property type includes null/undefined for nullable inference
        const isNullable = options.nullable ?? false; // TODO: improve nullable detection

        const columnMetadata: ColumnMetadata = {
            propertyName: propertyKey,
            type: options.type || sqliteType,
            nullable: isNullable,
            unique: options.unique || false,
            default: options.default,
            sqlDefault: options.sqlDefault,
            isPrimary: false,
            isGenerated: false,
        };

        const entityConstructor = target.constructor as new () => unknown;

        // Auto-register entity if not already registered
        // Only auto-register if the entity isn't already registered to avoid overriding explicit @Entity table names
        if (!metadataContainer.hasEntity(entityConstructor)) {
            const tableName = entityConstructor.name.toLowerCase();
            metadataContainer.addEntity(entityConstructor, tableName);
        }

        metadataContainer.addColumn(entityConstructor, propertyKey, columnMetadata);

        // Handle index option if specified
        if (options.index !== undefined) {
            const tableName = metadataContainer.getTableName(entityConstructor);

            // Generate index name
            let indexName: string;
            if (typeof options.index === 'string') {
                indexName = options.index;
            } else {
                // Auto-generate index name: idx_tablename_columnname
                indexName = `idx_${tableName}_${propertyKey}`;
            }

            const indexMetadata: IndexMetadata = {
                name: indexName,
                columns: [propertyKey],
                unique: false, // Column-level indexes are not unique by default
            };

            metadataContainer.addIndex(entityConstructor, indexMetadata);
        }
    };
}
