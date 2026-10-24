import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicModule } from '../public/public.module';
import { LaunchController } from './launch.controller';
import { LaunchService } from './launch.service';

@Module({
  imports: [AuthModule, PublicModule],
  controllers: [LaunchController],
  providers: [LaunchService],
})
export class LaunchModule {}
