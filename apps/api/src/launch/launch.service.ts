import { request as httpRequest } from 'node:http';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { LaunchCheck, LaunchCheckStep } from '@bookpage/shared';
import { pageOrigin } from '../email/links';
import { PrismaService } from '../prisma/prisma.service';
import { PublicService } from '../public/public.service';

const TIMEOUT_MS = 8_000;

interface Fetched {
  status: number;
  html: string;
  url: URL;
}

/**
 * The launch check an owner watches right after publishing. Each step looks at the
 * real thing: the page as a customer's browser gets it, and the booking calendar.
 */
@Injectable()
export class LaunchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicPages: PublicService,
  ) {}

  async check(ownerId: string, step: LaunchCheckStep): Promise<LaunchCheck> {
    const b = await this.prisma.business.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      select: { slug: true, publishedAt: true, timezone: true, template: { select: { name: true, slug: true } } },
    });
    if (!b) throw new NotFoundException('Set up your business first');
    if (!b.slug || !b.publishedAt) throw new ConflictException('Publish your page first');
    const slug = b.slug;

    if (step === 'calendar') {
      const { bookable, firstSlot, windowDays } = await this.publicPages.firstOpenTime(slug);
      if (!bookable) return { step, status: 'note', detail: 'Nothing is booked online yet, so customers send you a request instead.' };
      if (!firstSlot) return { step, status: 'fail', detail: `No open times in the next ${windowDays} days. Check your hours and team.` };
      const when = new Intl.DateTimeFormat('en-GB', { timeZone: b.timezone, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(firstSlot));
      return { step, status: 'ok', detail: `Customers can book now. First open time: ${when}.` };
    }

    const page = await fetchPage(`${pageOrigin(slug)}/`).catch(() => null);
    if (!page || page.status !== 200) {
      return { step, status: 'fail', detail: page ? `Your page answered with an error (${page.status}). Try again in a moment.` : 'Your page didn’t answer. Try again in a moment.' };
    }

    switch (step) {
      case 'layout': {
        const fits = /<meta[^>]+name="viewport"[^>]+width=device-width/i.test(page.html);
        const drawn = page.html.includes(`data-template="`);
        if (!fits || !drawn) return { step, status: 'fail', detail: 'Your page loaded, but not as expected. Try again, or contact support.' };
        const name = b.template?.name ?? 'Classic';
        return { step, status: 'ok', detail: `Your ${name} page loads and is set up for phones and desktops.` };
      }
      case 'secure':
        if (page.url.protocol === 'https:') return { step, status: 'ok', detail: `Secured with HTTPS at ${page.url.host}.` };
        return { step, status: 'note', detail: 'Local preview: HTTPS turns on once your page is on the live site.' };
      case 'search': {
        const structured = page.html.includes('application/ld+json');
        const preview = /<meta[^>]+property="og:title"/i.test(page.html);
        if (!structured || !preview) return { step, status: 'fail', detail: 'Search details are missing from your page. Try again, or contact support.' };
        return { step, status: 'ok', detail: 'Google and link previews can read your name, services, hours and address.' };
      }
    }
  }
}

/**
 * GET a page the way a customer's browser would. In development pages live on
 * {slug}.localhost, which Node can't always resolve, so those go to 127.0.0.1 with
 * the right Host header.
 */
export async function fetchPage(href: string): Promise<Fetched> {
  const url = new URL(href);
  if (url.hostname.endsWith('.localhost') || url.hostname === 'localhost') {
    return new Promise((resolve, reject) => {
      const req = httpRequest(
        { host: '127.0.0.1', port: url.port || 80, path: url.pathname + url.search, headers: { host: url.host, accept: 'text/html' }, timeout: TIMEOUT_MS },
        (res) => {
          let html = '';
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => (html += chunk));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, html, url }));
        },
      );
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', reject);
      req.end();
    });
  }
  const res = await fetch(url, { headers: { accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { status: res.status, html: await res.text(), url: new URL(res.url || href) };
}
