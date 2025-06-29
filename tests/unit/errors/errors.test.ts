import { describe, expect, test } from 'bun:test';
import { DatabaseError, EntityNotFoundError, ValidationError } from '../../../src/errors';
import type { ValidationErrorDetail } from '../../../src/errors/validation-error';

describe('Error Classes', () => {
    describe('ValidationError', () => {
        test('should create ValidationError with single error', () => {
            const errors: ValidationErrorDetail[] = [
                {
                    property: 'email',
                    message: 'Invalid email format',
                    value: 'not-an-email',
                },
            ];

            const validationError = new ValidationError('TestEntity', errors);

            expect(validationError).toBeInstanceOf(Error);
            expect(validationError).toBeInstanceOf(ValidationError);
            expect(validationError.name).toBe('ValidationError');
            expect(validationError.message).toBe('Validation failed for TestEntity');
            expect(validationError.errors).toEqual(errors);
            expect(validationError.errors).toHaveLength(1);
        });

        test('should create ValidationError with multiple errors', () => {
            const errors: ValidationErrorDetail[] = [
                {
                    property: 'email',
                    message: 'Invalid email format',
                    value: 'not-an-email',
                },
                {
                    property: 'name',
                    message: 'Name is too short',
                    value: 'a',
                },
                {
                    property: 'age',
                    message: 'Age must be positive',
                    value: -5,
                },
            ];

            const validationError = new ValidationError('TestEntity', errors);

            expect(validationError.errors).toEqual(errors);
            expect(validationError.errors).toHaveLength(3);
        });

        test('should create ValidationError with empty errors array', () => {
            const errors: ValidationErrorDetail[] = [];
            const validationError = new ValidationError('TestEntity', errors);

            expect(validationError.errors).toEqual([]);
            expect(validationError.errors).toHaveLength(0);
        });

        test('should handle errors without value property', () => {
            const errors: ValidationErrorDetail[] = [
                {
                    property: 'name',
                    message: 'Name is required',
                },
            ];

            const validationError = new ValidationError('TestEntity', errors);

            expect(validationError.errors[0].value).toBeUndefined();
            expect(validationError.errors[0].property).toBe('name');
            expect(validationError.errors[0].message).toBe('Name is required');
        });

        test('should handle various value types', () => {
            const errors: ValidationErrorDetail[] = [
                {
                    property: 'stringField',
                    message: 'Invalid string',
                    value: 'test',
                },
                {
                    property: 'numberField',
                    message: 'Invalid number',
                    value: 42,
                },
                {
                    property: 'booleanField',
                    message: 'Invalid boolean',
                    value: true,
                },
                {
                    property: 'objectField',
                    message: 'Invalid object',
                    value: { key: 'value' },
                },
                {
                    property: 'arrayField',
                    message: 'Invalid array',
                    value: [1, 2, 3],
                },
                {
                    property: 'nullField',
                    message: 'Invalid null',
                    value: null,
                },
            ];

            const validationError = new ValidationError('TestEntity', errors);

            expect(validationError.errors).toHaveLength(6);
            expect(validationError.errors[0].value).toBe('test');
            expect(validationError.errors[1].value).toBe(42);
            expect(validationError.errors[2].value).toBe(true);
            expect(validationError.errors[3].value).toEqual({ key: 'value' });
            expect(validationError.errors[4].value).toEqual([1, 2, 3]);
            expect(validationError.errors[5].value).toBeNull();
        });

        test('should be throwable and catchable', () => {
            const errors: ValidationErrorDetail[] = [
                {
                    property: 'email',
                    message: 'Invalid email',
                    value: 'bad-email',
                },
            ];

            expect(() => {
                throw new ValidationError('TestEntity', errors);
            }).toThrow(ValidationError);

            try {
                throw new ValidationError('TestEntity', errors);
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError);
                expect((error as ValidationError).errors).toEqual(errors);
            }
        });
    });

    describe('DatabaseError', () => {
        test('should create DatabaseError with message and original error', () => {
            const originalError = new Error('SQLite error: table does not exist');
            const databaseError = new DatabaseError('Failed to execute query', originalError);

            expect(databaseError).toBeInstanceOf(Error);
            expect(databaseError).toBeInstanceOf(DatabaseError);
            expect(databaseError.name).toBe('DatabaseError');
            expect(databaseError.message).toBe('Failed to execute query');
            expect(databaseError.originalError).toBe(originalError);
        });

        test('should preserve original error details', () => {
            class CustomError extends Error {
                constructor(
                    message: string,
                    public code: number
                ) {
                    super(message);
                    this.name = 'CustomError';
                }
            }

            const originalError = new CustomError('Custom database error', 1001);
            const databaseError = new DatabaseError('Database operation failed', originalError);

            expect(databaseError.originalError).toBeInstanceOf(CustomError);
            expect((databaseError.originalError as CustomError).code).toBe(1001);
            expect(databaseError.originalError.message).toBe('Custom database error');
        });

        test('should handle various error types', () => {
            const typeError = new TypeError('Invalid argument type');
            const syntaxError = new SyntaxError('Invalid SQL syntax');
            const rangeError = new RangeError('Value out of range');

            const dbError1 = new DatabaseError('Type error occurred', typeError);
            const dbError2 = new DatabaseError('Syntax error occurred', syntaxError);
            const dbError3 = new DatabaseError('Range error occurred', rangeError);

            expect(dbError1.originalError).toBeInstanceOf(TypeError);
            expect(dbError2.originalError).toBeInstanceOf(SyntaxError);
            expect(dbError3.originalError).toBeInstanceOf(RangeError);
        });

        test('should be throwable and catchable', () => {
            const originalError = new Error('Original error');
            const databaseError = new DatabaseError('Database failed', originalError);

            expect(() => {
                throw databaseError;
            }).toThrow(DatabaseError);

            try {
                throw databaseError;
            } catch (error) {
                expect(error).toBeInstanceOf(DatabaseError);
                expect((error as DatabaseError).originalError).toBe(originalError);
            }
        });

        test('should handle empty or special messages', () => {
            const originalError = new Error('Original');

            const emptyMessageError = new DatabaseError('', originalError);
            const specialCharsError = new DatabaseError('Error with "quotes" and \'apostrophes\'', originalError);
            const unicodeError = new DatabaseError('Error with unicode: 🚨', originalError);

            expect(emptyMessageError.message).toBe('');
            expect(specialCharsError.message).toBe('Error with "quotes" and \'apostrophes\'');
            expect(unicodeError.message).toBe('Error with unicode: 🚨');
        });
    });

    describe('EntityNotFoundError', () => {
        test('should create EntityNotFoundError with entity name and criteria', () => {
            const criteria = { id: 1 };
            const error = new EntityNotFoundError('User', criteria);

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(EntityNotFoundError);
            expect(error.name).toBe('EntityNotFoundError');
            expect(error.message).toBe('User not found with criteria: {"id":1}');
        });

        test('should handle various criteria types', () => {
            const stringCriteria = 'test-id';
            const numberCriteria = 42;
            const objectCriteria = { name: 'John', age: 30 };
            const arrayCriteria = [1, 2, 3];
            const nullCriteria = null;
            const undefinedCriteria = undefined;

            const error1 = new EntityNotFoundError('User', stringCriteria);
            const error2 = new EntityNotFoundError('Post', numberCriteria);
            const error3 = new EntityNotFoundError('Comment', objectCriteria);
            const error4 = new EntityNotFoundError('Tag', arrayCriteria);
            const error5 = new EntityNotFoundError('Category', nullCriteria);
            const error6 = new EntityNotFoundError('Role', undefinedCriteria);

            expect(error1.message).toBe('User not found with criteria: "test-id"');
            expect(error2.message).toBe('Post not found with criteria: 42');
            expect(error3.message).toBe('Comment not found with criteria: {"name":"John","age":30}');
            expect(error4.message).toBe('Tag not found with criteria: [1,2,3]');
            expect(error5.message).toBe('Category not found with criteria: null');
            expect(error6.message).toBe('Role not found with criteria: undefined');
        });

        test('should handle complex nested criteria', () => {
            const complexCriteria = {
                user: {
                    profile: {
                        settings: {
                            theme: 'dark',
                        },
                    },
                },
                posts: [
                    { id: 1, status: 'published' },
                    { id: 2, status: 'draft' },
                ],
            };

            const error = new EntityNotFoundError('UserProfile', complexCriteria);

            expect(error.message).toContain('UserProfile not found with criteria:');
            expect(error.message).toContain('"theme":"dark"');
            expect(error.message).toContain('"status":"published"');
        });

        test('should handle circular reference in criteria', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Testing circular reference edge case
            const criteria: any = { name: 'test' };
            criteria.self = criteria; // Create circular reference

            // EntityNotFoundError should handle circular references gracefully
            const error = new EntityNotFoundError('Entity', criteria);
            expect(error.message).toBe(
                'Entity not found with criteria: [object with circular reference or non-serializable data]'
            );
        });

        test('should handle special entity names', () => {
            const criteria = { id: 1 };

            const emptyNameError = new EntityNotFoundError('', criteria);
            const specialCharsError = new EntityNotFoundError('User@Entity', criteria);
            const unicodeError = new EntityNotFoundError('用户', criteria);

            expect(emptyNameError.message).toBe(' not found with criteria: {"id":1}');
            expect(specialCharsError.message).toBe('User@Entity not found with criteria: {"id":1}');
            expect(unicodeError.message).toBe('用户 not found with criteria: {"id":1}');
        });

        test('should be throwable and catchable', () => {
            const criteria = { id: 1, name: 'test' };
            const error = new EntityNotFoundError('TestEntity', criteria);

            expect(() => {
                throw error;
            }).toThrow(EntityNotFoundError);

            try {
                throw error;
            } catch (e) {
                expect(e).toBeInstanceOf(EntityNotFoundError);
                expect((e as EntityNotFoundError).message).toContain('TestEntity not found');
                expect((e as EntityNotFoundError).message).toContain('{"id":1,"name":"test"}');
            }
        });
    });

    describe('Error inheritance and instanceof checks', () => {
        test('all custom errors should be instances of Error', () => {
            const validationError = new ValidationError('TestEntity', []);
            const databaseError = new DatabaseError('test', new Error('original'));
            const entityNotFoundError = new EntityNotFoundError('Entity', {});

            expect(validationError).toBeInstanceOf(Error);
            expect(databaseError).toBeInstanceOf(Error);
            expect(entityNotFoundError).toBeInstanceOf(Error);
        });

        test('errors should have correct names for debugging', () => {
            const validationError = new ValidationError('TestEntity', []);
            const databaseError = new DatabaseError('test', new Error('original'));
            const entityNotFoundError = new EntityNotFoundError('Entity', {});

            expect(validationError.name).toBe('ValidationError');
            expect(databaseError.name).toBe('DatabaseError');
            expect(entityNotFoundError.name).toBe('EntityNotFoundError');
        });

        test('should be distinguishable in catch blocks', () => {
            const errors = [
                new ValidationError('TestEntity', [{ property: 'test', message: 'error' }]),
                new DatabaseError('db error', new Error('original')),
                new EntityNotFoundError('Entity', { id: 1 }),
            ];

            for (const error of errors) {
                try {
                    throw error;
                } catch (e) {
                    if (e instanceof ValidationError) {
                        expect(e.errors).toBeDefined();
                    } else if (e instanceof DatabaseError) {
                        expect(e.originalError).toBeDefined();
                    } else if (e instanceof EntityNotFoundError) {
                        expect(e.message).toContain('not found');
                    }
                }
            }
        });
    });
});
