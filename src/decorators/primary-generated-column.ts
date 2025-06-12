import 'reflect-metadata';
import { getGlobalMetadataContainer } from '../container';
import type { ColumnMetadata, PrimaryGeneratedColumnType } from '../types';

export function PrimaryGeneratedColumn(strategy: PrimaryGeneratedColumnType = 'int') {
    return (target: object, propertyKey: string) => {
        const metadataContainer = getGlobalMetadataContainer();

        const columnMetadata: ColumnMetadata = {
            propertyName: propertyKey,
            type: strategy === 'int' ? 'integer' : 'text',
            nullable: false,
            unique: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: strategy === 'int' ? 'increment' : 'uuid',
        };

        metadataContainer.addColumn(target.constructor as new () => unknown, propertyKey, columnMetadata);
    };
}
