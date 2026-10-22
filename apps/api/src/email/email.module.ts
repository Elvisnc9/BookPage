import { Global, Module } from '@nestjs/common';
import { DepositHoldsService } from '../reminders/deposit-holds.service';
import { RemindersService } from '../reminders/reminders.service';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  providers: [EmailService, NotificationsService, RemindersService, DepositHoldsService],
  exports: [EmailService, NotificationsService],
})
export class EmailModule {}
