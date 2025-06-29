export abstract class BunSqliteOrmError extends Error {
    public readonly entityName?: string;
    public readonly timestamp: Date;

    constructor(message: string, entityName?: string) {
        super(message);
        this.name = this.constructor.name;
        this.entityName = entityName;
        this.timestamp = new Date();
    }
}
