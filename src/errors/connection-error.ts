import { BunSqliteOrmError } from './bun-sqlite-orm-error';

export class ConnectionError extends BunSqliteOrmError {
    public readonly databasePath: string;
    public readonly connectionType: 'initialization' | 'query' | 'transaction';

    constructor(message: string, databasePath: string, connectionType: 'initialization' | 'query' | 'transaction') {
        super(message);
        this.databasePath = databasePath;
        this.connectionType = connectionType;
    }
}
