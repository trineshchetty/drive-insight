import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CompletePasswordChangeDto {
  @ApiProperty({
    example: 'UpdatedPassword123!',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword: string;
}
