import { Injectable, Logger } from '@nestjs/common';
import type { Email } from './templates';

export interface Outgoing extends Email {
  to: string;
  /** Shown as the sender name, e.g. "Glow Studio via BookPage". */
  fromName?: string;
  replyTo?: string | null;
  /** Resend de-duplicates sends with the same key for 24 h, so a retry never emails twice. */
  idempotencyKey: string;
  /** For logs and Resend tags, e.g. "booking-confirmation". */
  kind: string;
}

/**
 * Sends email through Resend's HTTP API. Without RESEND_API_KEY (local dev,
 * tests) emails are logged and kept in `outbox` instead of being sent.
 */
@Injectable()
export class EmailService {
  private readonly log = new Logger('Email');
  private readonly apiKey = process.env.RESEND_API_KEY || null;
  private readonly fromAddress = process.env.EMAIL_FROM || 'bookings@mail.bookpage.app';
  /** Every email "sent" without an API key, newest last. */
  readonly outbox: Outgoing[] = [];

  get live() {
    return this.apiKey !== null;
  }

  async send(email: Outgoing): Promise<void> {
    const from = `${quoteName(email.fromName ?? 'BookPage')} <${this.fromAddress}>`;

    if (!this.apiKey) {
      this.outbox.push(email);
      this.log.log(`[not sent: no RESEND_API_KEY] ${email.kind} → ${email.to}: ${email.subject}`);
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': email.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        tags: [{ name: 'kind', value: email.kind }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Resend ${res.status} for ${email.kind}: ${detail.slice(0, 300)}`);
    }
    this.log.log(`${email.kind} → ${email.to}`);
  }
}

/** Display names with commas or quotes must be quoted in the From header. */
function quoteName(name: string) {
  const clean = name.replace(/[\r\n"]/g, '').slice(0, 80);
  return /[(),.:;<>@[\]\\]/.test(clean) ? `"${clean}"` : clean;
}
