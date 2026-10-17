import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaService } from './media.service';
import { MediaController, TemplatesController } from './site.controllers';
import { SiteTemplatesService } from './site-templates.service';

/** Website templates (catalogue + resolution) and uploaded images. */
@Module({
  imports: [AuthModule],
  controllers: [TemplatesController, MediaController],
  providers: [SiteTemplatesService, MediaService],
  exports: [SiteTemplatesService, MediaService],
})
export class SiteModule {}
