import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { OriginGuard } from './origin.guard';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';

@Module({
  imports: [PassportModule.register({ session: false })],
  controllers: [AuthController],
  providers: [
    SessionService,
    SessionGuard,
    GoogleStrategy,
    { provide: APP_GUARD, useClass: OriginGuard },
  ],
  exports: [SessionService, SessionGuard],
})
export class AuthModule {}
