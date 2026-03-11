import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MaxLength } from 'class-validator';

export const USER_ROLES = ['owner', 'manager', 'agent'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export class CreateUserDto {
  @ApiProperty({ example: 'newuser@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'New User' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: USER_ROLES, example: 'agent' })
  @IsString()
  @IsIn(USER_ROLES)
  role: UserRole;
}
