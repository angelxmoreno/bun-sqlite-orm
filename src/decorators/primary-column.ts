import 'reflect-metadata';
import { getGlobalMetadataContainer } from '../container';
import type { ColumnMetadata } from '../types';

export function PrimaryColumn() {
    return (target: object, propertyKey: string) => {
        const metadataContainer = getGlobalMetadataContainer();

        const type = Reflect.getMetadata('design:type', target, propertyKey);
        let sqliteType: 'text' | 'integer' | 'real' | 'blob' = 'text';
        if (type === Number) {
            sqliteType = 'integer';
        } else if (type === String) {
            sqliteType = 'text';
        }

        const columnMetadata: ColumnMetadata = {
            propertyName: propertyKey,
            type: sqliteType,
            nullable: false,
            unique: true,
            isPrimary: true,
            isGenerated: false,
        };

        const entityConstructor = target.constructor as new () => unknown;

        // Auto-register entity if not already registered
        if (!metadataContainer.hasEntity(entityConstructor)) {
            const tableName = entityConstructor.name.toLowerCase();
            metadataContainer.addEntity(entityConstructor, tableName);
        }

        metadataContainer.addColumn(entityConstructor, propertyKey, columnMetadata);
    };
}
