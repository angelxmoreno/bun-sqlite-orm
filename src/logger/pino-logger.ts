import type { DbLogger } from '../types';

export interface PinoLoggerOptions {
    writeToFile?: boolean;
    fileName?: string;
    level?: 'debug' | 'info' | 'warn' | 'error';
}

export class PinoDbLogger implements DbLogger {
    constructor(private options: PinoLoggerOptions = {}) {
        console.warn('PinoDbLogger is not fully implemented yet. Install pino as a peer dependency.');
    }

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
