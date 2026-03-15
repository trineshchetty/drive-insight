import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { WorkingHoursDto } from '@drive-insight/types';
import { USER_ROLES, UserRole } from './create-user.dto';
import { IsWorkingHours } from '../validators/working-hours.validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'updated.user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Updated User' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: USER_ROLES, example: 'agent' })
  @IsOptional()
  @IsString()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: {
      monday: { enabled: true, start: '08:00', end: '17:00' },
      tuesday: { enabled: true, start: '08:00', end: '17:00' },
      wednesday: { enabled: true, start: '08:00', end: '17:00' },
      thursday: { enabled: true, start: '08:00', end: '17:00' },
      friday: { enabled: true, start: '08:00', end: '16:00' },
      saturday: { enabled: false, start: null, end: null },
      sunday: { enabled: false, start: null, end: null },
    },
  })
  @IsOptional()
  @IsWorkingHours()
  working_hours?: WorkingHoursDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  availability?: boolean;
}
