import { beforeEach, describe, expect, jest, test } from 'bun:test';
import {
    DEFAULT_DATE_CONFIG,
    type DateStorageFormat,
    createDate,
    createUTCDate,
    dateToStorage,
    datesEqual,
    getDateConfig,
    hasTimezoneInfo,
    isSQLiteTimestampFormat,
    migrateISOStringToStorage,
    now,
    nowAsStorage,
    parseUTC,
    setDateConfig,
    storageToDate,
    toISOString,
    validateTimezoneAwareness,
} from '../../../src/utils/date-utils';

describe('DateUtils', () => {
    // Reset config before each test
    beforeEach(() => {
        setDateConfig(DEFAULT_DATE_CONFIG);
    });

    describe('Configuration', () => {
        test('should have default configuration', () => {
            const config = getDateConfig();
            expect(config.storageFormat).toBe('iso-string');
            expect(config.warnOnAmbiguousTimezone).toBe(true);
            expect(config.enforceUTC).toBe(false);
        });

        test('should allow partial configuration updates', () => {
            setDateConfig({ storageFormat: 'iso-string' });
            const config = getDateConfig();
            expect(config.storageFormat).toBe('iso-string');
            expect(config.warnOnAmbiguousTimezone).toBe(true); // Should remain unchanged
        });

        test('should allow full configuration override', () => {
            setDateConfig({
                storageFormat: 'unix-seconds',
                warnOnAmbiguousTimezone: false,
                enforceUTC: true,
            });
            const config = getDateConfig();
            expect(config.storageFormat).toBe('unix-seconds');
            expect(config.warnOnAmbiguousTimezone).toBe(false);
            expect(config.enforceUTC).toBe(true);
        });
    });

    describe('Timezone Awareness', () => {
        test('should detect timezone information in date strings', () => {
            expect(hasTimezoneInfo('2024-01-01T12:00:00Z')).toBe(true);
            expect(hasTimezoneInfo('2024-01-01T12:00:00z')).toBe(true);
            expect(hasTimezoneInfo('2024-01-01T12:00:00+05:00')).toBe(true);
            expect(hasTimezoneInfo('2024-01-01T12:00:00-03:30')).toBe(true);
            expect(hasTimezoneInfo('2024-01-01T12:00:00+0000')).toBe(true);
            expect(hasTimezoneInfo('2024-01-01T12:00:00-0500')).toBe(true);
        });

        test('should detect lack of timezone information', () => {
            expect(hasTimezoneInfo('2024-01-01T12:00:00')).toBe(false);
            expect(hasTimezoneInfo('2024-01-01')).toBe(false);
            expect(hasTimezoneInfo('2024-01-01 12:00:00')).toBe(false);
        });

        test('should warn about ambiguous timezone strings', () => {
            const originalWarn = console.warn;
            const mockWarn = jest.fn();
            console.warn = mockWarn;

            validateTimezoneAwareness('2024-01-01T12:00:00');
            expect(mockWarn).toHaveBeenCalledWith(
                '[bun-sqlite-orm Date Warning]',
                expect.stringContaining('lacks timezone information')
            );

            console.warn = originalWarn;
        });

        test('should not warn about timezone-aware strings', () => {
            const originalWarn = console.warn;
            const mockWarn = jest.fn();
            console.warn = mockWarn;

            validateTimezoneAwareness('2024-01-01T12:00:00Z');
            expect(mockWarn).not.toHaveBeenCalled();

            console.warn = originalWarn;
        });

        test('should detect SQLite timestamp format', () => {
            expect(isSQLiteTimestampFormat('2024-01-01 12:00:00')).toBe(true);
            expect(isSQLiteTimestampFormat('2024-12-31 23:59:59')).toBe(true);
            expect(isSQLiteTimestampFormat('2024-01-01T12:00:00')).toBe(false);
            expect(isSQLiteTimestampFormat('2024-01-01 12:00:00Z')).toBe(false);
            expect(isSQLiteTimestampFormat('2024-01-01')).toBe(false);
        });

        test('should not warn about SQLite timestamp format', () => {
            const originalWarn = console.warn;
            const mockWarn = jest.fn();
            console.warn = mockWarn;

            validateTimezoneAwareness('2024-01-01 12:00:00');
            expect(mockWarn).not.toHaveBeenCalled();

            console.warn = originalWarn;
        });

        test('should throw error when enforceUTC is true and string lacks timezone', () => {
            setDateConfig({ enforceUTC: true });

            expect(() => {
                validateTimezoneAwareness('2024-01-01T12:00:00');
            }).toThrow('lacks timezone information');
        });

        test('should disable warnings when warnOnAmbiguousTimezone is false', () => {
            setDateConfig({ warnOnAmbiguousTimezone: false });
            const originalWarn = console.warn;
            const mockWarn = jest.fn();
            console.warn = mockWarn;

            validateTimezoneAwareness('2024-01-01T12:00:00');
            expect(mockWarn).not.toHaveBeenCalled();

            console.warn = originalWarn;
        });
    });

    describe('Date Storage Conversion', () => {
        const testDate = new Date('2024-01-01T12:00:00.123Z');
        const expectedUnixMs = testDate.getTime();
        const expectedUnixSeconds = Math.floor(expectedUnixMs / 1000);
        const expectedISO = testDate.toISOString();

        test('should convert date to unix milliseconds', () => {
            setDateConfig({ storageFormat: 'unix-ms' });
            expect(dateToStorage(testDate)).toBe(expectedUnixMs);
        });

        test('should convert date to unix seconds', () => {
            setDateConfig({ storageFormat: 'unix-seconds' });
            expect(dateToStorage(testDate)).toBe(expectedUnixSeconds);
        });

        test('should convert date to ISO string', () => {
            setDateConfig({ storageFormat: 'iso-string' });
            expect(dateToStorage(testDate)).toBe(expectedISO);
        });

        test('should throw error for invalid date', () => {
            expect(() => dateToStorage(new Date('invalid'))).toThrow('Invalid Date object');
        });

        test('should throw error for non-date input', () => {
            expect(() => dateToStorage('not a date' as unknown as Date)).toThrow('Invalid Date object');
        });
    });

    describe('Storage to Date Conversion', () => {
        const testDate = new Date('2024-01-01T12:00:00.123Z');
        const unixMs = testDate.getTime();
        const unixSeconds = Math.floor(unixMs / 1000);
        const isoString = testDate.toISOString();

        test('should convert unix milliseconds to date', () => {
            const result = storageToDate(unixMs);
            expect(result.getTime()).toBe(testDate.getTime());
        });

        test('should convert unix seconds to date', () => {
            const result = storageToDate(unixSeconds);
            expect(result.getTime()).toBe(unixSeconds * 1000);
        });

        test('should convert ISO string to date', () => {
            const originalWarn = console.warn;
            const mockWarn = jest.fn();
            console.warn = mockWarn;
            const result = storageToDate(isoString);
            expect(result.getTime()).toBe(testDate.getTime());
            console.warn = originalWarn;
        });

        test('should handle ambiguous string with warning', () => {
            const originalWarn = console.warn;
            const mockWarn = jest.fn();
            console.warn = mockWarn;
            const result = storageToDate('2024-01-01T12:00:00');
            expect(result).toBeInstanceOf(Date);
            expect(mockWarn).toHaveBeenCalled();
            console.warn = originalWarn;
        });

        test('should handle SQLite timestamp format as UTC', () => {
            const originalWarn = console.warn;
            const mockWarn = jest.fn();
            console.warn = mockWarn;
            const result = storageToDate('2024-01-01 12:00:00');
            expect(result).toBeInstanceOf(Date);
            expect(result.toISOString()).toBe('2024-01-01T12:00:00.000Z');
            expect(mockWarn).not.toHaveBeenCalled(); // No warning for SQLite format
            console.warn = originalWarn;
        });

        test('should throw error for null/undefined', () => {
            expect(() => storageToDate(null as unknown as string)).toThrow('Cannot convert null/undefined');
            expect(() => storageToDate(undefined as unknown as string)).toThrow('Cannot convert null/undefined');
        });

        test('should throw error for invalid string', () => {
            expect(() => storageToDate('invalid date')).toThrow(); // Accept any error for invalid dates
        });

        test('should throw error for unsupported type', () => {
            expect(() => storageToDate(true as unknown as string)).toThrow('Cannot convert value of type boolean');
        });
    });

    describe('Date Creation', () => {
        test('should create date from Date object (clone)', () => {
            const original = new Date('2024-01-01T12:00:00Z');
            const result = createDate(original);
            expect(result.getTime()).toBe(original.getTime());
            expect(result).not.toBe(original); // Should be a clone
        });

        test('should create date from unix timestamp', () => {
            const timestamp = Date.now();
            const result = createDate(timestamp);
            expect(result.getTime()).toBe(timestamp);
        });

        test('should create date from timezone-aware string', () => {
            const originalWarn = console.warn;
            const mockWarn = jest.fn();
            console.warn = mockWarn;
            const result = createDate('2024-01-01T12:00:00Z');
            expect(result.toISOString()).toBe('2024-01-01T12:00:00.000Z');
            expect(mockWarn).not.toHaveBeenCalled();
            console.warn = originalWarn;
        });

        test('should create date from ambiguous string with warning', () => {
            const originalWarn = console.warn;
            const mockWarn = jest.fn();
            console.warn = mockWarn;
            const result = createDate('2024-01-01T12:00:00');
            expect(result).toBeInstanceOf(Date);
            expect(mockWarn).toHaveBeenCalled();
            console.warn = originalWarn;
        });

        test('should assume UTC when requested', () => {
            const originalWarn = console.warn;
            const mockWarn = jest.fn();
            console.warn = mockWarn;
            const result1 = createDate('2024-01-01T12:00:00', true);
            const result2 = createDate('2024-01-01', true);

            expect(result1.toISOString()).toBe('2024-01-01T12:00:00.000Z');
            expect(result2.toISOString()).toBe('2024-01-01T00:00:00.000Z');
            expect(mockWarn).not.toHaveBeenCalled(); // No warning when assumeUTC=true
            console.warn = originalWarn;
        });

        test('should throw error for invalid input', () => {
            expect(() => createDate({} as unknown as string)).toThrow('Cannot create Date from input');
        });
    });

    describe('Utility Functions', () => {
        test('now() should return current date', () => {
            const before = Date.now();
            const result = now();
            const after = Date.now();

            expect(result.getTime()).toBeGreaterThanOrEqual(before);
            expect(result.getTime()).toBeLessThanOrEqual(after);
        });

        test('nowAsStorage() should return current time in storage format', () => {
            setDateConfig({ storageFormat: 'unix-ms' });
            const result = nowAsStorage();
            expect(typeof result).toBe('number');
            expect(result).toBeCloseTo(Date.now(), -2); // Within 100ms
        });

        test('createUTCDate should create UTC date', () => {
            const result = createUTCDate(2024, 1, 15, 12, 30, 45, 123);
            expect(result.getUTCFullYear()).toBe(2024);
            expect(result.getUTCMonth()).toBe(0); // January (0-based)
            expect(result.getUTCDate()).toBe(15);
            expect(result.getUTCHours()).toBe(12);
            expect(result.getUTCMinutes()).toBe(30);
            expect(result.getUTCSeconds()).toBe(45);
            expect(result.getUTCMilliseconds()).toBe(123);
        });

        test('parseUTC should parse string as UTC', () => {
            const result = parseUTC('2024-01-01T12:00:00');
            expect(result.toISOString()).toBe('2024-01-01T12:00:00.000Z');
        });

        test('toISOString should format date as ISO', () => {
            const date = new Date('2024-01-01T12:00:00.123Z');
            expect(toISOString(date)).toBe('2024-01-01T12:00:00.123Z');
        });

        test('datesEqual should compare dates correctly', () => {
            const date1 = new Date('2024-01-01T12:00:00Z');
            const date2 = new Date('2024-01-01T12:00:00Z');
            const date3 = new Date('2024-01-01T12:00:01Z');

            expect(datesEqual(date1, date2)).toBe(true);
            expect(datesEqual(date1, date3)).toBe(false);
            expect(datesEqual(date1, null)).toBe(false);
            expect(datesEqual(null, null)).toBe(true);
            expect(datesEqual(undefined, undefined)).toBe(true);
        });

        test('migrateISOStringToStorage should convert ISO to storage format', () => {
            setDateConfig({ storageFormat: 'unix-ms' });
            const isoString = '2024-01-01T12:00:00.123Z';
            const result = migrateISOStringToStorage(isoString);
            expect(result).toBe(new Date(isoString).getTime());
        });
    });

    describe('Round-trip Consistency', () => {
        test('should maintain consistency across all storage formats', () => {
            const testDate = new Date('2024-01-01T12:00:00.123Z');
            const storageFormats: DateStorageFormat[] = ['unix-ms', 'unix-seconds', 'iso-string'];

            for (const format of storageFormats) {
                setDateConfig({ storageFormat: format, warnOnAmbiguousTimezone: false });

                const stored = dateToStorage(testDate);
                const restored = storageToDate(stored);

                if (format === 'unix-seconds') {
                    // Unix seconds loses millisecond precision
                    expect(Math.floor(restored.getTime() / 1000)).toBe(Math.floor(testDate.getTime() / 1000));
                } else {
                    expect(restored.getTime()).toBe(testDate.getTime());
                }
            }
        });

        test('should handle edge case dates correctly', () => {
            const edgeCases = [
                new Date(0), // Unix epoch
                new Date('1970-01-01T00:00:00.001Z'), // Just after epoch
                new Date('2038-01-19T03:14:07.999Z'), // Near 32-bit timestamp limit
                new Date('2024-02-29T23:59:59.999Z'), // Leap year
            ];

            setDateConfig({ storageFormat: 'unix-ms', warnOnAmbiguousTimezone: false });

            for (const testDate of edgeCases) {
                const stored = dateToStorage(testDate);
                const restored = storageToDate(stored);
                expect(restored.getTime()).toBe(testDate.getTime());
            }
        });
    });
});
