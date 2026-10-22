import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../email/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const BATCH = 100;
export const HOLD_EXPIRED_REASON = 'Deposit not received in time';

/**
 * Releases deposit holds nobody confirmed. Every 5 minutes, pending bookings
 * whose deposit deadline has passed (and weren't marked paid) are cancelled,
 * which frees the slot, and both sides are emailed.
 *
 * Each booking is released with a conditional update, so an owner tapping
 * "Deposit received" at the same moment wins or loses cleanly, never both.
 */
@Injectable()
export class DepositHoldsService {
  private readonly log = new Logger('DepositHolds');
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('*/5 * * * *', { name: 'deposit-holds', disabled: process.env.REMINDERS_ENABLED === 'false' })
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const released = await this.run(new Date());
      if (released) this.log.log(`Deposit holds: ${released} released`);
    } catch (error) {
      this.log.error(`Deposit hold run failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      this.running = false;
    }
  }

  /** One pass. Exposed for tests and manual runs. */
  async run(now: Date): Promise<number> {
    const due = await this.prisma.booking.findMany({
      where: { status: 'pending', depositPaidAt: null, depositDueAt: { lte: now } },
      select: { id: true },
      orderBy: { depositDueAt: 'asc' },
      take: BATCH,
    });

    let released = 0;
    for (const { id } of due) {
      const done = await this.prisma.booking.updateMany({
        where: { id, status: 'pending', depositPaidAt: null },
        data: { status: 'cancelled', cancelledAt: now, cancelReason: HOLD_EXPIRED_REASON },
      });
      if (done.count !== 1) continue;
      released++;
      await this.notifications.dispatch('hold expired emails', () => this.notifications.holdExpired(id));
    }
    return released;
  }
}
