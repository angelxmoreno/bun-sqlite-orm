import type { Database } from 'bun:sqlite';
import type { DbLogger } from '../types';

export interface TransactionOptions {
    /**
     * Transaction isolation level
     * @default 'DEFERRED'
     */
    isolation?: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE';
}

/**
 * Represents a database transaction that provides atomic operations
 * and proper error handling with automatic rollback capabilities.
 */
export class Transaction {
    private isActive = false;
    private isCommitted = false;
    private isRolledBack = false;
    private savepointCounter = 0;
    private savepointStack: string[] = [];

    constructor(
        private readonly database: Database,
        private readonly logger: DbLogger,
        private readonly options: TransactionOptions = {}
    ) {}

    /**
     * Start the transaction
     */
    async begin(): Promise<void> {
        if (this.isActive) {
            throw new Error('Transaction is already active');
        }

        const isolation = this.options.isolation || 'DEFERRED';
        const sql = `BEGIN ${isolation} TRANSACTION`;

        this.logger.debug('Starting transaction', { sql, isolation });

        try {
            this.database.exec(sql);
            this.isActive = true;
            this.logger.debug('Transaction started successfully');
        } catch (error) {
            this.logger.error('Failed to start transaction', error);
            throw new Error(`Failed to start transaction: ${error}`);
        }
    }

    /**
     * Commit the transaction
     */
    async commit(): Promise<void> {
        if (!this.isActive) {
            throw new Error('No active transaction to commit');
        }

        if (this.isCommitted) {
            throw new Error('Transaction has already been committed');
        }

        if (this.isRolledBack) {
            throw new Error('Transaction has been rolled back and cannot be committed');
        }

        // Rollback any open savepoints first
        while (this.savepointStack.length > 0) {
            await this.rollbackToSavepoint();
        }

        this.logger.debug('Committing transaction');

        try {
            this.database.exec('COMMIT TRANSACTION');
            this.isActive = false;
            this.isCommitted = true;
            this.logger.debug('Transaction committed successfully');
        } catch (error) {
            this.logger.error('Failed to commit transaction', error);
            // Try to rollback on commit failure
            try {
                this.database.exec('ROLLBACK TRANSACTION');
                this.isActive = false;
                this.isRolledBack = true;
            } catch (rollbackError) {
                this.logger.error('Failed to rollback after commit failure', rollbackError);
            }
            throw new Error(`Failed to commit transaction: ${error}`);
        }
    }

    /**
     * Rollback the transaction
     */
    async rollback(): Promise<void> {
        if (!this.isActive) {
            throw new Error('No active transaction to rollback');
        }

        if (this.isCommitted) {
            throw new Error('Transaction has already been committed');
        }

        if (this.isRolledBack) {
            throw new Error('Transaction has already been rolled back');
        }

        this.logger.debug('Rolling back transaction');

        try {
            this.database.exec('ROLLBACK TRANSACTION');
            this.isActive = false;
            this.isRolledBack = true;
            this.savepointStack.length = 0; // Clear savepoint stack
            this.logger.debug('Transaction rolled back successfully');
        } catch (error) {
            this.logger.error('Failed to rollback transaction', error);
            throw new Error(`Failed to rollback transaction: ${error}`);
        }
    }

    /**
     * Create a savepoint for nested transactions
     */
    async savepoint(name?: string): Promise<string> {
        if (!this.isActive) {
            throw new Error('Cannot create savepoint without active transaction');
        }

        const savepointName = name || `sp_${++this.savepointCounter}`;
        const sql = `SAVEPOINT ${savepointName}`;

        this.logger.debug('Creating savepoint', { savepoint: savepointName, sql });

        try {
            this.database.exec(sql);
            this.savepointStack.push(savepointName);
            this.logger.debug('Savepoint created successfully', { savepoint: savepointName });
            return savepointName;
        } catch (error) {
            this.logger.error('Failed to create savepoint', { savepoint: savepointName, error });
            throw new Error(`Failed to create savepoint ${savepointName}: ${error}`);
        }
    }

    /**
     * Release a savepoint (commit nested transaction)
     */
    async releaseSavepoint(name?: string): Promise<void> {
        if (!this.isActive) {
            throw new Error('Cannot release savepoint without active transaction');
        }

        const savepointName = name || this.savepointStack[this.savepointStack.length - 1];

        if (!savepointName) {
            throw new Error('No savepoint to release');
        }

        const sql = `RELEASE SAVEPOINT ${savepointName}`;

        this.logger.debug('Releasing savepoint', { savepoint: savepointName, sql });

        try {
            this.database.exec(sql);
            // Remove from stack
            const index = this.savepointStack.indexOf(savepointName);
            if (index > -1) {
                this.savepointStack.splice(index, 1);
            }
            this.logger.debug('Savepoint released successfully', { savepoint: savepointName });
        } catch (error) {
            this.logger.error('Failed to release savepoint', { savepoint: savepointName, error });
            throw new Error(`Failed to release savepoint ${savepointName}: ${error}`);
        }
    }

    /**
     * Rollback to a savepoint (rollback nested transaction)
     */
    async rollbackToSavepoint(name?: string): Promise<void> {
        if (!this.isActive) {
            throw new Error('Cannot rollback to savepoint without active transaction');
        }

        const savepointName = name || this.savepointStack[this.savepointStack.length - 1];

        if (!savepointName) {
            throw new Error('No savepoint to rollback to');
        }

        const sql = `ROLLBACK TO SAVEPOINT ${savepointName}`;

        this.logger.debug('Rolling back to savepoint', { savepoint: savepointName, sql });

        try {
            this.database.exec(sql);
            // Remove from stack - remove all savepoints after this one
            const index = this.savepointStack.indexOf(savepointName);
            if (index > -1) {
                this.savepointStack.splice(index + 1);
            }
            this.logger.debug('Rolled back to savepoint successfully', { savepoint: savepointName });
        } catch (error) {
            this.logger.error('Failed to rollback to savepoint', { savepoint: savepointName, error });
            throw new Error(`Failed to rollback to savepoint ${savepointName}: ${error}`);
        }
    }

    /**
     * Check if transaction is active
     */
    isTransactionActive(): boolean {
        return this.isActive;
    }

    /**
     * Check if transaction has been committed
     */
    isTransactionCommitted(): boolean {
        return this.isCommitted;
    }

    /**
     * Check if transaction has been rolled back
     */
    isTransactionRolledBack(): boolean {
        return this.isRolledBack;
    }

    /**
     * Get the underlying database connection
     * This allows transaction-aware entities to use the same connection
     */
    getDatabase(): Database {
        return this.database;
    }

    /**
     * Execute a query within the transaction context
     */
    exec(sql: string): void {
        if (!this.isActive) {
            throw new Error('Cannot execute query without active transaction');
        }

        this.logger.debug('Executing SQL in transaction', { sql });

        try {
            this.database.exec(sql);
        } catch (error) {
            this.logger.error('Failed to execute SQL in transaction', { sql, error });
            throw error;
        }
    }

    /**
     * Prepare a statement within the transaction context
     */
    prepare(sql: string) {
        if (!this.isActive) {
            throw new Error('Cannot prepare statement without active transaction');
        }

        this.logger.debug('Preparing statement in transaction', { sql });
        return this.database.prepare(sql);
    }
}
