import 'reflect-metadata';
import { injectable } from 'tsyringe';
import type { ColumnMetadata, EntityConstructor, EntityMetadata } from '../types';

@injectable()
export class MetadataContainer {
    private entities = new Map<EntityConstructor, EntityMetadata>();

    addEntity(target: EntityConstructor, tableName: string): void {
        if (!this.entities.has(target)) {
            this.entities.set(target, {
                target,
                tableName,
                columns: new Map(),
                primaryColumns: [],
            });
        }
    }

    addColumn(target: EntityConstructor, propertyName: string, metadata: ColumnMetadata): void {
        const entityMetadata = this.entities.get(target);
        if (!entityMetadata) {
            throw new Error(`Entity metadata not found for ${target.name}. Make sure to use @Entity decorator.`);
        }

        entityMetadata.columns.set(propertyName, metadata);

        if (metadata.isPrimary) {
            entityMetadata.primaryColumns.push(metadata);
        }
    }

    getEntityMetadata(target: EntityConstructor): EntityMetadata | undefined {
        return this.entities.get(target);
    }

    getAllEntities(): EntityMetadata[] {
        return Array.from(this.entities.values());
    }

    hasEntity(target: EntityConstructor): boolean {
        return this.entities.has(target);
    }

    getTableName(target: EntityConstructor): string {
        const metadata = this.getEntityMetadata(target);
        if (!metadata) {
            throw new Error(`Entity metadata not found for ${target.name}. Make sure to use @Entity decorator.`);
        }
        return metadata.tableName;
    }

    getColumns(target: EntityConstructor): Map<string, ColumnMetadata> {
        const metadata = this.getEntityMetadata(target);
        if (!metadata) {
            throw new Error(`Entity metadata not found for ${target.name}. Make sure to use @Entity decorator.`);
        }
        return metadata.columns;
    }

    getPrimaryColumns(target: EntityConstructor): ColumnMetadata[] {
        const metadata = this.getEntityMetadata(target);
        if (!metadata) {
            throw new Error(`Entity metadata not found for ${target.name}. Make sure to use @Entity decorator.`);
        }
        return metadata.primaryColumns;
    }
}
