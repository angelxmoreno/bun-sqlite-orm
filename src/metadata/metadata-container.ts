import 'reflect-metadata';
import { injectable } from 'tsyringe';
import type { ColumnMetadata, EntityConstructor, EntityMetadata, IndexMetadata } from '../types';

@injectable()
export class MetadataContainer {
    private entities = new Map<EntityConstructor, EntityMetadata>();
    // Track all index names globally to enforce SQLite's database-wide uniqueness
    private globalIndexNames = new Set<string>();

    addEntity(target: EntityConstructor, tableName: string, isExplicit = false): void {
        if (!this.entities.has(target)) {
            this.entities.set(target, {
                target,
                tableName,
                columns: new Map(),
                primaryColumns: [],
                indexes: [],
                isExplicitlyRegistered: isExplicit,
            });
        } else if (isExplicit) {
            // Allow @Entity decorator to override auto-registered table name
            // biome-ignore lint/style/noNonNullAssertion: We just checked that the entity exists
            const existingMetadata = this.entities.get(target)!;
            const oldTableName = existingMetadata.tableName;
            existingMetadata.tableName = tableName;
            existingMetadata.isExplicitlyRegistered = true; // Mark as explicitly registered

            // Update auto-generated index names that used the old table name
            for (const index of existingMetadata.indexes) {
                if (index.name.startsWith(`idx_${oldTableName}_`)) {
                    // Remove old name from global set
                    this.globalIndexNames.delete(index.name);

                    // This is an auto-generated index name, update it with the new table name
                    const columnPart = index.name.replace(`idx_${oldTableName}_`, '');
                    const newIndexName = `idx_${tableName}_${columnPart}`;

                    // Check if new name conflicts globally
                    if (this.globalIndexNames.has(newIndexName)) {
                        throw new Error(
                            `Cannot rename index: name '${newIndexName}' is already used by another entity`
                        );
                    }

                    // Update index name and add to global set
                    index.name = newIndexName;
                    this.globalIndexNames.add(newIndexName);
                }
            }
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

    /**
     * Get only entities that were explicitly registered with @Entity decorator.
     * This excludes auto-registered entities from column decorators that lack @Entity.
     */
    getExplicitEntities(): EntityMetadata[] {
        return Array.from(this.entities.values()).filter((entity) => entity.isExplicitlyRegistered);
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

        // Collect inherited columns from prototype chain
        const allColumns = new Map<string, ColumnMetadata>(metadata.columns);
        this.collectInheritedColumns(target, allColumns);

        return allColumns;
    }

    private collectInheritedColumns(target: EntityConstructor, allColumns: Map<string, ColumnMetadata>): void {
        // Walk up the prototype chain to collect inherited metadata
        let currentTarget = Object.getPrototypeOf(target);

        while (currentTarget && currentTarget !== Function.prototype && currentTarget.name) {
            const parentMetadata = this.getEntityMetadata(currentTarget);
            if (parentMetadata) {
                // Add inherited columns (current class columns take precedence)
                for (const [propertyName, columnMetadata] of parentMetadata.columns) {
                    if (!allColumns.has(propertyName)) {
                        allColumns.set(propertyName, columnMetadata);
                    }
                }
            }
            currentTarget = Object.getPrototypeOf(currentTarget);
        }
    }

    getPrimaryColumns(target: EntityConstructor): ColumnMetadata[] {
        const metadata = this.getEntityMetadata(target);
        if (!metadata) {
            throw new Error(`Entity metadata not found for ${target.name}. Make sure to use @Entity decorator.`);
        }

        // Collect inherited primary columns from prototype chain
        const allPrimaryColumns: ColumnMetadata[] = [...metadata.primaryColumns];
        this.collectInheritedPrimaryColumns(target, allPrimaryColumns);

        return allPrimaryColumns;
    }

    private collectInheritedPrimaryColumns(target: EntityConstructor, allPrimaryColumns: ColumnMetadata[]): void {
        // Walk up the prototype chain to collect inherited primary columns
        let currentTarget = Object.getPrototypeOf(target);
        const existingPropertyNames = new Set(allPrimaryColumns.map((col) => col.propertyName));

        while (currentTarget && currentTarget !== Function.prototype && currentTarget.name) {
            const parentMetadata = this.getEntityMetadata(currentTarget);
            if (parentMetadata) {
                // Add inherited primary columns (current class columns take precedence)
                for (const columnMetadata of parentMetadata.primaryColumns) {
                    if (!existingPropertyNames.has(columnMetadata.propertyName)) {
                        allPrimaryColumns.push(columnMetadata);
                        existingPropertyNames.add(columnMetadata.propertyName);
                    }
                }
            }
            currentTarget = Object.getPrototypeOf(currentTarget);
        }
    }

    addIndex(target: EntityConstructor, indexMetadata: IndexMetadata): void {
        const entityMetadata = this.entities.get(target);
        if (!entityMetadata) {
            throw new Error(`Entity metadata not found for ${target.name}. Make sure to use @Entity decorator.`);
        }

        // Enforce global uniqueness of index names (SQLite requirement)
        if (this.globalIndexNames.has(indexMetadata.name)) {
            throw new Error(`Index name '${indexMetadata.name}' is already used by another entity`);
        }

        // Check for duplicate index names within the entity (redundant but explicit)
        const existingIndex = entityMetadata.indexes.find((idx) => idx.name === indexMetadata.name);
        if (existingIndex) {
            throw new Error(`Index with name '${indexMetadata.name}' already exists for entity ${target.name}`);
        }

        // Add to global set and entity metadata
        this.globalIndexNames.add(indexMetadata.name);
        entityMetadata.indexes.push(indexMetadata);
    }

    getIndexes(target: EntityConstructor): IndexMetadata[] {
        const metadata = this.getEntityMetadata(target);
        if (!metadata) {
            throw new Error(`Entity metadata not found for ${target.name}. Make sure to use @Entity decorator.`);
        }
        return metadata.indexes;
    }

    /**
     * Clears all metadata from the container.
     * Useful for resetting state between tests.
     *
     * ⚠️  WARNING: This will remove all entity metadata including those registered
     * by class decorators. Only use this if you can re-register entities after clearing,
     * or in tests that define entities within the test functions themselves.
     */
    clear(): void {
        this.entities.clear();
        this.globalIndexNames.clear();
    }
}
