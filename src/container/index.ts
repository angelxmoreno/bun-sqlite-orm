import { container } from 'tsyringe';
import type { DependencyContainer } from 'tsyringe';
import { MetadataContainer } from '../metadata';
import { SqlGenerator } from '../sql';

// Create the global TypeBunOrm child container
export const typeBunContainer = container.createChildContainer();

// Register services as singletons
typeBunContainer.registerSingleton('MetadataContainer', MetadataContainer);
typeBunContainer.registerSingleton('SqlGenerator', SqlGenerator);

// Utility to get the global metadata container
export function getGlobalMetadataContainer(): MetadataContainer {
    return typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
}

export type { DependencyContainer };
