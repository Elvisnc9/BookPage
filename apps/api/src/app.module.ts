import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { BusinessModule } from './business/business.module';
import { ConfigModule } from './config.module';
import { EmailModule } from './email/email.module';
import { HealthController } from './health/health.controller';
import { LaunchModule } from './launch/launch.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), PrismaModule, EmailModule, AuthModule, BusinessModule, PublicModule, BillingModule, LaunchModule],
  controllers: [HealthController],
})
export class AppModule {}
