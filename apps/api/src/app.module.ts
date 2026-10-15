import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { ConfigModule } from './config.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, BusinessModule],
  controllers: [HealthController],
})
export class AppModule {}
