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

        const entityConstructor = target.constructor as new () => unknown;

        // Auto-register entity if not already registered
        if (!metadataContainer.hasEntity(entityConstructor)) {
            const tableName = entityConstructor.name.toLowerCase();
            metadataContainer.addEntity(entityConstructor, tableName);
        }

        metadataContainer.addColumn(entityConstructor, propertyKey, columnMetadata);
    };
}
