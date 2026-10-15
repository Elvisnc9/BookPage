import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { ConfigModule } from './config.module';
import { EmailModule } from './email/email.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), PrismaModule, EmailModule, AuthModule, BusinessModule, PublicModule],
  controllers: [HealthController],
})
export class AppModule {}
