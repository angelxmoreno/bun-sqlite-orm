import { describe, expect, test } from 'bun:test';
import {
    BunSqliteOrmError,
    ConfigurationError,
    ConnectionError,
    ConstraintViolationError,
    DatabaseError,
    EntityNotFoundError,
    MigrationError,
    QueryError,
    TransactionError,
    TypeConversionError,
    ValidationError,
} from '../../../src/errors';

describe('Enhanced Error System', () => {
    describe('BunSqliteOrmError (Base Class)', () => {
        // Create a concrete implementation for testing
        class TestOrmError extends BunSqliteOrmError {}

        test('should create base error with message only', () => {
            const error = new TestOrmError('Test error message');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(BunSqliteOrmError);
            expect(error.name).toBe('TestOrmError');
            expect(error.message).toBe('Test error message');
            expect(error.entityName).toBeUndefined();
            expect(error.timestamp).toBeInstanceOf(Date);
        });

        test('should create base error with entity name', () => {
            const error = new TestOrmError('Test error message', 'User');

            expect(error.entityName).toBe('User');
            expect(error.message).toBe('Test error message');
        });

        test('should set timestamp on creation', () => {
            const beforeCreation = new Date();
            const error = new TestOrmError('Test');
            const afterCreation = new Date();

            expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
            expect(error.timestamp.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
        });
    });

    describe('TransactionError', () => {
        test('should create transaction error with all properties', () => {
            const error = new TransactionError('Transaction failed', 'commit', 'tx123');

            expect(error).toBeInstanceOf(BunSqliteOrmError);
            expect(error).toBeInstanceOf(TransactionError);
            expect(error.name).toBe('TransactionError');
            expect(error.message).toBe('Transaction failed');
            expect(error.operation).toBe('commit');
            expect(error.transactionId).toBe('tx123');
        });

        test('should create transaction error without transaction ID', () => {
            const error = new TransactionError('Begin failed', 'begin');

            expect(error.operation).toBe('begin');
            expect(error.transactionId).toBeUndefined();
        });

        test('should handle all operation types', () => {
            const operations: Array<'begin' | 'commit' | 'rollback' | 'savepoint'> = [
                'begin',
                'commit',
                'rollback',
                'savepoint',
            ];

            for (const operation of operations) {
                const error = new TransactionError(`${operation} failed`, operation);
                expect(error.operation).toBe(operation);
            }
        });
    });

    describe('ConnectionError', () => {
        test('should create connection error with all properties', () => {
            const error = new ConnectionError('Failed to connect to database', '/path/to/db.sqlite', 'initialization');

            expect(error).toBeInstanceOf(BunSqliteOrmError);
            expect(error).toBeInstanceOf(ConnectionError);
            expect(error.name).toBe('ConnectionError');
            expect(error.message).toBe('Failed to connect to database');
            expect(error.databasePath).toBe('/path/to/db.sqlite');
            expect(error.connectionType).toBe('initialization');
        });

        test('should handle all connection types', () => {
            const connectionTypes: Array<'initialization' | 'query' | 'transaction'> = [
                'initialization',
                'query',
                'transaction',
            ];

            for (const connectionType of connectionTypes) {
                const error = new ConnectionError('Connection failed', '/db.sqlite', connectionType);
                expect(error.connectionType).toBe(connectionType);
            }
        });
    });

    describe('ConstraintViolationError', () => {
        test('should create constraint violation error with all properties', () => {
            const error = new ConstraintViolationError(
                'Unique constraint violation',
                'unique',
                'User',
                'email',
                'test@example.com'
            );

            expect(error).toBeInstanceOf(BunSqliteOrmError);
            expect(error).toBeInstanceOf(ConstraintViolationError);
            expect(error.name).toBe('ConstraintViolationError');
            expect(error.message).toBe('Unique constraint violation');
            expect(error.constraintType).toBe('unique');
            expect(error.entityName).toBe('User');
            expect(error.columnName).toBe('email');
            expect(error.value).toBe('test@example.com');
        });

        test('should create constraint violation error with minimal properties', () => {
            const error = new ConstraintViolationError('Not null constraint violation', 'not_null');

            expect(error.constraintType).toBe('not_null');
            expect(error.entityName).toBeUndefined();
            expect(error.columnName).toBeUndefined();
            expect(error.value).toBeUndefined();
        });

        test('should handle all constraint types', () => {
            const constraintTypes: Array<'unique' | 'foreign_key' | 'check' | 'not_null'> = [
                'unique',
                'foreign_key',
                'check',
                'not_null',
            ];

            for (const constraintType of constraintTypes) {
                const error = new ConstraintViolationError(`${constraintType} violation`, constraintType);
                expect(error.constraintType).toBe(constraintType);
            }
        });
    });

    describe('ConfigurationError', () => {
        test('should create configuration error with all properties', () => {
            const error = new ConfigurationError(
                'Invalid configuration',
                'database.host',
                'invalid-host',
                'DataSource'
            );

            expect(error).toBeInstanceOf(BunSqliteOrmError);
            expect(error).toBeInstanceOf(ConfigurationError);
            expect(error.name).toBe('ConfigurationError');
            expect(error.message).toBe('Invalid configuration');
            expect(error.configKey).toBe('database.host');
            expect(error.configValue).toBe('invalid-host');
            expect(error.entityName).toBe('DataSource');
        });

        test('should create configuration error with minimal properties', () => {
            const error = new ConfigurationError('Configuration missing');

            expect(error.configKey).toBeUndefined();
            expect(error.configValue).toBeUndefined();
            expect(error.entityName).toBeUndefined();
        });
    });

    describe('MigrationError', () => {
        test('should create migration error with all properties', () => {
            const error = new MigrationError('Migration failed', 'up', '20230101_create_users');

            expect(error).toBeInstanceOf(BunSqliteOrmError);
            expect(error).toBeInstanceOf(MigrationError);
            expect(error.name).toBe('MigrationError');
            expect(error.message).toBe('Migration failed');
            expect(error.direction).toBe('up');
            expect(error.migrationName).toBe('20230101_create_users');
        });

        test('should create migration error without migration name', () => {
            const error = new MigrationError('Rollback failed', 'down');

            expect(error.direction).toBe('down');
            expect(error.migrationName).toBeUndefined();
        });

        test('should handle both migration directions', () => {
            const upError = new MigrationError('Up failed', 'up');
            const downError = new MigrationError('Down failed', 'down');

            expect(upError.direction).toBe('up');
            expect(downError.direction).toBe('down');
        });
    });

    describe('QueryError', () => {
        test('should create query error with all properties', () => {
            const sql = 'SELECT * FROM users WHERE id = ?';
            const parameters = [1];
            const error = new QueryError('Query execution failed', 'User', sql, parameters);

            expect(error).toBeInstanceOf(BunSqliteOrmError);
            expect(error).toBeInstanceOf(QueryError);
            expect(error.name).toBe('QueryError');
            expect(error.message).toBe('Query execution failed');
            expect(error.entityName).toBe('User');
            expect(error.sql).toBe(sql);
            expect(error.parameters).toEqual(parameters);
        });

        test('should create query error with minimal properties', () => {
            const error = new QueryError('Query failed');

            expect(error.entityName).toBeUndefined();
            expect(error.sql).toBeUndefined();
            expect(error.parameters).toBeUndefined();
        });
    });

    describe('TypeConversionError', () => {
        test('should create type conversion error with all properties', () => {
            const error = new TypeConversionError(
                'Cannot convert value to expected type',
                'age',
                'number',
                'not-a-number',
                'User'
            );

            expect(error).toBeInstanceOf(BunSqliteOrmError);
            expect(error).toBeInstanceOf(TypeConversionError);
            expect(error.name).toBe('TypeConversionError');
            expect(error.message).toBe('Cannot convert value to expected type');
            expect(error.propertyName).toBe('age');
            expect(error.expectedType).toBe('number');
            expect(error.actualValue).toBe('not-a-number');
            expect(error.entityName).toBe('User');
        });

        test('should create type conversion error without entity name', () => {
            const error = new TypeConversionError('Type conversion failed', 'status', 'boolean', 'maybe');

            expect(error.propertyName).toBe('status');
            expect(error.expectedType).toBe('boolean');
            expect(error.actualValue).toBe('maybe');
            expect(error.entityName).toBeUndefined();
        });
    });

    describe('Error Inheritance and Base Class Integration', () => {
        test('all errors should inherit from BunSqliteOrmError', () => {
            const errors = [
                new TransactionError('test', 'begin'),
                new ConnectionError('test', '/db', 'query'),
                new ConstraintViolationError('test', 'unique'),
                new ConfigurationError('test'),
                new MigrationError('test', 'up'),
                new QueryError('test'),
                new TypeConversionError('test', 'prop', 'string', 123),
                // Updated existing errors
                new DatabaseError('test', new Error('original')),
                new EntityNotFoundError('User', { id: 1 }),
                new ValidationError('User', []),
            ];

            for (const error of errors) {
                expect(error).toBeInstanceOf(BunSqliteOrmError);
                expect(error).toBeInstanceOf(Error);
                expect(error.timestamp).toBeInstanceOf(Date);
            }
        });

        test('should be catchable as BunSqliteOrmError base class', () => {
            const errors = [
                new TransactionError('transaction failed', 'commit'),
                new ConnectionError('connection failed', '/db', 'initialization'),
                new DatabaseError('database failed', new Error('original')),
            ];

            for (const error of errors) {
                try {
                    throw error;
                } catch (e) {
                    expect(e).toBeInstanceOf(BunSqliteOrmError);
                    expect(e).toBeInstanceOf(Error);
                    if (e instanceof BunSqliteOrmError) {
                        expect(e.timestamp).toBeInstanceOf(Date);
                    }
                }
            }
        });

        test('enhanced errors should have entity context when provided', () => {
            const errorWithEntity = new DatabaseError('test', new Error('original'), 'User', 'create');
            const errorWithoutEntity = new DatabaseError('test', new Error('original'));

            expect(errorWithEntity.entityName).toBe('User');
            expect(errorWithoutEntity.entityName).toBeUndefined();
        });

        test('EntityNotFoundError should have entity getter', () => {
            const error = new EntityNotFoundError('User', { id: 1 });

            expect(error.entity).toBe('User');
            expect(error.entityName).toBe('User');
            expect(error.criteria).toEqual({ id: 1 });
        });

        test('ValidationError should include entity name in message', () => {
            const error = new ValidationError('User', [{ property: 'email', message: 'Invalid email' }]);

            expect(error.message).toBe('Validation failed for User');
            expect(error.entityName).toBe('User');
        });
    });

    describe('Error Usage Examples', () => {
        test('graceful error handling example', () => {
            const testErrors = [
                new EntityNotFoundError('User', { id: 999 }),
                new ValidationError('User', [{ property: 'email', message: 'Invalid' }]),
                new ConstraintViolationError('Unique constraint', 'unique', 'User', 'email'),
                new TransactionError('Commit failed', 'commit'),
                new Error('Non-ORM error'),
            ];

            for (const error of testErrors) {
                try {
                    throw error;
                } catch (e) {
                    if (e instanceof BunSqliteOrmError) {
                        // All ORM errors can be caught and have timestamp
                        expect(e.timestamp).toBeInstanceOf(Date);

                        if (e instanceof EntityNotFoundError) {
                            expect(e.criteria).toBeDefined();
                        } else if (e instanceof ValidationError) {
                            expect(e.errors).toBeDefined();
                        } else if (e instanceof ConstraintViolationError) {
                            expect(e.constraintType).toBeDefined();
                        }
                    } else {
                        // Non-ORM errors
                        expect(e).toBeInstanceOf(Error);
                        expect((e as Error & { timestamp?: Date }).timestamp).toBeUndefined();
                    }
                }
            }
        });
    });
});
