import { Entity } from '../../src/decorators';
import { BaseEntity } from '../../src/entity';

/**
 * Special entities for error testing scenarios.
 *
 * These entities are kept in a separate file to prevent automatic registration
 * with the global MetadataContainer when other mock entities are imported.
 * Only import these when specifically testing error conditions.
 */

// Entity with no columns (causes SQL syntax errors)
@Entity('no_columns_entity')
export class NoColumnsEntity extends BaseEntity {
    // No columns - this will cause "CREATE TABLE ... ()" which is invalid SQL
}
