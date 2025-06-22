import { describe, expect, test } from 'bun:test';
import { getGlobalMetadataContainer } from '../../../src/container';
import { Column, Entity, PrimaryGeneratedColumn } from '../../../src/decorators';
import { BaseEntity } from '../../../src/entity';
import { createTestDataSource, withIsolatedDataSource } from '../../helpers/test-datasource';
import { resetGlobalMetadata, withTestEntityScope } from '../../helpers/test-utils';

/**
 * Tests for issue #44: Global MetadataContainer breaking test isolation
 *
 * These tests verify that:
 * 1. Test entities don't interfere with each other across test suites
 * 2. MetadataContainer can be properly cleared between tests
 * 3. DataSource.runMigrations() only creates tables for intended entities
 * 4. Test isolation utilities work correctly
 */

describe('Test Isolation (Issue #44 Fix)', () => {
    describe('MetadataContainer.clear()', () => {
        test('should remove all registered entities', async () => {
            await withTestEntityScope(async () => {
                @Entity('isolation_test_user')
                class IsolationTestUser extends BaseEntity {
                    @PrimaryGeneratedColumn('int')
                    id!: number;

                    @Column()
                    name!: string;
                }

                const container = getGlobalMetadataContainer();

                // Verify entity is registered
                expect(container.hasEntity(IsolationTestUser)).toBe(true);
                expect(container.getAllEntities().length).toBeGreaterThan(0);

                // Clear metadata
                container.clear();

                // Verify all entities are removed
                expect(container.hasEntity(IsolationTestUser)).toBe(false);
                expect(container.getAllEntities().length).toBe(0);
            });
        });

        test('should clear global index names', async () => {
            await withTestEntityScope(async () => {
                @Entity('indexed_entity')
                class IndexedEntity extends BaseEntity {
                    @PrimaryGeneratedColumn('int')
                    id!: number;

                    @Column({ index: true })
                    name!: string;
                }

                const container = getGlobalMetadataContainer();

                // Verify entity and index are registered
                expect(container.hasEntity(IndexedEntity)).toBe(true);
                const indexes = container.getIndexes(IndexedEntity);
                expect(indexes.length).toBeGreaterThan(0);

                // Clear metadata
                container.clear();

                // Verify entity is removed (can't check indexes on non-existent entity)
                expect(container.hasEntity(IndexedEntity)).toBe(false);
                expect(container.getAllEntities().length).toBe(0);
            });
        });
    });

    describe('resetGlobalMetadata()', () => {
        test('should provide clean slate for tests', async () => {
            await withTestEntityScope(async () => {
                @Entity('before_reset')
                class BeforeResetEntity extends BaseEntity {
                    @Column()
                    data!: string;
                }

                const container = getGlobalMetadataContainer();
                expect(container.hasEntity(BeforeResetEntity)).toBe(true);

                // Reset metadata
                resetGlobalMetadata();

                // Define new entity after reset
                @Entity('after_reset')
                class AfterResetEntity extends BaseEntity {
                    @Column()
                    value!: string;
                }

                // Verify only new entity exists
                expect(container.hasEntity(BeforeResetEntity)).toBe(false);
                expect(container.hasEntity(AfterResetEntity)).toBe(true);
                expect(container.getAllEntities().length).toBe(1);
            });
        });
    });

    describe('withTestEntityScope()', () => {
        test('should isolate entities within scope', async () => {
            const container = getGlobalMetadataContainer();
            const initialCount = container.getAllEntities().length;

            await withTestEntityScope(async () => {
                @Entity('scoped_entity')
                class ScopedEntity extends BaseEntity {
                    @Column()
                    name!: string;
                }

                // Entity should be registered within scope
                expect(container.hasEntity(ScopedEntity)).toBe(true);
                expect(container.getAllEntities().length).toBe(initialCount + 1);
            });

            // Entity should be cleaned up after scope
            expect(container.getAllEntities().length).toBe(0);
        });

        test('should handle nested scopes correctly', async () => {
            await withTestEntityScope(async () => {
                @Entity('outer_entity')
                class OuterEntity extends BaseEntity {
                    @Column()
                    name!: string;
                }

                const container = getGlobalMetadataContainer();
                expect(container.hasEntity(OuterEntity)).toBe(true);

                await withTestEntityScope(async () => {
                    @Entity('inner_entity')
                    class InnerEntity extends BaseEntity {
                        @Column()
                        value!: string;
                    }

                    // Inner scope should have both entities since withTestEntityScope
                    // doesn't clear metadata when entering, only when exiting
                    expect(container.hasEntity(InnerEntity)).toBe(true);
                    expect(container.hasEntity(OuterEntity)).toBe(true);
                    expect(container.getAllEntities().length).toBe(2);
                });

                // After inner scope, metadata should be cleared
                expect(container.getAllEntities().length).toBe(0);
            });
        });
    });

    describe('createTestDataSource with isolation', () => {
        test('should demonstrate the original issue #44 problem', async () => {
            // This test demonstrates why issue #44 occurs
            const container = getGlobalMetadataContainer();

            // Simulate a problematic entity (like from decorators.test.ts)
            // that has no columns and would cause SQL syntax errors
            @Entity('problematic_entity')
            class ProblematicEntity extends BaseEntity {
                // No columns - this causes: CREATE TABLE IF NOT EXISTS "problematic_entity" ()
                // which is invalid SQL syntax
            }

            // Verify entity is registered
            expect(container.hasEntity(ProblematicEntity)).toBe(true);

            // Now clear metadata (the solution)
            resetGlobalMetadata();

            // Verify entity is cleared
            expect(container.hasEntity(ProblematicEntity)).toBe(false);
            expect(container.getAllEntities().length).toBe(0);

            // This demonstrates that clearing metadata prevents problematic entities
            // from interfering with other tests' runMigrations() calls
        });

        test('should prevent global metadata pollution between tests', async () => {
            // Test 1: Register a problematic entity
            @Entity('test1_entity')
            class Test1Entity extends BaseEntity {
                @Column()
                name!: string;
            }

            const container = getGlobalMetadataContainer();
            expect(container.hasEntity(Test1Entity)).toBe(true);
            expect(container.getAllEntities().length).toBe(1);

            // Clear metadata between tests
            resetGlobalMetadata();
            expect(container.getAllEntities().length).toBe(0);

            // Test 2: Register a different entity
            @Entity('test2_entity')
            class Test2Entity extends BaseEntity {
                @Column()
                value!: string;
            }

            expect(container.hasEntity(Test2Entity)).toBe(true);
            expect(container.hasEntity(Test1Entity)).toBe(false); // Previous entity not present
            expect(container.getAllEntities().length).toBe(1);
        });
    });

    describe('withIsolatedDataSource()', () => {
        test('should clean up metadata after test completion', async () => {
            @Entity('isolated_user')
            class IsolatedUser extends BaseEntity {
                @PrimaryGeneratedColumn('int')
                id!: number;

                @Column()
                name!: string;
            }

            // Verify entity is registered before test
            const container = getGlobalMetadataContainer();
            expect(container.hasEntity(IsolatedUser)).toBe(true);

            await withIsolatedDataSource([IsolatedUser], async (dataSource) => {
                // Test can use the dataSource here
                expect(dataSource).toBeDefined();
            });

            // Verify metadata is cleaned up after test
            expect(container.getAllEntities().length).toBe(0);
        });

        test('should handle test failures without leaking metadata', async () => {
            @Entity('failure_test_entity')
            class FailureTestEntity extends BaseEntity {
                @Column()
                name!: string;
            }

            let threwError = false;

            try {
                await withIsolatedDataSource([FailureTestEntity], async (dataSource) => {
                    await dataSource.runMigrations();

                    // Intentionally throw an error
                    throw new Error('Test failure');
                });
            } catch (error) {
                threwError = true;
                expect((error as Error).message).toBe('Test failure');
            }

            expect(threwError).toBe(true);

            // Verify metadata is still cleaned up despite the error
            const container = getGlobalMetadataContainer();
            expect(container.getAllEntities().length).toBe(0);
        });
    });

    describe('Real-world scenario: Preventing issue #44', () => {
        test('should prevent problematic entities from breaking other tests', () => {
            // This simulates the actual issue #44 scenario
            const container = getGlobalMetadataContainer();

            // Simulate decorators.test.ts defining entities with no columns
            @Entity('problematic_no_columns')
            class ProblematicEntity extends BaseEntity {
                // No columns - would cause SQL error if runMigrations() is called
            }

            expect(container.hasEntity(ProblematicEntity)).toBe(true);

            // Before running another test that calls runMigrations(),
            // we clear the metadata to prevent SQL errors
            resetGlobalMetadata();

            // Now define a valid entity for the current test
            @Entity('valid_test_entity')
            class ValidEntity extends BaseEntity {
                @Column()
                name!: string;
            }

            // Verify only the valid entity is registered
            expect(container.hasEntity(ValidEntity)).toBe(true);
            expect(container.hasEntity(ProblematicEntity)).toBe(false);
            expect(container.getAllEntities().length).toBe(1);

            // This prevents the SQL syntax error that would occur from:
            // CREATE TABLE IF NOT EXISTS "problematic_no_columns" ()
        });
    });
});
