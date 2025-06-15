import { BaseLogger } from './base-logger';

export class ConsoleDbLogger extends BaseLogger {
    protected log(level: string, message: string, meta?: unknown): void {
        const logMethod = console[level.toLowerCase() as keyof Console] as typeof console.log;
        logMethod(`[${level}] ${message}`, meta || '');
    }
}
