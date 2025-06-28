import { container } from 'tsyringe';
import type { DependencyContainer } from 'tsyringe';
import { MetadataContainer } from '../metadata';
import { QueryBuilder, SqlGenerator } from '../sql';

// Create the global bun-sqlite-orm child container
export const typeBunContainer = container.createChildContainer();

// Register services as singletons
typeBunContainer.registerSingleton('MetadataContainer', MetadataContainer);
typeBunContainer.registerSingleton('SqlGenerator', SqlGenerator);
typeBunContainer.registerSingleton('QueryBuilder', QueryBuilder);

// Utility to get the global metadata container
export function getGlobalMetadataContainer(): MetadataContainer {
    return typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
}

export type { DependencyContainer };
