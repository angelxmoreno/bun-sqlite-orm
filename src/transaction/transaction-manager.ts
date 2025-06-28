import type { Database } from 'bun:sqlite';
import type { DbLogger } from '../types';
import { Transaction, type TransactionOptions } from './transaction';

export type TransactionCallback<T> = (transaction: Transaction) => Promise<T>;

/**
 * Transaction Manager handles the creation and lifecycle of database transactions.
 * It provides the main API for transaction operations in bun-sqlite-orm.
 */
export class TransactionManager {
    constructor(
        private readonly database: Database,
        private readonly logger: DbLogger
    ) {}

    /**
     * Execute a callback within a database transaction.
     * The transaction will be automatically committed if the callback succeeds,
     * or rolled back if an error occurs.
     *
     * @param callback Function to execute within the transaction
     * @param options Transaction configuration options
     * @returns Promise resolving to the callback result
     *
     * @example
     * ```typescript
     * const result = await dataSource.transaction(async (tx) => {
     *   const user = await User.create({ name: 'John' });
     *   const post = await Post.create({ title: 'Hello', userId: user.id });
     *   return { user, post };
     * });
     * ```
     */
    async execute<T>(callback: TransactionCallback<T>, options: TransactionOptions = {}): Promise<T> {
        const transaction = new Transaction(this.database, this.logger, options);

        this.logger.debug('Starting transaction execution');

        try {
            // Begin the transaction
            await transaction.begin();

            this.logger.debug('Executing transaction callback');

            // Execute the callback with the transaction
            const result = await callback(transaction);

            // Commit the transaction if callback succeeds
            await transaction.commit();

            this.logger.info('Transaction completed successfully');
            return result;
        } catch (error) {
            this.logger.error('Transaction failed, rolling back', error);

            // Rollback the transaction on any error
            try {
                if (transaction.isTransactionActive()) {
                    await transaction.rollback();
                }
            } catch (rollbackError) {
                this.logger.error('Failed to rollback transaction', rollbackError);
                // Don't throw rollback error, let original error propagate
            }

            // Re-throw the original error
            throw error;
        }
    }

    /**
     * Create a new transaction without auto-commit/rollback.
     * You are responsible for managing the transaction lifecycle.
     *
     * @param options Transaction configuration options
     * @returns New Transaction instance
     *
     * @example
     * ```typescript
     * const tx = dataSource.createTransaction();
     * try {
     *   await tx.begin();
     *   // ... perform operations
     *   await tx.commit();
     * } catch (error) {
     *   await tx.rollback();
     *   throw error;
     * }
     * ```
     */
    createTransaction(options: TransactionOptions = {}): Transaction {
        return new Transaction(this.database, this.logger, options);
    }

    /**
     * Execute multiple operations in parallel within a single transaction.
     * All operations must succeed or the entire transaction will be rolled back.
     *
     * @param operations Array of functions to execute in parallel
     * @param options Transaction configuration options
     * @returns Promise resolving to array of results
     *
     * @example
     * ```typescript
     * const [user, posts] = await dataSource.transactionParallel([
     *   (tx) => User.create({ name: 'John' }),
     *   (tx) => Promise.all([
     *     Post.create({ title: 'Post 1' }),
     *     Post.create({ title: 'Post 2' })
     *   ])
     * ]);
     * ```
     */
    async executeParallel<T extends readonly unknown[] | []>(
        operations: readonly [...{ [K in keyof T]: TransactionCallback<T[K]> }],
        options: TransactionOptions = {}
    ): Promise<T> {
        return this.execute(async (tx) => {
            const results = await Promise.all(operations.map((operation) => operation(tx)));
            return results as T;
        }, options);
    }

    /**
     * Execute operations in sequence within a transaction.
     * Each operation receives the result of the previous operation.
     *
     * @param operations Array of functions to execute in sequence
     * @param options Transaction configuration options
     * @returns Promise resolving to the final result
     *
     * @example
     * ```typescript
     * const result = await dataSource.transactionSequential([
     *   (tx) => User.create({ name: 'John' }),
     *   (tx, user) => Post.create({ title: 'Hello', userId: user.id }),
     *   (tx, post) => Comment.create({ text: 'Nice!', postId: post.id })
     * ]);
     * ```
     */
    async executeSequential<T>(
        operations: TransactionCallback<unknown>[],
        options: TransactionOptions = {}
    ): Promise<T> {
        return this.execute(async (tx) => {
            let result: unknown;

            for (const operation of operations) {
                result = await operation(tx);
            }

            return result as T;
        }, options);
    }
}
