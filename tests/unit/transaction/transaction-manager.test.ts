import type { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { NullLogger } from '../../../src/logger';
import { TransactionManager } from '../../../src/transaction';

describe('TransactionManager Unit Tests', () => {
    let mockDatabase: {
        exec: ReturnType<typeof mock>;
        prepare: ReturnType<typeof mock>;
    };
    let logger: NullLogger;
    let transactionManager: TransactionManager;

    beforeEach(() => {
        mockDatabase = {
            exec: mock(),
            prepare: mock(),
        };
        logger = new NullLogger();
        transactionManager = new TransactionManager(mockDatabase as unknown as Database, logger);
    });

    afterEach(() => {
        mockDatabase.exec.mockReset();
        mockDatabase.prepare.mockReset();
    });

    describe('Transaction Execution', () => {
        test('should execute callback within transaction and commit on success', async () => {
            const callback = mock(() => Promise.resolve('success'));

            const result = await transactionManager.execute(callback);

            expect(result).toBe('success');
            expect(mockDatabase.exec).toHaveBeenCalledWith('BEGIN DEFERRED TRANSACTION');
            expect(mockDatabase.exec).toHaveBeenCalledWith('COMMIT TRANSACTION');
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('should rollback transaction on callback error', async () => {
            const error = new Error('Callback failed');
            const callback = mock(() => Promise.reject(error));

            await expect(transactionManager.execute(callback)).rejects.toThrow('Callback failed');

            expect(mockDatabase.exec).toHaveBeenCalledWith('BEGIN DEFERRED TRANSACTION');
            expect(mockDatabase.exec).toHaveBeenCalledWith('ROLLBACK TRANSACTION');
        });

        test('should pass transaction instance to callback', async () => {
            const callback = mock((tx) => {
                expect(tx).toBeDefined();
                expect(tx.isTransactionActive()).toBe(true);
                return Promise.resolve('success');
            });

            await transactionManager.execute(callback);

            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('should handle callback throwing synchronous error', async () => {
            const callback = mock(() => {
                throw new Error('Sync error');
            });

            await expect(transactionManager.execute(callback)).rejects.toThrow('Sync error');

            expect(mockDatabase.exec).toHaveBeenCalledWith('ROLLBACK TRANSACTION');
        });

        test('should use custom transaction options', async () => {
            const callback = mock(() => Promise.resolve('success'));

            await transactionManager.execute(callback, { isolation: 'IMMEDIATE' });

            expect(mockDatabase.exec).toHaveBeenCalledWith('BEGIN IMMEDIATE TRANSACTION');
        });
    });

    describe('Parallel Execution', () => {
        test('should execute multiple operations in parallel', async () => {
            const operation1 = mock(() => Promise.resolve('result1'));
            const operation2 = mock(() => Promise.resolve('result2'));
            const operation3 = mock(() => Promise.resolve('result3'));

            const results = await transactionManager.executeParallel([operation1, operation2, operation3]);

            expect(results).toEqual(['result1', 'result2', 'result3']);
            expect(operation1).toHaveBeenCalledTimes(1);
            expect(operation2).toHaveBeenCalledTimes(1);
            expect(operation3).toHaveBeenCalledTimes(1);
            expect(mockDatabase.exec).toHaveBeenCalledWith('COMMIT TRANSACTION');
        });

        test('should rollback if any parallel operation fails', async () => {
            const operation1 = mock(() => Promise.resolve('result1'));
            const operation2 = mock(() => Promise.reject(new Error('Operation 2 failed')));
            const operation3 = mock(() => Promise.resolve('result3'));

            await expect(transactionManager.executeParallel([operation1, operation2, operation3])).rejects.toThrow(
                'Operation 2 failed'
            );

            expect(mockDatabase.exec).toHaveBeenCalledWith('ROLLBACK TRANSACTION');
        });

        test('should pass same transaction instance to all parallel operations', async () => {
            let sharedTransaction: unknown;

            const operation1 = mock((tx) => {
                sharedTransaction = tx;
                return Promise.resolve('result1');
            });

            const operation2 = mock((tx) => {
                expect(tx).toBe(sharedTransaction);
                return Promise.resolve('result2');
            });

            await transactionManager.executeParallel([operation1, operation2]);

            expect(operation1).toHaveBeenCalledTimes(1);
            expect(operation2).toHaveBeenCalledTimes(1);
        });
    });

    describe('Sequential Execution', () => {
        test('should execute operations in sequence', async () => {
            const executionOrder: number[] = [];

            const operation1 = mock(() => {
                executionOrder.push(1);
                return Promise.resolve('result1');
            });

            const operation2 = mock(() => {
                executionOrder.push(2);
                return Promise.resolve('result2');
            });

            const operation3 = mock(() => {
                executionOrder.push(3);
                return Promise.resolve('result3');
            });

            const result = await transactionManager.executeSequential([operation1, operation2, operation3]);

            expect(result).toBe('result3'); // Last operation result
            expect(executionOrder).toEqual([1, 2, 3]);
            expect(mockDatabase.exec).toHaveBeenCalledWith('COMMIT TRANSACTION');
        });

        test('should rollback if any sequential operation fails', async () => {
            const operation1 = mock(() => Promise.resolve('result1'));
            const operation2 = mock(() => Promise.reject(new Error('Operation 2 failed')));
            const operation3 = mock(() => Promise.resolve('result3'));

            await expect(transactionManager.executeSequential([operation1, operation2, operation3])).rejects.toThrow(
                'Operation 2 failed'
            );

            expect(operation1).toHaveBeenCalledTimes(1);
            expect(operation2).toHaveBeenCalledTimes(1);
            expect(operation3).not.toHaveBeenCalled(); // Should not execute after failure
            expect(mockDatabase.exec).toHaveBeenCalledWith('ROLLBACK TRANSACTION');
        });
    });

    describe('Transaction Creation', () => {
        test('should create new transaction instance', () => {
            const transaction = transactionManager.createTransaction();

            expect(transaction).toBeDefined();
            expect(transaction.isTransactionActive()).toBe(false);
        });

        test('should create transaction with custom options', () => {
            const transaction = transactionManager.createTransaction({ isolation: 'EXCLUSIVE' });

            expect(transaction).toBeDefined();
            // Options are stored internally and used when transaction begins
        });

        test('should create independent transaction instances', () => {
            const transaction1 = transactionManager.createTransaction();
            const transaction2 = transactionManager.createTransaction();

            expect(transaction1).not.toBe(transaction2);
        });
    });

    describe('Error Handling Edge Cases', () => {
        test('should handle rollback failure gracefully', async () => {
            const callback = mock(() => Promise.reject(new Error('Callback failed')));

            // Mock rollback to fail
            mockDatabase.exec.mockImplementation((sql: string) => {
                if (sql === 'ROLLBACK TRANSACTION') {
                    throw new Error('Rollback failed');
                }
            });

            // Should still throw original error, not rollback error
            await expect(transactionManager.execute(callback)).rejects.toThrow('Callback failed');
        });

        test('should handle begin transaction failure', async () => {
            const callback = mock(() => Promise.resolve('success'));

            mockDatabase.exec.mockImplementation((sql: string) => {
                if (sql.startsWith('BEGIN')) {
                    throw new Error('Begin failed');
                }
            });

            await expect(transactionManager.execute(callback)).rejects.toThrow('Failed to start transaction');
            expect(callback).not.toHaveBeenCalled();
        });

        test('should handle commit failure with automatic rollback', async () => {
            const callback = mock(() => Promise.resolve('success'));

            mockDatabase.exec.mockImplementation((sql: string) => {
                if (sql === 'COMMIT TRANSACTION') {
                    throw new Error('Commit failed');
                }
            });

            await expect(transactionManager.execute(callback)).rejects.toThrow('Failed to commit transaction');
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });
});
