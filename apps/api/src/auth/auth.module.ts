import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { OriginGuard } from './origin.guard';
import { OwnersService } from './owners.service';

@Module({
  controllers: [AuthController],
  providers: [OwnersService, ClerkAuthGuard, { provide: APP_GUARD, useClass: OriginGuard }],
  exports: [OwnersService, ClerkAuthGuard],
})
export class AuthModule {}
