import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { In, QueryRunner } from 'typeorm';
import { AgentProfile, User } from '@drive-insight/database';
import {
  DEFAULT_WORKING_HOURS,
  type UserAccountStatus,
} from '@drive-insight/types';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import {
  TRANSACTIONAL_EMAIL_SERVICE,
  TransactionalEmailService,
} from './transactional-email.service';

interface AuthenticatedUserContext {
  id: string;
  tenant_id: string;
  role: string;
  email: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly supabaseAdminService: SupabaseAdminService,
    @Inject(TRANSACTIONAL_EMAIL_SERVICE)
    private readonly emailService: TransactionalEmailService,
  ) {}

  /**
   * Find all users for current tenant using RLS-enabled queryRunner
   * @param queryRunner - QueryRunner with tenant context set by TenantContextInterceptor
   */
  async findAllForTenant(queryRunner: QueryRunner) {
    if (!queryRunner) {
      throw new Error(
        'QueryRunner not available - TenantContextInterceptor may not be configured',
      );
    }

    // Use queryRunner.manager to execute queries with RLS session variables
    const users = await queryRunner.manager.find(User, {
      select: [
        'id',
        'email',
        'name',
        'role',
        'tenant_id',
        'account_status',
        'must_change_password',
        'invited_at',
        'activated_at',
        'disabled_at',
        'created_at',
      ],
      order: { created_at: 'DESC' },
    });

    return users;
  }

  /**
   * Create a new user (owner/manager only)
   * @param createUserDto - User data
   * @param tenantId - Current tenant ID from authenticated user context
   * @param queryRunner - QueryRunner with tenant context
   */
  async createUser(
    createUserDto: CreateUserDto,
    tenantId: string,
    queryRunner: QueryRunner,
  ) {
    if (!queryRunner) {
      throw new Error('QueryRunner not available');
    }

    const user = queryRunner.manager.create(User, {
      ...createUserDto,
      email: createUserDto.email.trim().toLowerCase(),
      tenant_id: tenantId,
      account_status: 'active',
      must_change_password: false,
      activated_at: new Date(),
    });
    const savedUser = await queryRunner.manager.save(user);

    return savedUser;
  }

  async inviteUser(
    inviteUserDto: InviteUserDto,
    actor: AuthenticatedUserContext,
    queryRunner: QueryRunner,
    request: any,
  ) {
    this.ensureQueryRunner(queryRunner);

    const email = inviteUserDto.email.trim().toLowerCase();
    const existingUser = await queryRunner.manager.findOne(User, {
      where: {
        tenant_id: actor.tenant_id,
        email,
      },
    });

    if (existingUser) {
      if (existingUser.account_status === 'active') {
        throw new ConflictException(
          `User ${email} already exists in this tenant`,
        );
      }

      if (existingUser.account_status === 'disabled') {
        throw new ConflictException(
          `User ${email} is disabled and cannot be reinvited with this endpoint`,
        );
      }

      return this.reissueInvitation(
        existingUser,
        inviteUserDto,
        actor,
        queryRunner,
        request,
      );
    }

    const existingAuthUser = await this.supabaseAdminService.findUserByEmail(
      email,
    );

    if (existingAuthUser) {
      throw new ConflictException(
        `A Supabase Auth account already exists for ${email}`,
      );
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const authUser = await this.supabaseAdminService.createUser({
      email,
      password: temporaryPassword,
      name: inviteUserDto.name,
    });

    try {
      const invitedUser = queryRunner.manager.create(User, {
        id: authUser.id,
        tenant_id: actor.tenant_id,
        email,
        role: inviteUserDto.role,
        name: inviteUserDto.name,
        account_status: 'invited',
        must_change_password: true,
        invited_at: new Date(),
        activated_at: null,
        disabled_at: null,
      });
      const savedUser = await queryRunner.manager.save(invitedUser);

      this.queueInvitationEmail(request, {
        email,
        name: savedUser.name,
        role: savedUser.role,
        temporaryPassword,
        invitedByEmail: actor.email,
      });

      return {
        message: `Invitation sent to ${email}`,
        invite_status: 'sent',
        invite_email_status: 'sent',
        user: this.toUserResponse(savedUser),
      };
    } catch (error) {
      await this.supabaseAdminService.deleteUser(authUser.id).catch(() => {
        return undefined;
      });
      throw error;
    }
  }

  /**
   * Update user profile (owner/manager only)
   * @param id - User ID
   * @param updateUserDto - User data to update
   * @param queryRunner - QueryRunner with tenant context
   */
  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    queryRunner: QueryRunner,
  ) {
    this.ensureQueryRunner(queryRunner);

    const user = await queryRunner.manager.findOne(User, { where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { working_hours, availability, ...userUpdates } = updateUserDto;
    const isProfileUpdate =
      working_hours !== undefined || availability !== undefined;
    const effectiveRole = userUpdates.role ?? user.role;

    if (isProfileUpdate && effectiveRole !== 'agent') {
      throw new BadRequestException(
        'Working hours and availability can only be updated for agent users',
      );
    }

    if (userUpdates.email) {
      userUpdates.email = userUpdates.email.trim().toLowerCase();
    }

    Object.assign(user, userUpdates);
    const updatedUser = await queryRunner.manager.save(user);

    let agentProfile: AgentProfile | null = await queryRunner.manager.findOne(
      AgentProfile,
      { where: { user_id: updatedUser.id } },
    );

    if (isProfileUpdate) {
      agentProfile =
        agentProfile ??
        queryRunner.manager.create(AgentProfile, {
          tenant_id: updatedUser.tenant_id,
          user_id: updatedUser.id,
          working_hours: structuredClone(DEFAULT_WORKING_HOURS),
          availability: true,
        });

      if (working_hours !== undefined) {
        agentProfile.working_hours = working_hours;
      }

      if (availability !== undefined) {
        agentProfile.availability = availability;
      }

      agentProfile = await queryRunner.manager.save(agentProfile);
    }

    return this.toUserResponse(updatedUser, agentProfile);
  }

  /**
   * Delete user (owner only)
   * @param id - User ID
   * @param queryRunner - QueryRunner with tenant context
   */
  async deleteUser(
    id: string,
    actor: AuthenticatedUserContext,
    queryRunner: QueryRunner,
  ) {
    this.ensureQueryRunner(queryRunner);

    if (actor.id === id) {
      throw new BadRequestException(
        'Owners cannot deactivate their own account',
      );
    }

    const user = await queryRunner.manager.findOne(User, { where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.account_status === 'disabled') {
      return {
        message: `User ${id} is already disabled`,
        user: this.toUserResponse(user),
        lead_unassignment: this.getLeadUnassignmentDependency(),
      };
    }

    if (user.role === 'owner') {
      const activeOwnerCount = await queryRunner.manager.count(User, {
        where: {
          tenant_id: actor.tenant_id,
          role: 'owner',
          account_status: In<UserAccountStatus>(['active', 'invited']),
        },
      });

      if (activeOwnerCount <= 1) {
        throw new ConflictException(
          'Cannot disable the last active owner in a tenant',
        );
      }
    }

    await this.supabaseAdminService.disableUser(user.id);

    try {
      user.account_status = 'disabled';
      user.must_change_password = false;
      user.disabled_at = new Date();
      const savedUser = await queryRunner.manager.save(user);

      return {
        message: `User ${id} disabled successfully`,
        user: this.toUserResponse(savedUser),
        lead_unassignment: this.getLeadUnassignmentDependency(),
      };
    } catch (error) {
      await this.supabaseAdminService.enableUser(user.id).catch(() => {
        return undefined;
      });
      throw error;
    }
  }

  private async reissueInvitation(
    existingUser: User,
    inviteUserDto: InviteUserDto,
    actor: AuthenticatedUserContext,
    queryRunner: QueryRunner,
    request: any,
  ) {
    const authUser = await this.supabaseAdminService.findUserByEmail(
      existingUser.email,
    );

    if (!authUser || authUser.id !== existingUser.id) {
      throw new ConflictException(
        `Existing invite for ${existingUser.email} is out of sync with Supabase Auth`,
      );
    }

    const temporaryPassword = this.generateTemporaryPassword();

    await this.supabaseAdminService.enableUser(existingUser.id);
    await this.supabaseAdminService.updatePassword(
      existingUser.id,
      temporaryPassword,
    );

    existingUser.name = inviteUserDto.name;
    existingUser.role = inviteUserDto.role;
    existingUser.account_status = 'invited';
    existingUser.must_change_password = true;
    existingUser.invited_at = new Date();
    existingUser.activated_at = null;
    existingUser.disabled_at = null;

    const savedUser = await queryRunner.manager.save(existingUser);

    this.queueInvitationEmail(request, {
      email: savedUser.email,
      name: savedUser.name,
      role: savedUser.role,
      temporaryPassword,
      invitedByEmail: actor.email,
    });

    return {
      message: `Invitation re-sent to ${savedUser.email}`,
      invite_status: 'resent',
      invite_email_status: 'sent',
      user: this.toUserResponse(savedUser),
    };
  }

  private queueInvitationEmail(
    request: any,
    payload: {
      email: string;
      name: string;
      role: string;
      temporaryPassword: string;
      invitedByEmail: string;
    },
  ) {
    if (!request) {
      throw new Error('Request context not available for post-commit actions');
    }

    if (!Array.isArray(request.postCommitActions)) {
      request.postCommitActions = [];
    }

    request.postCommitActions.push(async () => {
      await this.emailService.sendUserInvitation(payload);
    });
  }

  private toUserResponse(user: User, agentProfile: AgentProfile | null = null) {
    return {
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      role: user.role,
      name: user.name,
      account_status: user.account_status,
      must_change_password: user.must_change_password,
      invited_at: user.invited_at ?? null,
      activated_at: user.activated_at ?? null,
      disabled_at: user.disabled_at ?? null,
      created_at: user.created_at,
      updated_at: user.updated_at,
      agent_profile: agentProfile
        ? {
            id: agentProfile.id,
            user_id: agentProfile.user_id,
            tenant_id: agentProfile.tenant_id,
            working_hours: agentProfile.working_hours,
            availability: agentProfile.availability,
          }
        : null,
    };
  }

  private generateTemporaryPassword(): string {
    return `Tmp-${randomBytes(9).toString('base64url')}1!`;
  }

  private getLeadUnassignmentDependency() {
    return {
      status: 'blocked',
      reason:
        'Lead assignment entities do not exist in the current codebase, so lead unassignment remains an explicit follow-up dependency',
    };
  }

  private ensureQueryRunner(queryRunner: QueryRunner) {
    if (!queryRunner) {
      throw new Error(
        'QueryRunner not available - TenantContextInterceptor may not be configured',
      );
    }
  }
}
