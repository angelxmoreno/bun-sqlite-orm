import { Database } from 'bun:sqlite';
import { container } from 'tsyringe';
import { NullLogger } from './logger';
import { MetadataContainer } from './metadata';
import type { SqlGenerator } from './sql';
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

        // Register database connection
        this.typeBunContainer.register('DatabaseConnection', {
            useValue: this.database,
        });

        // Register logger or use NullLogger as default
        const logger = this.options.logger || new NullLogger();
        this.typeBunContainer.register('DbLogger', {
            useValue: logger,
        });

        // Register MetadataContainer
        this.typeBunContainer.registerSingleton('MetadataContainer', MetadataContainer);

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
        return this.typeBunContainer.resolve<MetadataContainer>('MetadataContainer');
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
        const entities = metadataContainer.getAllEntities();
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
    }
}
