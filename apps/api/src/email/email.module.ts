import { Global, Module } from '@nestjs/common';
import { RemindersService } from '../reminders/reminders.service';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  providers: [EmailService, NotificationsService, RemindersService],
  exports: [EmailService, NotificationsService],
})
export class EmailModule {}
