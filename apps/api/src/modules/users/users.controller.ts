import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Request,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users in current tenant (RLS enforced)' })
  @ApiResponse({ status: 200, description: 'List of users in tenant' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Request() req: any) {
    // Use queryRunner from TenantContextInterceptor
    return this.usersService.findAllForTenant(req.queryRunner);
  }

  @Get('whoami')
  @ApiOperation({ summary: 'Get current user info from JWT' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async whoami(@Request() req: any) {
    return {
      user: req.user,
      message: 'Authenticated successfully',
    };
  }

  @Post()
  @Roles('owner', 'manager')
  @ApiOperation({ summary: 'Create a new user (owner/manager only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires owner or manager role',
  })
  async createUser(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    return this.usersService.createUser(
      createUserDto,
      req.user.tenant_id,
      req.queryRunner,
    );
  }

  @Post('invite')
  @Roles('owner')
  @ApiOperation({ summary: 'Invite a tenant user (owner only)' })
  @ApiResponse({ status: 201, description: 'Invite sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires owner role',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - duplicate or unrecoverable invite state',
  })
  async inviteUser(@Body() inviteUserDto: InviteUserDto, @Request() req: any) {
    return this.usersService.inviteUser(
      inviteUserDto,
      req.user,
      req.queryRunner,
      req,
    );
  }

  @Patch(':id')
  @Roles('owner')
  @ApiOperation({ summary: 'Update user profile and availability (owner only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires owner role',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    return this.usersService.updateUser(id, updateUserDto, req.queryRunner);
  }

  @Delete(':id')
  @Roles('owner')
  @ApiOperation({ summary: 'Delete user (owner only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires owner role',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    return this.usersService.deleteUser(id, req.user, req.queryRunner);
  }
}
