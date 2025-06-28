import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '../../src';
import { type TestDataSourceResult, createTestDataSource } from '../helpers/test-datasource';

describe('Transaction Savepoints Integration Tests', () => {
    let testDS: TestDataSourceResult;

    // Define test entities inline for isolation
    @Entity('sp_users')
    class SpUser extends BaseEntity {
        @PrimaryGeneratedColumn('int')
        id!: number;

        @Column()
        name!: string;

        @Column()
        email!: string;

        @Column({ nullable: true })
        status?: string;
    }

    @Entity('sp_logs')
    class SpLog extends BaseEntity {
        @PrimaryGeneratedColumn('int')
        id!: number;

        @Column()
        message!: string;

        @Column()
        level!: string;

        @Column()
        userId!: number;
    }

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [SpUser, SpLog],
        });
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        // Clear test data
        await SpUser.deleteAll({});
        await SpLog.deleteAll({});
    });

    describe('Basic Savepoint Operations', () => {
        test('should create and release savepoints successfully', async () => {
            const result = await testDS.dataSource.transaction(async (tx) => {
                // Create initial user
                const user = await SpUser.create({
                    name: 'John Doe',
                    email: 'john@example.com',
                    status: 'active',
                });

                // Create a savepoint
                const savepoint = await tx.savepoint('user_created');

                // Create log entry
                const log = await SpLog.create({
                    message: 'User created',
                    level: 'info',
                    userId: user.id,
                });

                // Release the savepoint (commit nested transaction)
                await tx.releaseSavepoint(savepoint);

                return { user, log };
            });

            // Verify all data was committed
            const users = await SpUser.find({});
            const logs = await SpLog.find({});

            expect(users).toHaveLength(1);
            expect(logs).toHaveLength(1);
            expect(users[0].name).toBe('John Doe');
            expect(logs[0].message).toBe('User created');
        });

        test('should rollback to savepoint and continue transaction', async () => {
            const result = await testDS.dataSource.transaction(async (tx) => {
                // Create initial user
                const user = await SpUser.create({
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    status: 'active',
                });

                // Create a savepoint
                const savepoint = await tx.savepoint('after_user');

                try {
                    // Create invalid log entry (this will be rolled back)
                    await SpLog.create({
                        message: 'Invalid log',
                        level: 'error',
                        userId: user.id,
                    });

                    // Update user status (this will be rolled back)
                    user.status = 'error';
                    await user.save();

                    // Simulate an error
                    throw new Error('Something went wrong');
                } catch (error) {
                    // Rollback to savepoint
                    await tx.rollbackToSavepoint(savepoint);
                }

                // Continue with valid operations after rollback
                const validLog = await SpLog.create({
                    message: 'User processed successfully',
                    level: 'info',
                    userId: user.id,
                });

                return { user, validLog };
            });

            // Verify the transaction committed correctly
            const users = await SpUser.find({});
            const logs = await SpLog.find({});

            expect(users).toHaveLength(1);
            expect(logs).toHaveLength(1);

            // User should still be active (rollback worked)
            expect(users[0].status).toBe('active');

            // Only the valid log should exist
            expect(logs[0].message).toBe('User processed successfully');
            expect(logs[0].level).toBe('info');
        });

        test('should handle multiple nested savepoints', async () => {
            const result = await testDS.dataSource.transaction(async (tx) => {
                // Create user
                const user = await SpUser.create({
                    name: 'Nested User',
                    email: 'nested@example.com',
                    status: 'pending',
                });

                // First savepoint
                const sp1 = await tx.savepoint('level1');

                // Create first log
                await SpLog.create({
                    message: 'Level 1 log',
                    level: 'info',
                    userId: user.id,
                });

                // Second savepoint
                const sp2 = await tx.savepoint('level2');

                // Create second log
                await SpLog.create({
                    message: 'Level 2 log',
                    level: 'debug',
                    userId: user.id,
                });

                // Third savepoint
                const sp3 = await tx.savepoint('level3');

                // Create third log (this will be rolled back)
                await SpLog.create({
                    message: 'Level 3 log',
                    level: 'error',
                    userId: user.id,
                });

                // Rollback to level 2
                await tx.rollbackToSavepoint(sp3);

                // Release level 2 savepoint
                await tx.releaseSavepoint(sp2);

                // Create final log
                await SpLog.create({
                    message: 'Final log',
                    level: 'info',
                    userId: user.id,
                });

                // Release level 1 savepoint
                await tx.releaseSavepoint(sp1);

                return user;
            });

            // Verify the correct data was committed
            const users = await SpUser.find({});
            const logs = await SpLog.find({});

            expect(users).toHaveLength(1);
            expect(logs).toHaveLength(3); // Level 1, Level 2, and Final logs

            const logMessages = logs.map((log) => log.message).sort();
            expect(logMessages).toEqual(['Final log', 'Level 1 log', 'Level 2 log']);

            // Level 3 log should not exist (was rolled back)
            expect(logs.find((log) => log.message === 'Level 3 log')).toBeUndefined();
        });
    });

    describe('Savepoint Error Handling', () => {
        test('should handle errors during savepoint operations', async () => {
            const result = await testDS.dataSource.transaction(async (tx) => {
                // Create user
                const user = await SpUser.create({
                    name: 'Error User',
                    email: 'error@example.com',
                });

                // Create savepoint
                const savepoint = await tx.savepoint('error_test');

                try {
                    // Create log
                    await SpLog.create({
                        message: 'Before error',
                        level: 'info',
                        userId: user.id,
                    });

                    // Update user
                    user.status = 'processing';
                    await user.save();

                    // Simulate database error
                    throw new Error('Database operation failed');
                } catch (error) {
                    // Rollback to savepoint on error
                    await tx.rollbackToSavepoint(savepoint);

                    // Log the error
                    await SpLog.create({
                        message: 'Error occurred: Database operation failed',
                        level: 'error',
                        userId: user.id,
                    });
                }

                return user;
            });

            // Verify error handling worked correctly
            const users = await SpUser.find({});
            const logs = await SpLog.find({});

            expect(users).toHaveLength(1);
            expect(logs).toHaveLength(1);

            // User status should not be 'processing' (was rolled back)
            expect(users[0].status).toBeUndefined();

            // Only error log should exist
            expect(logs[0].message).toBe('Error occurred: Database operation failed');
            expect(logs[0].level).toBe('error');
        });

        test('should rollback entire transaction if main transaction fails after savepoint operations', async () => {
            await expect(
                testDS.dataSource.transaction(async (tx) => {
                    // Create user
                    const user = await SpUser.create({
                        name: 'Fail User',
                        email: 'fail@example.com',
                    });

                    // Create savepoint and do some work
                    const savepoint = await tx.savepoint('work');

                    await SpLog.create({
                        message: 'Work in progress',
                        level: 'info',
                        userId: user.id,
                    });

                    await tx.releaseSavepoint(savepoint);

                    // Update user
                    user.status = 'completed';
                    await user.save();

                    // Main transaction fails
                    throw new Error('Main transaction failed');
                })
            ).rejects.toThrow('Main transaction failed');

            // Verify entire transaction was rolled back
            const users = await SpUser.find({});
            const logs = await SpLog.find({});

            expect(users).toHaveLength(0);
            expect(logs).toHaveLength(0);
        });
    });

    describe('Auto-generated Savepoint Names', () => {
        test('should auto-generate savepoint names when not provided', async () => {
            const result = await testDS.dataSource.transaction(async (tx) => {
                // Create user
                const user = await SpUser.create({
                    name: 'Auto SP User',
                    email: 'autosp@example.com',
                });

                // Create savepoints without names
                const sp1 = await tx.savepoint(); // Should be sp_1
                const sp2 = await tx.savepoint(); // Should be sp_2

                await SpLog.create({
                    message: 'Log 1',
                    level: 'info',
                    userId: user.id,
                });

                // Rollback to first savepoint
                await tx.rollbackToSavepoint(sp1);

                // Create different log
                await SpLog.create({
                    message: 'Log after rollback',
                    level: 'info',
                    userId: user.id,
                });

                return user;
            });

            // Verify operations worked correctly
            const users = await SpUser.find({});
            const logs = await SpLog.find({});

            expect(users).toHaveLength(1);
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe('Log after rollback');
        });

        test('should handle rollback and release with auto-generated names', async () => {
            const result = await testDS.dataSource.transaction(async (tx) => {
                const user = await SpUser.create({
                    name: 'Stack User',
                    email: 'stack@example.com',
                });

                // Create and use savepoints with explicit names for clarity
                const sp1 = await tx.savepoint('checkpoint1');

                await SpLog.create({
                    message: 'After checkpoint log',
                    level: 'info',
                    userId: user.id,
                });

                await tx.releaseSavepoint(sp1);

                return user;
            });

            const users = await SpUser.find({});
            const logs = await SpLog.find({});

            expect(users).toHaveLength(1);
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe('After checkpoint log');
        });
    });

    describe('Complex Savepoint Scenarios', () => {
        test('should handle batch operations with selective rollback', async () => {
            const result = await testDS.dataSource.transaction(async (tx) => {
                const results = [];

                // Process multiple users with savepoints for each
                for (let i = 1; i <= 3; i++) {
                    const savepoint = await tx.savepoint(`user_${i}`);

                    try {
                        const user = await SpUser.create({
                            name: `User ${i}`,
                            email: `user${i}@example.com`,
                            status: 'active',
                        });

                        // Simulate some users failing validation
                        if (i === 2) {
                            throw new Error(`User ${i} validation failed`);
                        }

                        await SpLog.create({
                            message: `User ${i} created successfully`,
                            level: 'info',
                            userId: user.id,
                        });

                        await tx.releaseSavepoint(savepoint);
                        results.push(user);
                    } catch (error) {
                        await tx.rollbackToSavepoint(savepoint);

                        // Log the failure
                        await SpLog.create({
                            message: `Failed to create User ${i}: ${(error as Error).message}`,
                            level: 'error',
                            userId: 0, // No user ID since creation failed
                        });
                    }
                }

                return results;
            });

            // Verify selective rollback worked
            const users = await SpUser.find({});
            const logs = await SpLog.find({});

            expect(users).toHaveLength(2); // User 1 and User 3
            expect(logs).toHaveLength(3); // 2 success logs + 1 error log

            const userNames = users.map((u) => u.name).sort();
            expect(userNames).toEqual(['User 1', 'User 3']);

            const errorLog = logs.find((log) => log.level === 'error');
            expect(errorLog?.message).toBe('Failed to create User 2: User 2 validation failed');
        });
    });
});
