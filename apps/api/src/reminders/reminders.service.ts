import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../email/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const HOUR = 60 * 60 * 1000;
/** Don't remind about something starting very soon; the customer just booked or is on their way. */
const MIN_LEAD = 2 * HOUR;
const BATCH = 200;

/**
 * The day-before reminder. Every 15 minutes, confirmed bookings starting in the
 * next 24 hours get one reminder, if the customer asked for it and booked at
 * least a day ahead (otherwise the confirmation was recent enough).
 *
 * Each booking is claimed with a conditional update before sending, so two API
 * instances (or an overlapping run) can never send the same reminder twice.
 */
@Injectable()
export class RemindersService {
  private readonly log = new Logger('Reminders');
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('*/15 * * * *', { name: 'day-before-reminders', disabled: process.env.REMINDERS_ENABLED === 'false' })
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const { sent, failed } = await this.run(new Date());
      if (sent || failed) this.log.log(`Reminders: ${sent} sent, ${failed} failed`);
    } catch (error) {
      this.log.error(`Reminder run failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      this.running = false;
    }
  }

  /** One pass. Exposed for tests and manual runs. */
  async run(now: Date): Promise<{ sent: number; failed: number }> {
    const due = await this.prisma.booking.findMany({
      where: {
        status: 'confirmed',
        reminderSentAt: null,
        startsAt: { gt: new Date(now.getTime() + MIN_LEAD), lte: new Date(now.getTime() + 24 * HOUR) },
        customer: { remindersConsentAt: { not: null }, email: { not: null } },
      },
      select: { id: true, startsAt: true, createdAt: true },
      orderBy: { startsAt: 'asc' },
      take: BATCH,
    });

    let sent = 0;
    let failed = 0;
    for (const booking of due) {
      // Booked less than a day ahead: the confirmation email is the reminder.
      if (booking.startsAt.getTime() - booking.createdAt.getTime() < 24 * HOUR) continue;

      const claimed = await this.prisma.booking.updateMany({
        where: { id: booking.id, reminderSentAt: null },
        data: { reminderSentAt: now },
      });
      if (claimed.count !== 1) continue;

      try {
        await this.notifications.reminder(booking.id);
        sent++;
      } catch (error) {
        failed++;
        // Release the claim so the next run retries; the idempotency key stops duplicates.
        await this.prisma.booking.updateMany({ where: { id: booking.id, reminderSentAt: now }, data: { reminderSentAt: null } });
        this.log.warn(`Reminder for ${booking.id} failed: ${error instanceof Error ? error.message : error}`);
      }
    }
    return { sent, failed };
  }
}
