import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { BaseEntity, Column, DataSource, Entity, PrimaryGeneratedColumn } from '../../src';
import { type TestDataSourceResult, createTestDataSource } from '../helpers/test-datasource';

describe('Transaction Support Integration Tests', () => {
    let testDS: TestDataSourceResult;

    // Define test entities inline for isolation
    @Entity('tx_users')
    class TxUser extends BaseEntity {
        @PrimaryGeneratedColumn('int')
        id!: number;

        @Column()
        name!: string;

        @Column({ unique: true })
        email!: string;

        @Column({ nullable: true })
        age?: number;
    }

    @Entity('tx_posts')
    class TxPost extends BaseEntity {
        @PrimaryGeneratedColumn('int')
        id!: number;

        @Column()
        title!: string;

        @Column()
        content!: string;

        @Column()
        userId!: number;
    }

    beforeAll(async () => {
        testDS = await createTestDataSource({
            entities: [TxUser, TxPost],
        });
        await testDS.dataSource.runMigrations();
    });

    afterAll(async () => {
        await testDS.cleanup();
    });

    beforeEach(async () => {
        // Clear test data
        await TxUser.deleteAll({});
        await TxPost.deleteAll({});
    });

    describe('Basic Transaction Operations', () => {
        test('should commit transaction on success', async () => {
            const result = await testDS.dataSource.transaction(async (tx) => {
                const user = await TxUser.create({
                    name: 'John Doe',
                    email: 'john@example.com',
                    age: 30,
                });

                const post = await TxPost.create({
                    title: 'My First Post',
                    content: 'Hello World!',
                    userId: user.id,
                });

                return { user, post };
            });

            // Verify data was committed
            expect(result.user.id).toBeDefined();
            expect(result.post.id).toBeDefined();

            const savedUser = await TxUser.get(result.user.id);
            const savedPost = await TxPost.get(result.post.id);

            expect(savedUser.name).toBe('John Doe');
            expect(savedPost.title).toBe('My First Post');
            expect(savedPost.userId).toBe(result.user.id);
        });

        test('should rollback transaction on error', async () => {
            await expect(
                testDS.dataSource.transaction(async (tx) => {
                    // Create a user first
                    const user = await TxUser.create({
                        name: 'Jane Doe',
                        email: 'jane@example.com',
                        age: 25,
                    });

                    // Create a post
                    await TxPost.create({
                        title: 'Jane Post',
                        content: 'Content here',
                        userId: user.id,
                    });

                    // Force an error
                    throw new Error('Something went wrong');
                })
            ).rejects.toThrow('Something went wrong');

            // Verify nothing was committed
            const users = await TxUser.find({});
            const posts = await TxPost.find({});

            expect(users).toHaveLength(0);
            expect(posts).toHaveLength(0);
        });

        test('should handle database constraint violations in transaction', async () => {
            // First create a user with unique email
            await TxUser.create({
                name: 'First User',
                email: 'unique@example.com',
                age: 20,
            });

            await expect(
                testDS.dataSource.transaction(async (tx) => {
                    // This should succeed
                    await TxUser.create({
                        name: 'Second User',
                        email: 'second@example.com',
                        age: 22,
                    });

                    // This should fail due to unique constraint
                    await TxUser.create({
                        name: 'Duplicate Email User',
                        email: 'unique@example.com', // Duplicate email
                        age: 23,
                    });
                })
            ).rejects.toThrow();

            // Verify that the transaction was rolled back completely
            // Only the first user (created outside transaction) should exist
            const users = await TxUser.find({});
            expect(users).toHaveLength(1);
            expect(users[0].email).toBe('unique@example.com');
        });
    });

    describe('Transaction Isolation Levels', () => {
        test('should use DEFERRED isolation by default', async () => {
            const result = await testDS.dataSource.transaction(async (tx) => {
                const user = await TxUser.create({
                    name: 'Deferred User',
                    email: 'deferred@example.com',
                });
                return user;
            });

            expect(result.id).toBeDefined();

            const savedUser = await TxUser.get(result.id);
            expect(savedUser.name).toBe('Deferred User');
        });

        test('should use IMMEDIATE isolation when specified', async () => {
            const result = await testDS.dataSource.transaction(
                async (tx) => {
                    const user = await TxUser.create({
                        name: 'Immediate User',
                        email: 'immediate@example.com',
                    });
                    return user;
                },
                { isolation: 'IMMEDIATE' }
            );

            expect(result.id).toBeDefined();

            const savedUser = await TxUser.get(result.id);
            expect(savedUser.name).toBe('Immediate User');
        });

        test('should use EXCLUSIVE isolation when specified', async () => {
            const result = await testDS.dataSource.transaction(
                async (tx) => {
                    const user = await TxUser.create({
                        name: 'Exclusive User',
                        email: 'exclusive@example.com',
                    });
                    return user;
                },
                { isolation: 'EXCLUSIVE' }
            );

            expect(result.id).toBeDefined();

            const savedUser = await TxUser.get(result.id);
            expect(savedUser.name).toBe('Exclusive User');
        });
    });

    describe('Parallel Transaction Operations', () => {
        test('should execute parallel operations within single transaction', async () => {
            const [users, posts] = await testDS.dataSource.transactionParallel([
                async (tx) => {
                    return Promise.all([
                        TxUser.create({ name: 'User 1', email: 'user1@example.com' }),
                        TxUser.create({ name: 'User 2', email: 'user2@example.com' }),
                        TxUser.create({ name: 'User 3', email: 'user3@example.com' }),
                    ]);
                },
                async (tx) => {
                    // Create posts without user references for simplicity
                    return Promise.all([
                        TxPost.create({ title: 'Post 1', content: 'Content 1', userId: 1 }),
                        TxPost.create({ title: 'Post 2', content: 'Content 2', userId: 2 }),
                    ]);
                },
            ]);

            expect(users).toHaveLength(3);
            expect(posts).toHaveLength(2);

            // Verify all data was committed
            const savedUsers = await TxUser.find({});
            const savedPosts = await TxPost.find({});

            expect(savedUsers).toHaveLength(3);
            expect(savedPosts).toHaveLength(2);
        });

        test('should rollback all parallel operations on any failure', async () => {
            await expect(
                testDS.dataSource.transactionParallel([
                    async (tx) => {
                        return Promise.all([
                            TxUser.create({ name: 'User 1', email: 'user1@example.com' }),
                            TxUser.create({ name: 'User 2', email: 'user2@example.com' }),
                        ]);
                    },
                    async (tx) => {
                        // This operation will fail
                        throw new Error('Parallel operation failed');
                    },
                ])
            ).rejects.toThrow('Parallel operation failed');

            // Verify nothing was committed
            const users = await TxUser.find({});
            expect(users).toHaveLength(0);
        });
    });

    describe('Sequential Transaction Operations', () => {
        test('should execute operations in sequence', async () => {
            const result = await testDS.dataSource.transactionSequential([
                async (tx) => {
                    return TxUser.create({
                        name: 'Sequential User',
                        email: 'seq@example.com',
                        age: 30,
                    });
                },
                async (tx) => {
                    // Get the user created in previous step
                    const users = await TxUser.find({});
                    const user = users[0];

                    return TxPost.create({
                        title: 'Sequential Post',
                        content: 'This post was created after the user',
                        userId: user.id,
                    });
                },
            ]);

            // Verify the final result and data integrity
            const users = await TxUser.find({});
            const posts = await TxPost.find({});

            expect(users).toHaveLength(1);
            expect(posts).toHaveLength(1);
            expect(posts[0].userId).toBe(users[0].id);
        });

        test('should rollback sequential operations on failure', async () => {
            await expect(
                testDS.dataSource.transactionSequential([
                    async (tx) => {
                        return TxUser.create({
                            name: 'Sequential User 1',
                            email: 'seq1@example.com',
                        });
                    },
                    async (tx) => {
                        return TxUser.create({
                            name: 'Sequential User 2',
                            email: 'seq2@example.com',
                        });
                    },
                    async (tx) => {
                        // This will fail
                        throw new Error('Sequential operation failed');
                    },
                ])
            ).rejects.toThrow('Sequential operation failed');

            // Verify nothing was committed
            const users = await TxUser.find({});
            expect(users).toHaveLength(0);
        });
    });

    describe('Manual Transaction Management', () => {
        test('should allow manual transaction control', async () => {
            const tx = testDS.dataSource.createTransaction();

            try {
                await tx.begin();

                const user = await TxUser.create({
                    name: 'Manual User',
                    email: 'manual@example.com',
                });

                const post = await TxPost.create({
                    title: 'Manual Post',
                    content: 'Manually managed transaction',
                    userId: user.id,
                });

                await tx.commit();

                // Verify data was committed
                const savedUser = await TxUser.get(user.id);
                const savedPost = await TxPost.get(post.id);

                expect(savedUser.name).toBe('Manual User');
                expect(savedPost.title).toBe('Manual Post');
            } catch (error) {
                await tx.rollback();
                throw error;
            }
        });

        test('should handle manual rollback', async () => {
            const tx = testDS.dataSource.createTransaction();

            try {
                await tx.begin();

                await TxUser.create({
                    name: 'Rollback User',
                    email: 'rollback@example.com',
                });

                // Manually rollback
                await tx.rollback();

                // Verify nothing was committed
                const users = await TxUser.find({});
                expect(users).toHaveLength(0);
            } catch (error) {
                if (tx.isTransactionActive()) {
                    await tx.rollback();
                }
                throw error;
            }
        });
    });

    describe('Complex Transaction Scenarios', () => {
        test('should handle multiple entity operations', async () => {
            const result = await testDS.dataSource.transaction(async (tx) => {
                // Create multiple users
                const users = await Promise.all([
                    TxUser.create({ name: 'Alice', email: 'alice@example.com', age: 25 }),
                    TxUser.create({ name: 'Bob', email: 'bob@example.com', age: 30 }),
                    TxUser.create({ name: 'Charlie', email: 'charlie@example.com', age: 35 }),
                ]);

                // Create posts for each user
                const posts = await Promise.all([
                    TxPost.create({ title: 'Alice Post 1', content: 'Content A1', userId: users[0].id }),
                    TxPost.create({ title: 'Alice Post 2', content: 'Content A2', userId: users[0].id }),
                    TxPost.create({ title: 'Bob Post 1', content: 'Content B1', userId: users[1].id }),
                    TxPost.create({ title: 'Charlie Post 1', content: 'Content C1', userId: users[2].id }),
                ]);

                // Update user ages
                for (const user of users) {
                    user.age = (user.age || 0) + 1;
                    await user.save();
                }

                return { users, posts };
            });

            // Verify all operations were committed
            const savedUsers = await TxUser.find({});
            const savedPosts = await TxPost.find({});

            expect(savedUsers).toHaveLength(3);
            expect(savedPosts).toHaveLength(4);

            // Verify ages were updated
            expect(savedUsers.find((u) => u.name === 'Alice')?.age).toBe(26);
            expect(savedUsers.find((u) => u.name === 'Bob')?.age).toBe(31);
            expect(savedUsers.find((u) => u.name === 'Charlie')?.age).toBe(36);

            // Verify posts are linked to correct users
            const alicePosts = savedPosts.filter((p) => p.userId === savedUsers.find((u) => u.name === 'Alice')?.id);
            expect(alicePosts).toHaveLength(2);
        });

        test('should handle transaction with mixed success and failure operations', async () => {
            // First, create a user outside the transaction
            const existingUser = await TxUser.create({
                name: 'Existing User',
                email: 'existing@example.com',
            });

            await expect(
                testDS.dataSource.transaction(async (tx) => {
                    // This should succeed
                    const newUser = await TxUser.create({
                        name: 'New User',
                        email: 'new@example.com',
                        age: 28,
                    });

                    // This should succeed
                    await TxPost.create({
                        title: 'Valid Post',
                        content: 'This is valid',
                        userId: newUser.id,
                    });

                    // Update existing user (should succeed)
                    existingUser.age = 40;
                    await existingUser.save();

                    // This will fail
                    throw new Error('Intentional failure');
                })
            ).rejects.toThrow('Intentional failure');

            // Verify transaction was rolled back
            const users = await TxUser.find({});
            const posts = await TxPost.find({});

            // Only the existing user should remain, unchanged
            expect(users).toHaveLength(1);
            expect(users[0].name).toBe('Existing User');
            expect(users[0].age).toBeUndefined(); // Age update should be rolled back
            expect(posts).toHaveLength(0);
        });
    });
});
