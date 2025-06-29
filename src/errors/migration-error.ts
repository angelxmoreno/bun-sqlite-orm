import { BunSqliteOrmError } from './bun-sqlite-orm-error';

export class MigrationError extends BunSqliteOrmError {
    public readonly migrationName?: string;
    public readonly direction: 'up' | 'down';

    constructor(message: string, direction: 'up' | 'down', migrationName?: string) {
        super(message);
        this.migrationName = migrationName;
        this.direction = direction;
    }
}
