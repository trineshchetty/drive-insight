import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MaxLength } from 'class-validator';
import { USER_ROLES, UserRole } from './create-user.dto';

export class InviteUserDto {
  @ApiProperty({ example: 'newagent@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'New Agent' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: USER_ROLES, example: 'agent' })
  @IsString()
  @IsIn(USER_ROLES)
  role: UserRole;
}
