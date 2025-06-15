import type { DbLogger } from '../types';

/**
 * Base logger implementation to reduce code duplication
 */
export abstract class BaseLogger implements DbLogger {
    protected abstract log(level: string, message: string, meta?: unknown): void;

    debug(message: string, meta?: unknown): void {
        this.log('DEBUG', message, meta);
    }

    info(message: string, meta?: unknown): void {
        this.log('INFO', message, meta);
    }

    warn(message: string, meta?: unknown): void {
        this.log('WARN', message, meta);
    }

    error(message: string, meta?: unknown): void {
        this.log('ERROR', message, meta);
    }
}
