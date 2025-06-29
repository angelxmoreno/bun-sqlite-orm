/**
 * Type Safety Examples for update() method
 *
 * This file demonstrates the improved type safety with Partial<T>.
 * These examples show TypeScript compilation behavior and are not executed as tests.
 */

import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '../../src';

@Entity('example_user')
class ExampleUser extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column()
    email!: string;

    @Column()
    age!: number;

    @Column()
    isActive!: boolean;

    @Column()
    metadata?: Record<string, unknown>;

    @Column()
    tags?: string[];

    @Column()
    preferences?: {
        theme: 'light' | 'dark';
        notifications: boolean;
        language: string;
    };
}

// Example function to demonstrate type safety
async function demonstrateTypeSafety() {
    const user = new ExampleUser();
    user.id = 1;
    (user as unknown as { _isNew: boolean })._isNew = false;

    // ✅ VALID: Correct property names and types
    await user.update({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        isActive: true,
    });

    // ✅ VALID: Partial updates
    await user.update({
        name: 'Updated Name',
    });

    // ✅ VALID: Complex object types
    await user.update({
        metadata: { lastLogin: new Date() },
        tags: ['admin', 'user'],
        preferences: {
            theme: 'dark',
            notifications: true,
            language: 'en',
        },
    });

    // ✅ VALID: Optional properties
    await user.update({
        metadata: undefined,
        tags: ['newTag'],
    });

    // ✅ VALID: Empty object (partial allows this)
    await user.update({});

    /*
     * The following examples would show TypeScript errors in a real IDE:
     * (Commented out to allow compilation)
     */

    // ❌ TYPE ERROR: Invalid property name
    // await user.update({
    //     invalidProperty: 'value'  // Property 'invalidProperty' does not exist on type 'Partial<ExampleUser>'
    // });

    // ❌ TYPE ERROR: Wrong type for property
    // await user.update({
    //     name: 123,  // Type 'number' is not assignable to type 'string | undefined'
    //     age: 'not a number',  // Type 'string' is not assignable to type 'number | undefined'
    //     isActive: 'yes'  // Type 'string' is not assignable to type 'boolean | undefined'
    // });

    // ❌ TYPE ERROR: Invalid nested object structure
    // await user.update({
    //     preferences: {
    //         invalidKey: 'value',  // Object literal may only specify known properties
    //         theme: 'invalid'  // Type '"invalid"' is not assignable to type '"light" | "dark" | undefined'
    //     }
    // });

    // ❌ TYPE ERROR: Wrong array type
    // await user.update({
    //     tags: [123, 456]  // Type 'number' is not assignable to type 'string'
    // });
}

// Example of IntelliSense benefits
async function demonstrateIntelliSense() {
    const user = new ExampleUser();

    // When typing user.update({ ... }), IntelliSense will show:
    // - name?: string | undefined
    // - email?: string | undefined
    // - age?: number | undefined
    // - isActive?: boolean | undefined
    // - metadata?: Record<string, unknown> | undefined
    // - tags?: string[] | undefined
    // - preferences?: { theme: 'light' | 'dark'; notifications: boolean; language: string; } | undefined

    await user.update({
        // IntelliSense autocompletes property names and shows their types
    });
}

// Example showing consistency with other methods
async function demonstrateConsistency() {
    // create() already uses Partial<T> for type safety
    const user1 = await ExampleUser.create({
        name: 'Alice',
        email: 'alice@example.com',
        age: 25,
        isActive: true,
    });

    // update() now matches this pattern for consistency
    await user1.update({
        name: 'Alice Updated',
        age: 26,
    });

    // Both methods now provide the same level of type safety
}

// Real-world API example
async function apiEndpointExample(requestBody: Partial<ExampleUser>) {
    const user = await ExampleUser.get(1);

    // Type-safe update from API request body
    // TypeScript will validate that requestBody matches Partial<ExampleUser>
    await user.update(requestBody);

    return user;
}

export { demonstrateTypeSafety, demonstrateIntelliSense, demonstrateConsistency, apiEndpointExample };
