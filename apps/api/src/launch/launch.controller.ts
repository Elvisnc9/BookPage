import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { isLaunchCheckStep, LAUNCH_CHECKS } from '@bookpage/shared';
import { ClerkAuthGuard, CurrentAuth } from '../auth/clerk-auth.guard';
import { OWNER_LIMITS, OwnerThrottlerGuard } from '../common/throttling';
import type { AuthUser } from '../auth/owners.service';
import { LaunchService } from './launch.service';

/** One step of the launch check, run after the owner publishes. */
@Controller('business/launch-check')
@UseGuards(ClerkAuthGuard, OwnerThrottlerGuard)
@Throttle(OWNER_LIMITS)
export class LaunchController {
  constructor(private readonly launch: LaunchService) {}

  @Get()
  async check(@CurrentAuth() auth: AuthUser, @Query('step') step = '') {
    if (!isLaunchCheckStep(step)) throw new BadRequestException(`step must be one of ${LAUNCH_CHECKS.join(', ')}`);
    return { check: await this.launch.check(auth.userId, step) };
  }
}
