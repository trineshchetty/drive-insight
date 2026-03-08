import {
  EventSubscriber,
  EntitySubscriberInterface,
  BeforeQueryEvent,
} from 'typeorm';

/**
 * RoleFilterSubscriber - Automatic role-based data filtering
 *
 * Defense-in-Depth Layer 3: ORM-level role-based access control
 * - Layer 1: PostgreSQL RLS policies (role-based)
 * - Layer 2: TenantContextInterceptor (sets session variables + AsyncLocalStorage)
 * - Layer 3: TypeORM Role-Based Query Filters (THIS)
 *
 * Behavior:
 * - Agent role: Only see data assigned to them (leads, conversations, bookings)
 * - Agent role: Only see their own user profile
 * - Owner/Manager roles: See all tenant data (no additional filter beyond tenant_id)
 *
 * This subscriber complements RLS policies - even if developer forgets to
 * filter by assigned_agent_id, this subscriber auto-applies it.
 *
 * NOTE: This subscriber is DISABLED for now because:
 * 1. Lead and Conversation entities don't exist yet (Epic 2)
 * 2. RequestContext needs to be imported from apps/api (cross-package)
 * 3. Needs integration testing with full request flow
 *
 * TODO: Enable this subscriber when:
 * - Lead/Conversation entities are created (Epic 2)
 * - RequestContext is properly exported and importable
 * - Integration tests verify correct filtering
 */
@EventSubscriber()
export class RoleFilterSubscriber implements EntitySubscriberInterface {
  /**
   * Listen to all entities
   */
  listenTo() {
    return Object;
  }

  /**
   * Called before entity is loaded from database
   * Applies role-based filtering for agent users
   */
  beforeQuery(_event: BeforeQueryEvent<any>) {
    // DISABLED: Uncomment when RequestContext is integrated and Lead/Conversation entities exist
    //
    // const { RequestContext } = require('../../apps/api/src/common/context/request-context');
    // const role = RequestContext.getCurrentRole();
    // const userId = RequestContext.getCurrentUserId();
    //
    // // Only apply additional filters for agent role
    // // Owner/Manager see all tenant data (tenant_id filter already applied by TenantSubscriber)
    // if (role !== 'agent') {
    //   return;
    // }
    //
    // if (!event.query || !event.query.expressionMap) {
    //   return;
    // }
    //
    // const metadata = event.query.expressionMap.mainAlias?.metadata;
    // if (!metadata) {
    //   return;
    // }
    //
    // const tableName = metadata.tableName;
    //
    // // Agent can only see leads assigned to them
    // if (tableName === 'leads' && metadata.hasColumn('assigned_agent_id')) {
    //   event.query.andWhere('assigned_agent_id = :userId', { userId });
    // }
    //
    // // Agent can only see conversations assigned to them
    // if (tableName === 'conversations' && metadata.hasColumn('assigned_agent_id')) {
    //   event.query.andWhere('assigned_agent_id = :userId', { userId });
    // }
    //
    // // Agent can only see bookings assigned to them
    // if (tableName === 'bookings' && metadata.hasColumn('assigned_agent_id')) {
    //   event.query.andWhere('assigned_agent_id = :userId', { userId });
    // }
    //
    // // Agent can only read their own user profile
    // if (tableName === 'users' && metadata.hasColumn('id')) {
    //   event.query.andWhere('id = :userId', { userId });
    // }
    //
    // // Agent can only read their own agent profile
    // if (tableName === 'agent_profiles' && metadata.hasColumn('user_id')) {
    //   event.query.andWhere('user_id = :userId', { userId });
    // }
  }
}
