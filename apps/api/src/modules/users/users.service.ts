import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { User } from '@drive-insight/database';

@Injectable()
export class UsersService {
  constructor() {}

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
      select: ['id', 'email', 'name', 'role', 'tenant_id', 'created_at'],
      order: { created_at: 'DESC' },
    });

    return users;
  }

  /**
   * Create a new user (owner/manager only)
   * @param createUserDto - User data
   * @param queryRunner - QueryRunner with tenant context
   */
  async createUser(createUserDto: any, queryRunner: QueryRunner) {
    if (!queryRunner) {
      throw new Error('QueryRunner not available');
    }

    // Create user entity (tenant_id will be set from PostgreSQL RLS context)
    const user = queryRunner.manager.create(User, createUserDto);
    const savedUser = await queryRunner.manager.save(user);

    return savedUser;
  }

  /**
   * Update user profile (owner/manager only)
   * @param id - User ID
   * @param updateUserDto - User data to update
   * @param queryRunner - QueryRunner with tenant context
   */
  async updateUser(
    id: string,
    updateUserDto: any,
    queryRunner: QueryRunner,
  ) {
    if (!queryRunner) {
      throw new Error('QueryRunner not available');
    }

    const user = await queryRunner.manager.findOne(User, { where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await queryRunner.manager.save(user);

    return updatedUser;
  }

  /**
   * Delete user (owner only)
   * @param id - User ID
   * @param queryRunner - QueryRunner with tenant context
   */
  async deleteUser(id: string, queryRunner: QueryRunner) {
    if (!queryRunner) {
      throw new Error('QueryRunner not available');
    }

    const user = await queryRunner.manager.findOne(User, { where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await queryRunner.manager.remove(user);

    return { message: `User ${id} deleted successfully` };
  }
}
