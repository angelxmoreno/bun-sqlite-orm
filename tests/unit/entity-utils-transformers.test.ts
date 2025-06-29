import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { transformValueForStorage, transformValueFromStorage } from '../../src/entity/entity-utils';
import type { ColumnTransformer } from '../../src/types';
import { resetGlobalMetadata } from '../helpers/test-utils';

describe('Entity Utils - Transformer Functions Unit Tests', () => {
    beforeEach(() => {
        resetGlobalMetadata();
    });

    afterEach(() => {
        resetGlobalMetadata();
    });

    describe('transformValueForStorage', () => {
        test('should handle JSON serialization for json column type', () => {
            const testObject = { name: 'test', age: 30, active: true };
            const result = transformValueForStorage(testObject, 'json');

            expect(result).toBe(JSON.stringify(testObject));
        });

        test('should handle arrays for json column type', () => {
            const testArray = [1, 2, 3, 'test', true];
            const result = transformValueForStorage(testArray, 'json');

            expect(result).toBe(JSON.stringify(testArray));
        });

        test('should handle nested objects for json column type', () => {
            const complexObject = {
                user: {
                    profile: {
                        name: 'John',
                        settings: { theme: 'dark', notifications: true },
                    },
                },
                metadata: { tags: ['admin', 'user'], created: '2023-01-01' },
            };

            const result = transformValueForStorage(complexObject, 'json');
            expect(result).toBe(JSON.stringify(complexObject));
        });

        test('should apply custom transformer before JSON serialization', () => {
            const transformer: ColumnTransformer<{ key: string }, string> = {
                to: (value) => `transformed:${value.key}`,
                from: (value) => ({ key: value.replace('transformed:', '') }),
            };

            const testValue = { key: 'test' };
            const result = transformValueForStorage(testValue, 'json', transformer);

            // Transformer should take precedence over JSON serialization
            expect(result).toBe('transformed:test');
        });

        test('should handle undefined values', () => {
            const result = transformValueForStorage(undefined, 'json');
            expect(result).toBeUndefined();
        });

        test('should handle null values for json type', () => {
            const result = transformValueForStorage(null, 'json');
            expect(result).toBe('null'); // JSON.stringify(null) = 'null'
        });

        test('should handle non-json column types without transformation', () => {
            const result1 = transformValueForStorage('test', 'text');
            expect(result1).toBe('test');

            const result2 = transformValueForStorage(42, 'integer');
            expect(result2).toBe(42);

            const result3 = transformValueForStorage(3.14, 'real');
            expect(result3).toBe(3.14);
        });

        test('should apply custom transformers for non-json types', () => {
            const uppercaseTransformer: ColumnTransformer<string, string> = {
                to: (value) => value.toUpperCase(),
                from: (value) => value.toLowerCase(),
            };

            const result = transformValueForStorage('hello', 'text', uppercaseTransformer);
            expect(result).toBe('HELLO');
        });

        test('should handle transformer errors gracefully', () => {
            const errorTransformer: ColumnTransformer<string, string> = {
                to: () => {
                    throw new Error('Transform error');
                },
                from: (value) => value,
            };

            expect(() => {
                transformValueForStorage('test', 'text', errorTransformer);
            }).toThrow('Transformer error during save: Transform error');
        });

        test('should handle JSON serialization errors', () => {
            // Create an object with circular reference
            const circularObj: Record<string, unknown> = { name: 'test' };
            circularObj.self = circularObj;

            expect(() => {
                transformValueForStorage(circularObj, 'json');
            }).toThrow('JSON serialization error');
        });

        test('should handle Date objects for non-json types', () => {
            const testDate = new Date('2023-06-15T10:30:00Z');

            // Should convert Date to ISO string for storage
            const result = transformValueForStorage(testDate, 'text');
            expect(typeof result).toBe('string');
            expect(result).toBe('2023-06-15T10:30:00.000Z');
        });

        test('should handle boolean values for integer type', () => {
            const result1 = transformValueForStorage(true, 'integer');
            expect(result1).toBe(true);

            const result2 = transformValueForStorage(false, 'integer');
            expect(result2).toBe(false);
        });
    });

    describe('transformValueFromStorage', () => {
        test('should handle JSON deserialization for json column type', () => {
            const jsonString = '{"name":"test","age":30,"active":true}';
            const result = transformValueFromStorage(jsonString, 'json');

            expect(result).toEqual({ name: 'test', age: 30, active: true });
        });

        test('should handle array deserialization for json column type', () => {
            const jsonString = '[1,2,3,"test",true]';
            const result = transformValueFromStorage(jsonString, 'json');

            expect(result).toEqual([1, 2, 3, 'test', true]);
        });

        test('should handle complex nested objects for json column type', () => {
            const complexObject = {
                user: {
                    profile: {
                        name: 'John',
                        settings: { theme: 'dark', notifications: true },
                    },
                },
                metadata: { tags: ['admin', 'user'], created: '2023-01-01' },
            };

            const jsonString = JSON.stringify(complexObject);
            const result = transformValueFromStorage(jsonString, 'json');

            expect(result).toEqual(complexObject);
        });

        test('should apply custom transformer after JSON deserialization', () => {
            const transformer: ColumnTransformer<{ key: string }, string> = {
                to: (value) => `transformed:${value.key}`,
                from: (value) => ({ key: value.replace('transformed:', '') }),
            };

            const storageValue = 'transformed:test';
            const result = transformValueFromStorage(storageValue, 'json', transformer);

            expect(result).toEqual({ key: 'test' });
        });

        test('should prioritize custom transformer over JSON deserialization', () => {
            const transformer: ColumnTransformer<{ key: string }, string> = {
                to: (value) => `custom:${value.key}`,
                from: (value) => ({ key: value.replace('custom:', '') }),
            };

            // Even though this looks like JSON, transformer should take precedence
            const result = transformValueFromStorage('custom:test', 'json', transformer);
            expect(result).toEqual({ key: 'test' });
        });

        test('should handle null and undefined values', () => {
            expect(transformValueFromStorage(null, 'json')).toBeNull();
            expect(transformValueFromStorage(undefined, 'json')).toBeUndefined();
        });

        test('should handle non-json column types without transformation', () => {
            expect(transformValueFromStorage('test', 'text')).toBe('test');
            expect(transformValueFromStorage(42, 'integer')).toBe(42);
            expect(transformValueFromStorage(3.14, 'real')).toBe(3.14);
        });

        test('should apply custom transformers for non-json types', () => {
            const lowercaseTransformer: ColumnTransformer<string, string> = {
                to: (value) => value.toUpperCase(),
                from: (value) => value.toLowerCase(),
            };

            const result = transformValueFromStorage('HELLO', 'text', lowercaseTransformer);
            expect(result).toBe('hello');
        });

        test('should handle transformer errors gracefully', () => {
            const errorTransformer: ColumnTransformer<string, string> = {
                to: (value) => value,
                from: () => {
                    throw new Error('Load error');
                },
            };

            expect(() => {
                transformValueFromStorage('test', 'text', errorTransformer);
            }).toThrow('Transformer error during load: Load error');
        });

        test('should handle malformed JSON gracefully', () => {
            const malformedJson = '{"name": "test", "age":}'; // Invalid JSON

            expect(() => {
                transformValueFromStorage(malformedJson, 'json');
            }).toThrow('JSON deserialization error');
        });

        test('should handle special JSON values', () => {
            expect(transformValueFromStorage('null', 'json')).toBeNull();
            expect(transformValueFromStorage('true', 'json')).toBe(true);
            expect(transformValueFromStorage('false', 'json')).toBe(false);
            expect(transformValueFromStorage('42', 'json')).toBe(42);
            expect(transformValueFromStorage('"string"', 'json')).toBe('string');
        });

        test('should handle empty strings and edge cases', () => {
            // Empty string will cause JSON parse error, which should be thrown
            expect(() => {
                transformValueFromStorage('', 'json');
            }).toThrow('JSON deserialization error');

            // Non-string values should not trigger JSON parsing
            expect(transformValueFromStorage(42, 'json')).toBe(42);
            expect(transformValueFromStorage(true, 'json')).toBe(true);
        });

        test('should maintain type safety with complex transformers', () => {
            interface CustomType {
                id: number;
                name: string;
                tags: string[];
            }

            const customTransformer: ColumnTransformer<CustomType, string> = {
                to: (value: CustomType) => `${value.id}:${value.name}:${value.tags.join(',')}`,
                from: (value: string) => {
                    const [id, name, tagsStr] = value.split(':');
                    return {
                        id: Number(id),
                        name,
                        tags: tagsStr ? tagsStr.split(',') : [],
                    };
                },
            };

            const storageValue = '123:John:admin,user,developer';
            const result = transformValueFromStorage(storageValue, 'text', customTransformer);

            expect(result).toEqual({
                id: 123,
                name: 'John',
                tags: ['admin', 'user', 'developer'],
            });
        });
    });

    describe('Round-trip Consistency', () => {
        test('should maintain consistency for JSON round-trips', () => {
            const originalData = {
                string: 'test',
                number: 42,
                boolean: true,
                array: [1, 2, 3],
                nested: { key: 'value', items: ['a', 'b'] },
                nullValue: null,
            };

            const stored = transformValueForStorage(originalData, 'json');
            const retrieved = transformValueFromStorage(stored, 'json');

            expect(retrieved).toEqual(originalData);
        });

        test('should maintain consistency with custom transformers', () => {
            const dateTransformer: ColumnTransformer<Date, string> = {
                to: (value: Date) => value.toISOString(),
                from: (value: string) => new Date(value),
            };

            const originalDate = new Date('2023-06-15T10:30:00Z');
            const stored = transformValueForStorage(originalDate, 'text', dateTransformer);
            const retrieved = transformValueFromStorage(stored, 'text', dateTransformer);

            expect(retrieved).toEqual(originalDate);
            expect((retrieved as Date).getTime()).toBe(originalDate.getTime());
        });

        test('should handle multiple round-trips consistently', () => {
            const complexData = {
                levels: {
                    level1: {
                        level2: {
                            level3: {
                                data: 'deep nested',
                                array: [{ id: 1, name: 'item1' }],
                            },
                        },
                    },
                },
            };

            let current = complexData;

            // Perform multiple round-trips
            for (let i = 0; i < 5; i++) {
                const stored = transformValueForStorage(current, 'json');
                current = transformValueFromStorage(stored, 'json') as typeof complexData;
            }

            expect(current).toEqual(complexData);
        });
    });
});
