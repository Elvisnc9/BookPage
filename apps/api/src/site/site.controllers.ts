import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { MediaService } from './media.service';
import { SiteTemplatesService } from './site-templates.service';

/** The template gallery for onboarding: active, validated templates in order. */
@Controller('templates')
@UseGuards(ClerkAuthGuard)
export class TemplatesController {
  constructor(private readonly templates: SiteTemplatesService) {}

  @Get()
  async list() {
    return { templates: await this.templates.list() };
  }
}

/**
 * Image bytes for booking pages and the owner app (the web app proxies
 * /media/{id} on every host). Ids are never reused, so responses are immutable.
 */
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const asset = await this.media.read(id);
    if (!asset) throw new NotFoundException();
    res
      .status(200)
      .set({
        'content-type': asset.contentType,
        'content-length': String(asset.byteSize),
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox",
      })
      .end(Buffer.from(asset.data));
  }
}
