import type { DbLogger } from '../types';

export class NullLogger implements DbLogger {
    debug(_message: string, _meta?: unknown): void {
        // Intentionally do nothing - this is a null logger
    }
    info(_message: string, _meta?: unknown): void {
        // Intentionally do nothing - this is a null logger
    }
    warn(_message: string, _meta?: unknown): void {
        // Intentionally do nothing - this is a null logger
    }
    error(_message: string, _meta?: unknown): void {
        // Intentionally do nothing - this is a null logger
    }
}
