import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { ConfigModule } from './config.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, BusinessModule, PublicModule],
  controllers: [HealthController],
})
export class AppModule {}
