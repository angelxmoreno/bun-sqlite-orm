import { BunSqliteOrmError } from './bun-sqlite-orm-error';

export class ConfigurationError extends BunSqliteOrmError {
    public readonly configKey?: string;
    public readonly configValue?: unknown;

    constructor(message: string, configKey?: string, configValue?: unknown, entityName?: string) {
        super(message, entityName);
        this.configKey = configKey;
        this.configValue = configValue;
    }
}
