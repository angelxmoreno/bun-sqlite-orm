import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test';
import { ConsoleDbLogger } from '../../../src';
import { NullLogger } from '../../../src';
import { PinoDbLogger } from '../../../src';
import type { DbLogger } from '../../../src';

describe('Logger Classes', () => {
    describe('NullLogger', () => {
        let nullLogger: NullLogger;

        beforeEach(() => {
            nullLogger = new NullLogger();
        });

        test('should implement DbLogger interface', () => {
            expect(nullLogger).toHaveProperty('debug');
            expect(nullLogger).toHaveProperty('info');
            expect(nullLogger).toHaveProperty('warn');
            expect(nullLogger).toHaveProperty('error');

            expect(typeof nullLogger.debug).toBe('function');
            expect(typeof nullLogger.info).toBe('function');
            expect(typeof nullLogger.warn).toBe('function');
            expect(typeof nullLogger.error).toBe('function');
        });

        test('should do nothing when debug is called', () => {
            // Should not throw or have any side effects
            expect(() => nullLogger.debug('test message')).not.toThrow();
            expect(() => nullLogger.debug('test message', { key: 'value' })).not.toThrow();
        });

        test('should do nothing when info is called', () => {
            expect(() => nullLogger.info('test message')).not.toThrow();
            expect(() => nullLogger.info('test message', { key: 'value' })).not.toThrow();
        });

        test('should do nothing when warn is called', () => {
            expect(() => nullLogger.warn('test message')).not.toThrow();
            expect(() => nullLogger.warn('test message', { key: 'value' })).not.toThrow();
        });

        test('should do nothing when error is called', () => {
            expect(() => nullLogger.error('test message')).not.toThrow();
            expect(() => nullLogger.error('test message', { key: 'value' })).not.toThrow();
        });

        test('should handle various message types', () => {
            expect(() => nullLogger.debug('')).not.toThrow();
            expect(() => nullLogger.info('Simple message')).not.toThrow();
            expect(() => nullLogger.warn('Message with unicode: 🚨')).not.toThrow();
            expect(() => nullLogger.error('Message with "quotes" and \'apostrophes\'')).not.toThrow();
        });

        test('should handle various meta types', () => {
            expect(() => nullLogger.debug('test', null)).not.toThrow();
            expect(() => nullLogger.debug('test', undefined)).not.toThrow();
            expect(() => nullLogger.debug('test', 'string meta')).not.toThrow();
            expect(() => nullLogger.debug('test', 42)).not.toThrow();
            expect(() => nullLogger.debug('test', { complex: { nested: 'object' } })).not.toThrow();
            expect(() => nullLogger.debug('test', [1, 2, 3])).not.toThrow();
        });

        test('should be usable as DbLogger type', () => {
            const logger: DbLogger = new NullLogger();

            expect(() => logger.debug('test')).not.toThrow();
            expect(() => logger.info('test')).not.toThrow();
            expect(() => logger.warn('test')).not.toThrow();
            expect(() => logger.error('test')).not.toThrow();
        });
    });

    describe('ConsoleDbLogger', () => {
        let consoleDbLogger: ConsoleDbLogger;
        let originalConsole: Console;

        beforeEach(() => {
            consoleDbLogger = new ConsoleDbLogger();
            originalConsole = global.console;

            // Mock console methods
            global.console = {
                ...originalConsole,
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            };
        });

        afterEach(() => {
            global.console = originalConsole;
        });

        test('should implement DbLogger interface', () => {
            expect(consoleDbLogger).toHaveProperty('debug');
            expect(consoleDbLogger).toHaveProperty('info');
            expect(consoleDbLogger).toHaveProperty('warn');
            expect(consoleDbLogger).toHaveProperty('error');

            expect(typeof consoleDbLogger.debug).toBe('function');
            expect(typeof consoleDbLogger.info).toBe('function');
            expect(typeof consoleDbLogger.warn).toBe('function');
            expect(typeof consoleDbLogger.error).toBe('function');
        });

        test('should call console.debug with formatted message', () => {
            consoleDbLogger.debug('test message');

            expect(console.debug).toHaveBeenCalledWith('[DEBUG] test message', '');
        });

        test('should call console.debug with message and meta', () => {
            const meta = { key: 'value', count: 42 };
            consoleDbLogger.debug('test message', meta);

            expect(console.debug).toHaveBeenCalledWith('[DEBUG] test message', meta);
        });

        test('should call console.info with formatted message', () => {
            consoleDbLogger.info('info message');

            expect(console.info).toHaveBeenCalledWith('[INFO] info message', '');
        });

        test('should call console.info with message and meta', () => {
            const meta = 'string meta';
            consoleDbLogger.info('info message', meta);

            expect(console.info).toHaveBeenCalledWith('[INFO] info message', meta);
        });

        test('should call console.warn with formatted message', () => {
            consoleDbLogger.warn('warning message');

            expect(console.warn).toHaveBeenCalledWith('[WARN] warning message', '');
        });

        test('should call console.warn with message and meta', () => {
            const meta = [1, 2, 3];
            consoleDbLogger.warn('warning message', meta);

            expect(console.warn).toHaveBeenCalledWith('[WARN] warning message', meta);
        });

        test('should call console.error with formatted message', () => {
            consoleDbLogger.error('error message');

            expect(console.error).toHaveBeenCalledWith('[ERROR] error message', '');
        });

        test('should call console.error with message and meta', () => {
            const meta = { error: 'details', code: 500 };
            consoleDbLogger.error('error message', meta);

            expect(console.error).toHaveBeenCalledWith('[ERROR] error message', meta);
        });

        test('should handle empty and special messages', () => {
            consoleDbLogger.debug('');
            consoleDbLogger.info('Message with "quotes"');
            consoleDbLogger.warn('Message with unicode: 🔥');
            consoleDbLogger.error('Multiline\\nmessage');

            expect(console.debug).toHaveBeenCalledWith('[DEBUG] ', '');
            expect(console.info).toHaveBeenCalledWith('[INFO] Message with "quotes"', '');
            expect(console.warn).toHaveBeenCalledWith('[WARN] Message with unicode: 🔥', '');
            expect(console.error).toHaveBeenCalledWith('[ERROR] Multiline\\nmessage', '');
        });

        test('should handle various meta types', () => {
            // biome-ignore lint/suspicious/noExplicitAny: Mock object needs dynamic methods
            const debugMock = console.debug as any;
            debugMock.mockClear(); // Clear previous calls

            consoleDbLogger.debug('test1', null);
            consoleDbLogger.debug('test2', undefined);
            consoleDbLogger.debug('test3', 0);
            consoleDbLogger.debug('test4', false);
            consoleDbLogger.debug('test5', '');

            expect(debugMock).toHaveBeenNthCalledWith(1, '[DEBUG] test1', ''); // null becomes ''
            expect(debugMock).toHaveBeenNthCalledWith(2, '[DEBUG] test2', '');
            expect(debugMock).toHaveBeenNthCalledWith(3, '[DEBUG] test3', ''); // 0 becomes ''
            expect(debugMock).toHaveBeenNthCalledWith(4, '[DEBUG] test4', ''); // false becomes ''
            expect(debugMock).toHaveBeenNthCalledWith(5, '[DEBUG] test5', ''); // '' becomes ''
        });

        test('should use empty string for undefined meta', () => {
            consoleDbLogger.debug('test');
            consoleDbLogger.info('test');
            consoleDbLogger.warn('test');
            consoleDbLogger.error('test');

            expect(console.debug).toHaveBeenCalledWith('[DEBUG] test', '');
            expect(console.info).toHaveBeenCalledWith('[INFO] test', '');
            expect(console.warn).toHaveBeenCalledWith('[WARN] test', '');
            expect(console.error).toHaveBeenCalledWith('[ERROR] test', '');
        });

        test('should be usable as DbLogger type', () => {
            const logger: DbLogger = new ConsoleDbLogger();

            logger.debug('debug test', { meta: 'debug' });
            logger.info('info test', { meta: 'info' });
            logger.warn('warn test', { meta: 'warn' });
            logger.error('error test', { meta: 'error' });

            expect(console.debug).toHaveBeenCalledWith('[DEBUG] debug test', { meta: 'debug' });
            expect(console.info).toHaveBeenCalledWith('[INFO] info test', { meta: 'info' });
            expect(console.warn).toHaveBeenCalledWith('[WARN] warn test', { meta: 'warn' });
            expect(console.error).toHaveBeenCalledWith('[ERROR] error test', { meta: 'error' });
        });
    });

    describe('PinoDbLogger', () => {
        let originalConsole: Console;

        beforeEach(() => {
            originalConsole = global.console;

            // Mock console methods
            global.console = {
                ...originalConsole,
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            };
        });

        afterEach(() => {
            global.console = originalConsole;
        });

        test('should implement DbLogger interface', () => {
            const pinoLogger = new PinoDbLogger();

            expect(pinoLogger).toHaveProperty('debug');
            expect(pinoLogger).toHaveProperty('info');
            expect(pinoLogger).toHaveProperty('warn');
            expect(pinoLogger).toHaveProperty('error');

            expect(typeof pinoLogger.debug).toBe('function');
            expect(typeof pinoLogger.info).toBe('function');
            expect(typeof pinoLogger.warn).toBe('function');
            expect(typeof pinoLogger.error).toBe('function');
        });

        test('should show warning about pino implementation in constructor', () => {
            new PinoDbLogger();

            expect(console.warn).toHaveBeenCalledWith(
                'PinoDbLogger is not fully implemented yet. Install pino as a peer dependency.'
            );
        });

        test('should create with default options', () => {
            const pinoLogger = new PinoDbLogger();

            // Should not throw
            expect(() => pinoLogger.debug('test')).not.toThrow();
        });

        test('should create with custom options', () => {
            const options = {
                writeToFile: true,
                fileName: 'app.log',
                level: 'info' as const,
            };

            const pinoLogger = new PinoDbLogger(options);

            // Should not throw
            expect(() => pinoLogger.info('test')).not.toThrow();
        });

        test('should call console.debug with formatted message (fallback implementation)', () => {
            const pinoLogger = new PinoDbLogger();
            pinoLogger.debug('debug message');

            expect(console.debug).toHaveBeenCalledWith('[DEBUG] debug message', '');
        });

        test('should call console.debug with meta (fallback implementation)', () => {
            const pinoLogger = new PinoDbLogger();
            const meta = { key: 'value' };
            pinoLogger.debug('debug message', meta);

            expect(console.debug).toHaveBeenCalledWith('[DEBUG] debug message', meta);
        });

        test('should call console.info with formatted message (fallback implementation)', () => {
            const pinoLogger = new PinoDbLogger();
            pinoLogger.info('info message');

            expect(console.info).toHaveBeenCalledWith('[INFO] info message', '');
        });

        test('should call console.warn with formatted message (fallback implementation)', () => {
            const pinoLogger = new PinoDbLogger();
            pinoLogger.warn('warning message');

            expect(console.warn).toHaveBeenCalledWith('[WARN] warning message', '');
        });

        test('should call console.error with formatted message (fallback implementation)', () => {
            const pinoLogger = new PinoDbLogger();
            pinoLogger.error('error message');

            expect(console.error).toHaveBeenCalledWith('[ERROR] error message', '');
        });

        test('should handle various options configurations', () => {
            const configs = [
                {},
                { writeToFile: false },
                { fileName: 'custom.log' },
                { level: 'debug' as const },
                { writeToFile: true, fileName: 'test.log', level: 'error' as const },
            ];

            for (const config of configs) {
                expect(() => new PinoDbLogger(config)).not.toThrow();
            }
        });

        test('should be usable as DbLogger type', () => {
            const logger: DbLogger = new PinoDbLogger({ level: 'debug' });

            logger.debug('debug test');
            logger.info('info test');
            logger.warn('warn test');
            logger.error('error test');

            expect(console.debug).toHaveBeenCalledWith('[DEBUG] debug test', '');
            expect(console.info).toHaveBeenCalledWith('[INFO] info test', '');
            expect(console.warn).toHaveBeenCalledWith('[WARN] warn test', '');
            expect(console.error).toHaveBeenCalledWith('[ERROR] error test', '');
        });

        test('should handle meta parameter correctly (fallback implementation)', () => {
            const pinoLogger = new PinoDbLogger();

            // biome-ignore lint/suspicious/noExplicitAny: Mock object needs dynamic methods
            const debugMock = console.debug as any;
            // biome-ignore lint/suspicious/noExplicitAny: Mock object needs dynamic methods
            const infoMock = console.info as any;
            // biome-ignore lint/suspicious/noExplicitAny: Mock object needs dynamic methods
            const warnMock = console.warn as any;
            // biome-ignore lint/suspicious/noExplicitAny: Mock object needs dynamic methods
            const errorMock = console.error as any;

            debugMock.mockClear();
            infoMock.mockClear();
            warnMock.mockClear();
            errorMock.mockClear();

            pinoLogger.debug('test1', null);
            pinoLogger.info('test2', undefined);
            pinoLogger.warn('test3', { complex: 'object' });
            pinoLogger.error('test4', 'string meta');

            expect(debugMock).toHaveBeenCalledWith('[DEBUG] test1', ''); // null becomes ''
            expect(infoMock).toHaveBeenCalledWith('[INFO] test2', '');
            expect(warnMock).toHaveBeenCalledWith('[WARN] test3', { complex: 'object' });
            expect(errorMock).toHaveBeenCalledWith('[ERROR] test4', 'string meta');
        });
    });

    describe('Logger Interface Compliance', () => {
        test('all loggers should implement the same interface', () => {
            const loggers: DbLogger[] = [new NullLogger(), new ConsoleDbLogger(), new PinoDbLogger()];

            for (const logger of loggers) {
                expect(logger).toHaveProperty('debug');
                expect(logger).toHaveProperty('info');
                expect(logger).toHaveProperty('warn');
                expect(logger).toHaveProperty('error');

                expect(typeof logger.debug).toBe('function');
                expect(typeof logger.info).toBe('function');
                expect(typeof logger.warn).toBe('function');
                expect(typeof logger.error).toBe('function');
            }
        });

        test('all loggers should handle the same method signatures', () => {
            const loggers: DbLogger[] = [new NullLogger(), new ConsoleDbLogger(), new PinoDbLogger()];

            for (const logger of loggers) {
                expect(() => logger.debug('message')).not.toThrow();
                expect(() => logger.debug('message', { meta: 'object' })).not.toThrow();
                expect(() => logger.info('message')).not.toThrow();
                expect(() => logger.info('message', 'string meta')).not.toThrow();
                expect(() => logger.warn('message')).not.toThrow();
                expect(() => logger.warn('message', 42)).not.toThrow();
                expect(() => logger.error('message')).not.toThrow();
                expect(() => logger.error('message', null)).not.toThrow();
            }
        });
    });
});
