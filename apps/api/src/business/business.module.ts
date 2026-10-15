import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { OwnerBookingsController } from './owner-bookings.controller';
import { OwnerBookingsService } from './owner-bookings.service';

@Module({
  imports: [AuthModule],
  controllers: [BusinessController, OwnerBookingsController],
  providers: [BusinessService, OwnerBookingsService],
})
export class BusinessModule {}
