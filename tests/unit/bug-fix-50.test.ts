import { beforeEach, describe, expect, test } from 'bun:test';
import { getGlobalMetadataContainer } from '../../src/container';
import { Column, Entity, PrimaryGeneratedColumn } from '../../src/decorators';
import { BaseEntity } from '../../src/entity';
import type { EntityConstructor } from '../../src/types';
import { resetGlobalMetadata } from '../helpers/test-utils';

describe('Bug Fix #50: Base Entity without @Entity decorator (Unit Tests)', () => {
    beforeEach(() => {
        resetGlobalMetadata();
    });

    test('should not include auto-registered entities in getExplicitEntities()', async () => {
        // Create a base entity WITHOUT @Entity decorator (auto-registered only)
        class TestBaseEntity extends BaseEntity {
            @PrimaryGeneratedColumn('int')
            id!: number;

            @Column({ type: 'text' })
            name!: string;
        }

        // Create a child entity WITH @Entity decorator (explicitly registered)
        @Entity('test_explicit')
        class TestExplicitEntity extends TestBaseEntity {
            @Column({ type: 'text' })
            email!: string;
        }

        const metadataContainer = getGlobalMetadataContainer();

        // Both entities should be auto-registered for column metadata
        expect(metadataContainer.hasEntity(TestBaseEntity as EntityConstructor)).toBe(true);
        expect(metadataContainer.hasEntity(TestExplicitEntity as EntityConstructor)).toBe(true);

        // But only explicit entities should be returned by getExplicitEntities()
        const explicitEntities = metadataContainer.getExplicitEntities();
        const explicitEntityNames = explicitEntities.map((e) => e.tableName);

        expect(explicitEntityNames).toContain('test_explicit'); // Explicit entity should be included
        expect(explicitEntityNames).not.toContain('testbaseentity'); // Auto-registered entity should NOT be included

        // Verify the isExplicitlyRegistered flag is correct
        const baseMetadata = metadataContainer.getEntityMetadata(TestBaseEntity as EntityConstructor);
        const explicitMetadata = metadataContainer.getEntityMetadata(TestExplicitEntity as EntityConstructor);

        expect(baseMetadata?.isExplicitlyRegistered).toBe(false);
        expect(explicitMetadata?.isExplicitlyRegistered).toBe(true);
    });

    test('should track registration status correctly for multiple entity scenarios', async () => {
        // Test multiple scenarios in one test to avoid entity duplication

        // Scenario 1: Auto-registered entity
        class AutoEntity extends BaseEntity {
            @Column({ type: 'text' })
            prop!: string;
        }

        // Scenario 2: Explicitly registered entity
        @Entity('explicit_entity')
        class ExplicitEntity extends BaseEntity {
            @Column({ type: 'text' })
            prop!: string;
        }

        // Scenario 3: Base class auto-registered, child explicitly registered
        class BaseClass extends BaseEntity {
            @Column({ type: 'text' })
            baseProp!: string;
        }

        @Entity('child_entity')
        class ChildClass extends BaseClass {
            @Column({ type: 'text' })
            childProp!: string;
        }

        const metadataContainer = getGlobalMetadataContainer();
        const explicitEntities = metadataContainer.getExplicitEntities();
        const explicitEntityNames = explicitEntities.map((e) => e.tableName);

        // Verify explicit entities are included
        expect(explicitEntityNames).toContain('explicit_entity');
        expect(explicitEntityNames).toContain('child_entity');

        // Verify auto-registered entities are excluded
        expect(explicitEntityNames).not.toContain('autoentity');
        expect(explicitEntityNames).not.toContain('baseclass');

        // Verify flags
        expect(metadataContainer.getEntityMetadata(AutoEntity as EntityConstructor)?.isExplicitlyRegistered).toBe(
            false
        );
        expect(metadataContainer.getEntityMetadata(ExplicitEntity as EntityConstructor)?.isExplicitlyRegistered).toBe(
            true
        );
        expect(metadataContainer.getEntityMetadata(BaseClass as EntityConstructor)?.isExplicitlyRegistered).toBe(false);
        expect(metadataContainer.getEntityMetadata(ChildClass as EntityConstructor)?.isExplicitlyRegistered).toBe(true);
    });
});
