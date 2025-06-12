import 'reflect-metadata';
import { getGlobalMetadataContainer } from '../container';

// Type for class constructors that can be used with @Entity
type ClassConstructor = new (...args: unknown[]) => unknown;

export function Entity(tableName?: string) {
    return (target: ClassConstructor) => {
        const metadataContainer = getGlobalMetadataContainer();
        const finalTableName = tableName || target.name.toLowerCase();
        metadataContainer.addEntity(target, finalTableName, true);
    };
}
