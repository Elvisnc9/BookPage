import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import {
  MEDIA_MAX_BYTES,
  type BusinessPatch,
  businessPatchSchema,
  type HoursInput,
  hoursSchema,
  publishSchema,
  type RulesPatch,
  rulesPatchSchema,
  type ServiceInput,
  servicesSchema,
  type StaffInput,
  staffSchema,
} from '@bookpage/shared';
import { CurrentAuth, SessionGuard } from '../auth/session.guard';
import type { SessionUser } from '../auth/session.service';
import { ZodPipe } from '../common/zod.pipe';
import { readBody } from '../site/media';
import { BusinessService } from './business.service';

/** The signed-in owner's business. Used by onboarding (autosave) and the dashboard. */
@Controller('business')
@UseGuards(SessionGuard)
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Get()
  async get(@CurrentAuth() auth: SessionUser) {
    return { business: await this.business.get(auth.userId) };
  }

  @Patch()
  patch(@CurrentAuth() auth: SessionUser, @Body(new ZodPipe(businessPatchSchema)) body: BusinessPatch) {
    return this.business.patch(auth.userId, body);
  }

  @Put('hours')
  hours(@CurrentAuth() auth: SessionUser, @Body(new ZodPipe(hoursSchema)) body: HoursInput) {
    return this.business.putHours(auth.userId, body);
  }

  @Put('services')
  services(@CurrentAuth() auth: SessionUser, @Body(new ZodPipe(servicesSchema)) body: ServiceInput[]) {
    return this.business.putServices(auth.userId, body);
  }

  @Put('staff')
  staff(@CurrentAuth() auth: SessionUser, @Body(new ZodPipe(staffSchema)) body: StaffInput) {
    return this.business.putStaff(auth.userId, body);
  }

  @Patch('rules')
  rules(@CurrentAuth() auth: SessionUser, @Body(new ZodPipe(rulesPatchSchema)) body: RulesPatch) {
    return this.business.patchRules(auth.userId, body);
  }

  /** Raw image body, already resized in the browser. `kind` picks the slot; `targetId` the service or person. */
  @Post('media')
  @HttpCode(200)
  async upload(
    @CurrentAuth() auth: SessionUser,
    @Req() req: Request,
    @Query('kind') kind = '',
    @Query('targetId') targetId?: string,
    @Query('width') width?: string,
    @Query('height') height?: string,
  ) {
    const bytes = await readBody(req, MEDIA_MAX_BYTES);
    return this.business.uploadMedia(auth.userId, { kind, targetId, width: Number(width) || undefined, height: Number(height) || undefined, bytes });
  }

  @Delete('media/:id')
  removeMedia(@CurrentAuth() auth: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.business.removeMedia(auth.userId, id);
  }

  @Get('slug-available')
  async slugAvailable(@CurrentAuth() auth: SessionUser, @Query('slug') slug = '') {
    const value = slug.trim().toLowerCase();
    return { slug: value, available: await this.business.slugAvailable(auth.userId, value) };
  }

  @Post('publish')
  @HttpCode(200)
  publish(@CurrentAuth() auth: SessionUser, @Body(new ZodPipe(publishSchema)) body: { slug: string }) {
    return this.business.publish(auth.userId, body.slug);
  }
}
