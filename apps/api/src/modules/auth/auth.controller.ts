import { Controller, Post, Body, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CompletePasswordChangeDto } from './dto/complete-password-change.dto';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public() // Skip auth guard for login endpoint
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, JWT returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('complete-password-change')
  @ApiOperation({ summary: 'Complete the forced first-login password change' })
  @ApiResponse({
    status: 200,
    description: 'Password updated and user activated successfully',
  })
  @ApiResponse({ status: 400, description: 'Password change not required' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completePasswordChange(
    @Body() completePasswordChangeDto: CompletePasswordChangeDto,
    @Request() req: any,
  ) {
    return this.authService.completePasswordChange(
      req.user.id,
      completePasswordChangeDto.newPassword,
      req.queryRunner,
    );
  }
}
