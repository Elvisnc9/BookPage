import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { BusinessModule } from './business/business.module';
import { throttlersFor, TOO_MANY_ATTEMPTS } from './common/throttling';
import { CONFIG, type Config } from './config';
import { ConfigModule } from './config.module';
import { EmailModule } from './email/email.module';
import { HealthController } from './health/health.controller';
import { LaunchModule } from './launch/launch.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    // One set of rate limits for the whole API (see common/throttling.ts).
    ThrottlerModule.forRootAsync({
      inject: [CONFIG],
      useFactory: (config: Config) => ({ throttlers: throttlersFor(config), errorMessage: TOO_MANY_ATTEMPTS }),
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    BusinessModule,
    PublicModule,
    BillingModule,
    LaunchModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
