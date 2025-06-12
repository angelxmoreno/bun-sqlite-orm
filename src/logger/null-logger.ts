import type { DbLogger } from '../types';

export class NullLogger implements DbLogger {
    debug(): void {}
    info(): void {}
    warn(): void {}
    error(): void {}
}
