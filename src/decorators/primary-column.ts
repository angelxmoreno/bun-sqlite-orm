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

        metadataContainer.addColumn(target.constructor as new () => unknown, propertyKey, columnMetadata);
    };
}
