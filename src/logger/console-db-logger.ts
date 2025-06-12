import type { DbLogger } from '../types';

export class ConsoleDbLogger implements DbLogger {
    debug(message: string, meta?: unknown): void {
        console.debug(`[DEBUG] ${message}`, meta || '');
    }

    info(message: string, meta?: unknown): void {
        console.info(`[INFO] ${message}`, meta || '');
    }

    warn(message: string, meta?: unknown): void {
        console.warn(`[WARN] ${message}`, meta || '');
    }

    error(message: string, meta?: unknown): void {
        console.error(`[ERROR] ${message}`, meta || '');
    }
}
