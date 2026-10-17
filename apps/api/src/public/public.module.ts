import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { SiteModule } from '../site/site.module';
import { PUBLIC_THROTTLERS, PublicThrottlerGuard, TOO_MANY_ATTEMPTS } from './public-throttler.guard';
import { MarketingController } from './marketing.controller';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

// Counters live in memory: fine for one API instance. Move to Redis before scaling out.
@Module({
  imports: [SiteModule, ThrottlerModule.forRoot({ throttlers: PUBLIC_THROTTLERS, errorMessage: TOO_MANY_ATTEMPTS })],
  controllers: [PublicController, MarketingController],
  providers: [PublicService, PublicThrottlerGuard],
})
export class PublicModule {}
