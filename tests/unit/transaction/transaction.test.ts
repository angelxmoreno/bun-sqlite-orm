import type { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NullLogger } from '../../../src/logger';
import { Transaction } from '../../../src/transaction';

describe('Transaction Unit Tests', () => {
    let mockDatabase: {
        exec: ReturnType<typeof mock>;
        prepare: ReturnType<typeof mock>;
    };
    let logger: NullLogger;
    let transaction: Transaction;

    beforeEach(() => {
        mockDatabase = {
            exec: mock(),
            prepare: mock(),
        };
        logger = new NullLogger();
        transaction = new Transaction(mockDatabase as unknown as Database, logger);
    });

    afterEach(() => {
        // Reset mocks
        mockDatabase.exec.mockReset();
        mockDatabase.prepare.mockReset();
    });

    describe('Transaction Lifecycle', () => {
        test('should begin transaction with default isolation level', async () => {
            await transaction.begin();

            expect(mockDatabase.exec).toHaveBeenCalledWith('BEGIN DEFERRED TRANSACTION');
            expect(transaction.isTransactionActive()).toBe(true);
        });

        test('should begin transaction with custom isolation level', async () => {
            transaction = new Transaction(mockDatabase as unknown as Database, logger, { isolation: 'IMMEDIATE' });

            await transaction.begin();

            expect(mockDatabase.exec).toHaveBeenCalledWith('BEGIN IMMEDIATE TRANSACTION');
            expect(transaction.isTransactionActive()).toBe(true);
        });

        test('should throw error when beginning already active transaction', async () => {
            await transaction.begin();

            await expect(transaction.begin()).rejects.toThrow('Transaction is already active');
        });

        test('should commit active transaction', async () => {
            await transaction.begin();
            await transaction.commit();

            expect(mockDatabase.exec).toHaveBeenCalledWith('COMMIT TRANSACTION');
            expect(transaction.isTransactionCommitted()).toBe(true);
            expect(transaction.isTransactionActive()).toBe(false);
        });

        test('should throw error when committing inactive transaction', async () => {
            await expect(transaction.commit()).rejects.toThrow('No active transaction to commit');
        });

        test('should throw error when committing already committed transaction', async () => {
            await transaction.begin();
            await transaction.commit();

            await expect(transaction.commit()).rejects.toThrow('No active transaction to commit');
        });

        test('should rollback active transaction', async () => {
            await transaction.begin();
            await transaction.rollback();

            expect(mockDatabase.exec).toHaveBeenCalledWith('ROLLBACK TRANSACTION');
            expect(transaction.isTransactionRolledBack()).toBe(true);
            expect(transaction.isTransactionActive()).toBe(false);
        });

        test('should throw error when rolling back inactive transaction', async () => {
            await expect(transaction.rollback()).rejects.toThrow('No active transaction to rollback');
        });

        test('should throw error when rolling back already committed transaction', async () => {
            await transaction.begin();
            await transaction.commit();

            await expect(transaction.rollback()).rejects.toThrow('No active transaction to rollback');
        });
    });

    describe('Error Handling', () => {
        test('should handle database error during begin', async () => {
            mockDatabase.exec.mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            await expect(transaction.begin()).rejects.toThrow(
                'Failed to start transaction: Error: Database connection failed'
            );
            expect(transaction.isTransactionActive()).toBe(false);
        });

        test('should handle database error during commit', async () => {
            await transaction.begin();

            mockDatabase.exec.mockImplementation((sql: string) => {
                if (sql === 'COMMIT TRANSACTION') {
                    throw new Error('Commit failed');
                }
            });

            await expect(transaction.commit()).rejects.toThrow('Failed to commit transaction: Error: Commit failed');
        });

        test('should attempt rollback on commit failure', async () => {
            await transaction.begin();

            let callCount = 0;
            mockDatabase.exec.mockImplementation((sql: string) => {
                callCount++;
                if (sql === 'COMMIT TRANSACTION') {
                    throw new Error('Commit failed');
                }
                // Allow rollback to succeed
            });

            await expect(transaction.commit()).rejects.toThrow('Failed to commit transaction');

            // Should have attempted rollback
            expect(mockDatabase.exec).toHaveBeenCalledWith('ROLLBACK TRANSACTION');
            expect(transaction.isTransactionRolledBack()).toBe(true);
        });
    });

    describe('Savepoints', () => {
        test('should create savepoint with auto-generated name', async () => {
            await transaction.begin();

            const savepointName = await transaction.savepoint();

            expect(savepointName).toBe('sp_1');
            expect(mockDatabase.exec).toHaveBeenCalledWith('SAVEPOINT sp_1');
        });

        test('should create savepoint with custom name', async () => {
            await transaction.begin();

            const savepointName = await transaction.savepoint('custom_sp');

            expect(savepointName).toBe('custom_sp');
            expect(mockDatabase.exec).toHaveBeenCalledWith('SAVEPOINT custom_sp');
        });

        test('should throw error when creating savepoint without active transaction', async () => {
            await expect(transaction.savepoint()).rejects.toThrow('Cannot create savepoint without active transaction');
        });

        test('should release savepoint', async () => {
            await transaction.begin();
            await transaction.savepoint('test_sp');

            await transaction.releaseSavepoint('test_sp');

            expect(mockDatabase.exec).toHaveBeenCalledWith('RELEASE SAVEPOINT test_sp');
        });

        test('should rollback to savepoint', async () => {
            await transaction.begin();
            await transaction.savepoint('test_sp');

            await transaction.rollbackToSavepoint('test_sp');

            expect(mockDatabase.exec).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT test_sp');
        });

        test('should release most recent savepoint when no name provided', async () => {
            await transaction.begin();
            await transaction.savepoint('sp1');
            await transaction.savepoint('sp2');

            await transaction.releaseSavepoint();

            expect(mockDatabase.exec).toHaveBeenCalledWith('RELEASE SAVEPOINT sp2');
        });

        test('should rollback to most recent savepoint when no name provided', async () => {
            await transaction.begin();
            await transaction.savepoint('sp1');
            await transaction.savepoint('sp2');

            await transaction.rollbackToSavepoint();

            expect(mockDatabase.exec).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT sp2');
        });
    });

    describe('Database Operations', () => {
        test('should execute SQL within transaction', async () => {
            await transaction.begin();

            transaction.exec('INSERT INTO users (name) VALUES (?)');

            expect(mockDatabase.exec).toHaveBeenCalledWith('INSERT INTO users (name) VALUES (?)');
        });

        test('should throw error when executing SQL without active transaction', () => {
            expect(() => transaction.exec('SELECT 1')).toThrow('Cannot execute query without active transaction');
        });

        test('should prepare statement within transaction', async () => {
            await transaction.begin();
            mockDatabase.prepare.mockReturnValue({});

            transaction.prepare('SELECT * FROM users WHERE id = ?');

            expect(mockDatabase.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?');
        });

        test('should throw error when preparing statement without active transaction', () => {
            expect(() => transaction.prepare('SELECT 1')).toThrow(
                'Cannot prepare statement without active transaction'
            );
        });

        test('should return database connection', async () => {
            const db = transaction.getDatabase();
            expect(db).toBeDefined();
        });
    });

    describe('Transaction State', () => {
        test('should track transaction states correctly', async () => {
            // Initial state
            expect(transaction.isTransactionActive()).toBe(false);
            expect(transaction.isTransactionCommitted()).toBe(false);
            expect(transaction.isTransactionRolledBack()).toBe(false);

            // After begin
            await transaction.begin();
            expect(transaction.isTransactionActive()).toBe(true);
            expect(transaction.isTransactionCommitted()).toBe(false);
            expect(transaction.isTransactionRolledBack()).toBe(false);

            // After commit
            await transaction.commit();
            expect(transaction.isTransactionActive()).toBe(false);
            expect(transaction.isTransactionCommitted()).toBe(true);
            expect(transaction.isTransactionRolledBack()).toBe(false);
        });

        test('should track rollback state correctly', async () => {
            await transaction.begin();
            await transaction.rollback();

            expect(transaction.isTransactionActive()).toBe(false);
            expect(transaction.isTransactionCommitted()).toBe(false);
            expect(transaction.isTransactionRolledBack()).toBe(true);
        });
    });
});
