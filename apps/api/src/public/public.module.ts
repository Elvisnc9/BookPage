import { Module } from '@nestjs/common';
import { SiteModule } from '../site/site.module';
import { PublicThrottlerGuard } from '../common/throttling';
import { MarketingController } from './marketing.controller';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [SiteModule],
  controllers: [PublicController, MarketingController],
  providers: [PublicService, PublicThrottlerGuard],
  exports: [PublicService],
})
export class PublicModule {}
