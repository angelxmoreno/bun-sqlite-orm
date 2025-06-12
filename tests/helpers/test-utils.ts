import type { Database } from 'bun:sqlite';
import { expect } from 'bun:test';
import { DatabaseError, EntityNotFoundError, ValidationError } from '../../src/errors';

/**
 * Test utilities for common assertions and operations
 */

/**
 * Assert that a promise rejects with a specific error type and message
 */
export async function expectToThrow<T extends Error>(
    promise: Promise<unknown>,
    // biome-ignore lint/suspicious/noExplicitAny: Generic error constructor needs flexibility
    errorType: new (...args: any[]) => T,
    messagePattern?: string | RegExp
): Promise<T> {
    try {
        await promise;
        throw new Error(`Expected promise to throw ${errorType.name}, but it didn't throw`);
    } catch (error) {
        expect(error).toBeInstanceOf(errorType);

        if (messagePattern) {
            if (typeof messagePattern === 'string') {
                expect((error as Error).message).toContain(messagePattern);
            } else {
                expect((error as Error).message).toMatch(messagePattern);
            }
        }

        return error as T;
    }
}

/**
 * Assert ValidationError with specific field errors
 */
export async function expectValidationError(
    promise: Promise<unknown>,
    expectedErrors: Array<{ property: string; message?: string }>
): Promise<ValidationError> {
    const error = await expectToThrow(promise, ValidationError);

    for (const expectedError of expectedErrors) {
        const matchingError = error.errors.find((e) => e.property === expectedError.property);
        expect(matchingError).toBeDefined();

        if (expectedError.message) {
            expect(matchingError?.message).toContain(expectedError.message);
        }
    }

    return error;
}

/**
 * Assert that a database table exists
 */
export function expectTableExists(db: Database, tableName: string): void {
    const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);

    expect(result).toBeDefined();
    expect((result as { name: string }).name).toBe(tableName);
}

/**
 * Assert that a database table has specific columns
 */
export function expectTableHasColumns(db: Database, tableName: string, columns: string[]): void {
    const tableInfo = db.query(`PRAGMA table_info(${tableName})`).all() as Array<{
        name: string;
        type: string;
        notnull: number;
        pk: number;
    }>;

    const columnNames = tableInfo.map((col) => col.name);

    for (const column of columns) {
        expect(columnNames).toContain(column);
    }
}

/**
 * Get count of records in a table
 */
export function getTableCount(db: Database, tableName: string): number {
    const result = db.query(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
    return result.count;
}

/**
 * Assert table has specific record count
 */
export function expectTableCount(db: Database, tableName: string, expectedCount: number): void {
    const actualCount = getTableCount(db, tableName);
    expect(actualCount).toBe(expectedCount);
}

/**
 * Wait for a specific amount of time (useful for testing timestamps)
 */
export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate random test data
 */
export const TestDataGenerator = {
    email: () => `test.${Math.random().toString(36).substring(2)}@example.com`,

    name: () => {
        const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
        return names[Math.floor(Math.random() * names.length)];
    },

    uuid: () => crypto.randomUUID(),

    integer: (min = 1, max = 1000) => Math.floor(Math.random() * (max - min + 1)) + min,

    text: (length = 10) =>
        Math.random()
            .toString(36)
            .substring(2, 2 + length),

    sentence: () => {
        const words = ['quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'the', 'a', 'and'];
        const wordCount = Math.floor(Math.random() * 8) + 3;
        const sentence = [];

        for (let i = 0; i < wordCount; i++) {
            sentence.push(words[Math.floor(Math.random() * words.length)]);
        }

        return sentence.join(' ');
    },

    pastDate: () => {
        const now = Date.now();
        const pastTime = now - Math.random() * 365 * 24 * 60 * 60 * 1000; // Up to 1 year ago
        return new Date(pastTime).toISOString();
    },

    futureDate: () => {
        const now = Date.now();
        const futureTime = now + Math.random() * 365 * 24 * 60 * 60 * 1000; // Up to 1 year ahead
        return new Date(futureTime).toISOString();
    },
};

/**
 * Mock logger that captures log messages for testing
 */
export class TestLogger {
    public debugMessages: Array<{ message: string; meta?: unknown }> = [];
    public infoMessages: Array<{ message: string; meta?: unknown }> = [];
    public warnMessages: Array<{ message: string; meta?: unknown }> = [];
    public errorMessages: Array<{ message: string; meta?: unknown }> = [];

    debug(message: string, meta?: unknown): void {
        this.debugMessages.push({ message, meta });
    }

    info(message: string, meta?: unknown): void {
        this.infoMessages.push({ message, meta });
    }

    warn(message: string, meta?: unknown): void {
        this.warnMessages.push({ message, meta });
    }

    error(message: string, meta?: unknown): void {
        this.errorMessages.push({ message, meta });
    }

    clear(): void {
        this.debugMessages = [];
        this.infoMessages = [];
        this.warnMessages = [];
        this.errorMessages = [];
    }

    getAllMessages(): Array<{ level: string; message: string; meta?: unknown }> {
        return [
            ...this.debugMessages.map((m) => ({ level: 'debug', ...m })),
            ...this.infoMessages.map((m) => ({ level: 'info', ...m })),
            ...this.warnMessages.map((m) => ({ level: 'warn', ...m })),
            ...this.errorMessages.map((m) => ({ level: 'error', ...m })),
        ];
    }
}
