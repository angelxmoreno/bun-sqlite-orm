import { Database } from 'bun:sqlite';
import { container } from 'tsyringe';
import { getGlobalMetadataContainer, typeBunContainer } from './container';
import { NullLogger } from './logger';
import { MetadataContainer } from './metadata';
import { QueryBuilder, SqlGenerator } from './sql';
import { StatementCache } from './statement-cache';
import type { DataSourceOptions, DbLogger } from './types';

export class DataSource {
    private database: Database;
    private typeBunContainer = container.createChildContainer();
    private isInitialized = false;

    constructor(private options: DataSourceOptions) {
        this.database = new Database(options.database);
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            throw new Error('DataSource is already initialized');
        }

        // Register database connection in both containers
        this.typeBunContainer.register('DatabaseConnection', {
            useValue: this.database,
        });
        typeBunContainer.register('DatabaseConnection', {
            useValue: this.database,
        });

        // Register logger or use NullLogger as default in both containers
        const logger = this.options.logger || new NullLogger();
        this.typeBunContainer.register('DbLogger', {
            useValue: logger,
        });
        typeBunContainer.register('DbLogger', {
            useValue: logger,
        });

        // Register MetadataContainer (only in local container)
        this.typeBunContainer.registerSingleton('MetadataContainer', MetadataContainer);

        // Register SqlGenerator (only in local container)
        this.typeBunContainer.registerSingleton('SqlGenerator', SqlGenerator);

        // Register QueryBuilder (only in local container - global already has it)
        this.typeBunContainer.registerSingleton('QueryBuilder', QueryBuilder);

        // Process entities and populate metadata
        const metadataContainer = this.typeBunContainer.resolve<MetadataContainer>('MetadataContainer');

        for (const entityClass of this.options.entities) {
            // Force decorator execution by accessing the constructor
            // This ensures all decorators have been processed
            const _ = new (entityClass as new () => unknown)();
        }

        // BaseEntity now uses typeBunContainer directly

        logger.info('TypeBunOrm DataSource initialized', {
            database: this.options.database,
            entities: this.options.entities.map((e) => e.name),
        });

        this.isInitialized = true;
    }

    async destroy(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        const logger = this.typeBunContainer.resolve<DbLogger>('DbLogger');
        logger.info('Destroying TypeBunOrm DataSource');

        // Log statement cache statistics before cleanup
        StatementCache.logStats(logger);

        // Clean up all cached prepared statements before closing database
        StatementCache.cleanup();

        this.database.close();
        this.isInitialized = false;
    }

    getDatabase(): Database {
        if (!this.isInitialized) {
            throw new Error('DataSource must be initialized before accessing database');
        }
        return this.database;
    }

    getMetadataContainer(): MetadataContainer {
        if (!this.isInitialized) {
            throw new Error('DataSource must be initialized before accessing metadata');
        }
        return getGlobalMetadataContainer();
    }

    getSqlGenerator(): SqlGenerator {
        if (!this.isInitialized) {
            throw new Error('DataSource must be initialized before accessing SqlGenerator');
        }
        return this.typeBunContainer.resolve<SqlGenerator>('SqlGenerator');
    }

    async runMigrations(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('DataSource must be initialized before running migrations');
        }

        const logger = this.typeBunContainer.resolve<DbLogger>('DbLogger');
        logger.info('Running migrations...');

        // TODO: Implement migration system
        // For now, just create tables based on entity metadata
        await this.createTables();
    }

    private async createTables(): Promise<void> {
        const metadataContainer = this.getMetadataContainer();
        const sqlGenerator = this.typeBunContainer.resolve<SqlGenerator>('SqlGenerator');
        const entities = metadataContainer.getExplicitEntities(); // Only use entities with @Entity decorator
        const logger = this.typeBunContainer.resolve<DbLogger>('DbLogger');

        for (const entity of entities) {
            const createTableSql = sqlGenerator.generateCreateTable(entity);
            logger.debug(`Creating table: ${entity.tableName}`, { sql: createTableSql });

            try {
                this.database.exec(createTableSql);
                logger.info(`Created table: ${entity.tableName}`);
            } catch (error) {
                logger.error(`Failed to create table: ${entity.tableName}`, error);
                throw error;
            }
        }

        // Create indexes after all tables are created
        for (const entity of entities) {
            const indexStatements = sqlGenerator.generateIndexes(entity);

            for (const indexSql of indexStatements) {
                logger.debug(`Creating index for table: ${entity.tableName}`, { sql: indexSql });

                try {
                    this.database.exec(indexSql);
                    logger.info(`Created index for table: ${entity.tableName}`);
                } catch (error) {
                    logger.error(`Failed to create index for table: ${entity.tableName}`, error);
                    throw error;
                }
            }
        }
    }
}
