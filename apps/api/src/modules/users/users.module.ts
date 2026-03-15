import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import {
  ResendEmailService,
  TRANSACTIONAL_EMAIL_SERVICE,
} from './transactional-email.service';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    ResendEmailService,
    {
      provide: TRANSACTIONAL_EMAIL_SERVICE,
      useExisting: ResendEmailService,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
