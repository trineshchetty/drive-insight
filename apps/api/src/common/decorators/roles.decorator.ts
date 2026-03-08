import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles decorator - restricts endpoint access to specific roles
 *
 * @example
 * @Roles('owner', 'manager')
 * @Post('/users')
 * async createUser(@Body() data: CreateUserDto) {
 *   return this.usersService.create(data);
 * }
 *
 * @param roles - One or more roles required to access the endpoint
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
