/**
 * Date utilities for consistent timezone-safe date handling in TypeBunOrm
 *
 * Addresses timezone issues by:
 * 1. Providing explicit timezone-aware date conversion
 * 2. Supporting multiple storage formats (unix timestamp, ISO string)
 * 3. Validating date inputs for consistency
 * 4. Offering utilities for common date operations
 */

/**
 * Supported date storage formats in SQLite
 */
export type DateStorageFormat = 'unix-ms' | 'unix-seconds' | 'iso-string';

/**
 * Configuration for date handling behavior
 */
export interface DateConfig {
    /** How dates should be stored in the database */
    storageFormat: DateStorageFormat;
    /** Whether to warn about timezone-ambiguous date strings */
    warnOnAmbiguousTimezone: boolean;
    /** Whether to enforce UTC-only date operations */
    enforceUTC: boolean;
}

/**
 * Default date configuration - uses ISO string for backward compatibility
 * Users can opt into unix timestamps for better timezone safety
 */
export const DEFAULT_DATE_CONFIG: DateConfig = {
    storageFormat: 'iso-string',
    warnOnAmbiguousTimezone: true,
    enforceUTC: false,
};

/**
 * Global date configuration - can be overridden by users
 */
let globalDateConfig: DateConfig = { ...DEFAULT_DATE_CONFIG };

/**
 * Set global date handling configuration
 */
export function setDateConfig(config: Partial<DateConfig>): void {
    globalDateConfig = { ...globalDateConfig, ...config };
}

/**
 * Get current date configuration
 */
export function getDateConfig(): DateConfig {
    return { ...globalDateConfig };
}

/**
 * Check if a date string has timezone information
 */
export function hasTimezoneInfo(dateString: string): boolean {
    return /[Zz]$|[+-]\d{2}:\d{2}$|[+-]\d{4}$/.test(dateString.trim());
}

/**
 * Check if a date string is in SQLite CURRENT_TIMESTAMP format (YYYY-MM-DD HH:MM:SS)
 */
export function isSQLiteTimestampFormat(dateString: string): boolean {
    return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString.trim());
}

/**
 * Validate that a date string is timezone-safe
 */
export function validateTimezoneAwareness(dateString: string): void {
    // SQLite CURRENT_TIMESTAMP format is a special case - we know it's UTC
    if (isSQLiteTimestampFormat(dateString)) {
        return; // SQLite timestamps are safe to parse as UTC
    }

    if (!hasTimezoneInfo(dateString)) {
        const message = `Date string "${dateString}" lacks timezone information. This may cause inconsistent behavior across timezones. Consider using ISO format with timezone: "${new Date(dateString).toISOString()}"`;

        if (globalDateConfig.warnOnAmbiguousTimezone) {
            console.warn('[TypeBunOrm Date Warning]', message);
        }

        if (globalDateConfig.enforceUTC) {
            throw new Error(`[TypeBunOrm] ${message}`);
        }
    }
}

/**
 * Convert a Date object to the configured storage format
 */
export function dateToStorage(date: Date): string | number {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new Error('Invalid Date object provided to dateToStorage');
    }

    switch (globalDateConfig.storageFormat) {
        case 'unix-ms':
            return date.getTime();
        case 'unix-seconds':
            return Math.floor(date.getTime() / 1000);
        case 'iso-string':
            return date.toISOString();
        default:
            throw new Error(`Unsupported date storage format: ${globalDateConfig.storageFormat}`);
    }
}

/**
 * Convert a stored value back to a Date object
 */
export function storageToDate(value: string | number): Date {
    if (value === null || value === undefined) {
        throw new Error('Cannot convert null/undefined to Date');
    }

    let date: Date;

    if (typeof value === 'number') {
        // Handle unix timestamps
        // Use a more sophisticated heuristic: if value is less than Jan 1, 2001 in milliseconds,
        // it's probably seconds (unless it's a very small millisecond value from epoch)
        const jan2001Ms = 978307200000; // Jan 1, 2001 in milliseconds
        if (value > 0 && value < jan2001Ms && value >= 86400) {
            // Likely seconds (but not too small values like 1ms from epoch)
            date = new Date(value * 1000);
        } else {
            // Likely milliseconds or very small values from epoch
            date = new Date(value);
        }
    } else if (typeof value === 'string') {
        // Handle ISO strings and other string formats
        validateTimezoneAwareness(value);

        // Special handling for SQLite CURRENT_TIMESTAMP format
        if (isSQLiteTimestampFormat(value)) {
            // SQLite CURRENT_TIMESTAMP is in UTC, so parse as UTC
            date = new Date(`${value}Z`); // Append Z to treat as UTC
        } else {
            date = new Date(value);
        }
    } else {
        throw new Error(`Cannot convert value of type ${typeof value} to Date: ${value}`);
    }

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date value: ${value}`);
    }

    return date;
}

/**
 * Create a Date from a potentially ambiguous input with explicit timezone handling
 */
export function createDate(input: string | number | Date, assumeUTC = false): Date {
    if (input instanceof Date) {
        return new Date(input.getTime()); // Clone the date
    }

    if (typeof input === 'number') {
        return new Date(input);
    }

    if (typeof input === 'string') {
        // If no timezone info and assumeUTC is true, append 'Z'
        if (!hasTimezoneInfo(input) && assumeUTC) {
            // Handle common formats
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?$/.test(input)) {
                return new Date(`${input}Z`);
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
                return new Date(`${input}T00:00:00.000Z`);
            }
        }

        validateTimezoneAwareness(input);
        return new Date(input);
    }

    throw new Error(`Cannot create Date from input: ${input}`);
}

/**
 * Get the current time as a Date object (utility for defaults)
 */
export function now(): Date {
    return new Date();
}

/**
 * Get the current time in the configured storage format
 */
export function nowAsStorage(): string | number {
    return dateToStorage(now());
}

/**
 * Create a UTC date from year, month, day, etc. (safer than Date constructor)
 */
export function createUTCDate(
    year: number,
    month: number,
    day = 1,
    hours = 0,
    minutes = 0,
    seconds = 0,
    milliseconds = 0
): Date {
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds));
}

/**
 * Parse a date string with explicit UTC assumption
 */
export function parseUTC(dateString: string): Date {
    return createDate(dateString, true);
}

/**
 * Format a date as an ISO string (always UTC)
 */
export function toISOString(date: Date): string {
    return date.toISOString();
}

/**
 * Check if two dates represent the same instant in time
 */
export function datesEqual(date1: Date | null | undefined, date2: Date | null | undefined): boolean {
    if (date1 === date2) return true;
    if (!date1 || !date2) return false;
    return date1.getTime() === date2.getTime();
}

/**
 * Migrate existing ISO string data to the new storage format
 */
export function migrateISOStringToStorage(isoString: string): string | number {
    const date = new Date(isoString);
    return dateToStorage(date);
}
