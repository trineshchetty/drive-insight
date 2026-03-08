import {
  EventSubscriber,
  EntitySubscriberInterface,
  BeforeQueryEvent,
} from 'typeorm';

/**
 * TenantSubscriber - Automatic tenant filtering for all queries
 *
 * Defense-in-Depth Layer 3: ORM-level tenant isolation
 * - Layer 1: PostgreSQL RLS policies
 * - Layer 2: TenantContextInterceptor (sets session variables)
 * - Layer 3: TypeORM Global Query Filters (THIS)
 *
 * Automatically adds WHERE tenant_id = :tenantId to all SELECT queries
 * on entities with a tenant_id column.
 *
 * NOTE: This subscriber is DISABLED for now because it requires proper
 * implementation of RequestContext integration. When enabled, it will
 * read tenant_id from AsyncLocalStorage and auto-filter all queries.
 *
 * TODO: Enable this subscriber when RequestContext is fully integrated
 * and tested with the API request flow.
 */
@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  /**
   * Listen to all entities with a tenant_id column
   */
  listenTo() {
    return Object; // Apply to all entities
  }

  /**
   * Called before entity is loaded from database
   * Automatically adds tenant_id filter to WHERE clause
   */
  beforeQuery(_event: BeforeQueryEvent<any>) {
    // DISABLED: Uncomment when RequestContext is integrated
    // const { RequestContext } = require('../../apps/api/src/common/context/request-context');
    // const tenantId = RequestContext.getCurrentTenantId();
    //
    // if (tenantId && event.query && event.query.expressionMap) {
    //   const metadata = event.query.expressionMap.mainAlias?.metadata;
    //   if (metadata && metadata.hasColumn('tenant_id')) {
    //     event.query.andWhere('tenant_id = :tenantId', { tenantId });
    //   }
    // }
  }
}
