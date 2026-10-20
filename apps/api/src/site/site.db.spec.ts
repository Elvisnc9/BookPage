// Runs against the real database (pnpm test:db): templates, theme, media and
// publishing over HTTP, the way onboarding drives them.
import { randomUUID } from 'node:crypto';
import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { OwnerBusiness, PublicBusiness, SiteTemplate } from '@bookpage/shared';
import { AppModule } from '../app.module';
import { SessionGuard } from '../auth/session.guard';
import { PrismaService } from '../prisma/prisma.service';

class TestSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const userId = req.headers['x-test-user'];
    if (!userId) return false;
    req.auth = { sessionId: 'test', userId };
    return true;
  }
}

const ORIGIN = 'http://localhost:4321';
// A real 1×1 PNG: the API sniffs bytes, so the test sends a genuine image.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

let app: INestApplication;
let prisma: PrismaService;
let base: string;
let ownerId: string;
let templates: SiteTemplate[];
const tempTemplateIds: string[] = [];

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-test-user': ownerId, 'x-bookpage-client-ip': randomUUID(), 'x-bookpage-proxy-secret': 'test-proxy-secret' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => null)) as Record<string, unknown> | null };
}

async function upload(query: string, bytes: Buffer, type = 'image/png') {
  const res = await fetch(`${base}/business/media?${query}`, {
    method: 'POST',
    headers: { 'content-type': type, origin: ORIGIN, 'x-test-user': ownerId },
    body: new Uint8Array(bytes),
  });
  return { status: res.status, json: (await res.json().catch(() => null)) as Record<string, unknown> | null };
}

const biz = (json: unknown) => json as OwnerBusiness;
const bySlug = (slug: string) => templates.find((t) => t.slug === slug)!;

/** A throwaway template row; removed in afterAll. */
async function tempTemplate(patch: Record<string, unknown>) {
  const classic = await prisma.siteTemplate.findUniqueOrThrow({ where: { slug: 'classic' } });
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = classic;
  const row = await prisma.siteTemplate.create({
    data: { ...rest, slug: `test-${randomUUID().slice(0, 8)}`, position: 999, defaultTheme: rest.defaultTheme ?? {}, layoutConfiguration: rest.layoutConfiguration ?? {}, ...patch },
  });
  tempTemplateIds.push(row.id);
  return row;
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(SessionGuard)
    .useClass(TestSessionGuard)
    .compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  await app.listen(0);
  base = await app.getUrl();
  prisma = app.get(PrismaService);
  ownerId = (await prisma.user.create({ data: { googleId: `test-${randomUUID()}`, email: `test-${randomUUID()}@bookpage.test`, name: 'Rae Okafor' } })).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: ownerId } });
  await prisma.siteTemplate.deleteMany({ where: { id: { in: tempTemplateIds } } });
  await app.close();
});

describe('template catalogue', () => {
  it('lists the active templates in gallery order, all valid and distinct', async () => {
    await tempTemplate({ isActive: false, name: 'Retired' });
    await tempTemplate({ layoutConfiguration: { sections: ['services'], services: { display: 'cards', limit: 4 }, gallery: { limit: 1 }, labels: {}, html: '<script>' } });

    const { status, json } = await call('GET', '/templates');
    expect(status).toBe(200);
    templates = (json as { templates: SiteTemplate[] }).templates;
    const slugs = templates.map((t) => t.slug);
    expect(slugs[0]).toBe('classic');
    expect(slugs).toEqual(expect.arrayContaining(['billboard', 'quiet', 'journal', 'carte', 'shelf', 'neighbour', 'noir', 'pulse', 'folio', 'practice']));
    expect(new Set(slugs).size).toBe(slugs.length);
    // Retired and invalid rows never reach the gallery.
    expect(slugs.some((s) => s.startsWith('test-'))).toBe(false);
    // Compositions differ: no two templates share section order and service display.
    const shapes = templates.map((t) => `${t.layout.sections.join(',')}|${t.layout.services.display}`);
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it('shows the same catalogue to the marketing site, without a session', async () => {
    const res = await fetch(`${base}/marketing/templates`, { headers: { 'x-bookpage-client-ip': randomUUID(), 'x-bookpage-proxy-secret': 'test-proxy-secret' } });
    expect(res.status).toBe(200);
    const listed = ((await res.json()) as { templates: SiteTemplate[] }).templates;
    expect(listed.map((t) => t.slug)).toEqual(templates.map((t) => t.slug));
  });
});

describe('choosing a template during onboarding', () => {
  it('stores the pick on the draft and returns it on the next load (refresh or resume)', async () => {
    await call('PATCH', '/business', { timezone: 'Europe/Berlin', country: 'DE', currency: 'EUR' });
    const picked = biz((await call('PATCH', '/business', { templateId: bySlug('carte').id })).json);
    expect(picked.templateId).toBe(bySlug('carte').id);
    expect(picked.site.template.slug).toBe('carte');
    expect(picked.site.notice).toBeNull();

    const reloaded = (await call('GET', '/business')).json as { business: OwnerBusiness };
    expect(reloaded.business.site.template.slug).toBe('carte');
  });

  it('keeps every piece of business data when switching templates', async () => {
    await call('PATCH', '/business', { name: 'Kantine Rae', category: 'other', description: 'Lunch and dinner in Kreuzberg.', phone: '030 901820' });
    await call('PUT', '/business/services', [{ name: 'Tasting menu', priceType: 'fixed', priceMinor: 6500, durationMin: 120, bookable: true }]);
    await call('PUT', '/business/hours', [{ weekday: 3, opensAt: 720, closesAt: 1380 }]);
    const before = biz((await call('GET', '/business')).json!.business);

    const after = biz((await call('PATCH', '/business', { templateId: bySlug('noir').id })).json);
    expect(after.site.template.slug).toBe('noir');
    for (const key of ['name', 'description', 'phone', 'category', 'services', 'hours', 'staff', 'rules'] as const) {
      expect(after[key]).toEqual(before[key]);
    }
  });

  it('changes colour and font without touching the layout or the template', async () => {
    const themed = biz((await call('PATCH', '/business', { theme: { accent: '#2f55d4' } })).json);
    expect(themed.site.template.slug).toBe('noir');
    expect(themed.site.template.layout).toEqual(bySlug('noir').layout);
    expect(themed.site.theme).toEqual({ accent: '#2F55D4', font: bySlug('noir').defaultTheme.font });

    const font = biz((await call('PATCH', '/business', { theme: { accent: '#2f55d4', font: 'mono' } })).json);
    expect(font.theme).toEqual({ accent: '#2f55d4', font: 'mono' });
    // Leaving a key out goes back to the template's default.
    const reset = biz((await call('PATCH', '/business', { theme: { font: 'mono' } })).json);
    expect(reset.site.theme).toEqual({ accent: bySlug('noir').defaultTheme.accent, font: 'mono' });
    await call('PATCH', '/business', { theme: { accent: '#2f55d4', font: 'mono' } });

    expect((await call('PATCH', '/business', { theme: { layout: 'menu' } })).status).toBe(400);
  });

  it('refuses ids that are not offered, without changing the pick', async () => {
    const retired = await tempTemplate({ isActive: false });
    for (const templateId of [randomUUID(), retired.id]) {
      const res = await call('PATCH', '/business', { templateId });
      expect(res.status).toBe(400);
      expect(res.json?.issues).toEqual([{ path: 'templateId', message: "That template isn't available. Pick another." }]);
    }
    expect(biz((await call('GET', '/business')).json!.business).site.template.slug).toBe('noir');
  });

  it('falls back to Classic and tells the owner when the picked template is retired', async () => {
    const soon = await tempTemplate({ name: 'Soon gone' });
    await call('PATCH', '/business', { templateId: soon.id });
    await prisma.siteTemplate.update({ where: { id: soon.id }, data: { isActive: false } });

    const b = biz((await call('GET', '/business')).json!.business);
    expect(b.templateId).toBe(soon.id); // the pick is kept, not silently switched
    expect(b.site.template.slug).toBe('classic');
    expect(b.site.notice).toEqual({ code: 'inactive', requested: soon.slug });

    const publish = await call('POST', '/business/publish', { slug: `rae-${randomUUID().slice(0, 6)}` });
    expect(publish.status).toBe(422);
    expect(publish.json?.issues).toEqual(expect.arrayContaining([{ step: 1, message: 'Pick one of the available templates' }]));

    await call('PATCH', '/business', { templateId: bySlug('carte').id });
  });
});

describe('images', () => {
  it('stores a cover photo, serves it, and replaces it on re-upload', async () => {
    const first = await upload('kind=hero&width=1&height=1', PNG);
    expect(first.status).toBe(200);
    const hero = biz(first.json).hero!;
    expect(hero).toMatchObject({ url: `/media/${hero.id}`, width: 1, height: 1 });

    const served = await fetch(`${base}${hero.url}`);
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/png');
    expect(served.headers.get('cache-control')).toContain('immutable');
    expect(Buffer.from(await served.arrayBuffer()).equals(PNG)).toBe(true);

    const second = biz((await upload('kind=hero', PNG)).json).hero!;
    expect(second.id).not.toBe(hero.id);
    expect((await fetch(`${base}${hero.url}`)).status).toBe(404);
  });

  it('sniffs the bytes and refuses anything that is not an image', async () => {
    const res = await upload('kind=gallery', Buffer.from('<svg onload="alert(1)"></svg>'), 'image/png');
    expect(res.status).toBe(400);
    expect(res.json?.issues).toEqual([{ path: 'file', message: 'Use a JPG, PNG or WebP image' }]);
    expect((await upload('kind=wallpaper', PNG)).status).toBe(400);
  });

  it('attaches photos to saved services and team members, and removes them', async () => {
    const b = biz((await call('GET', '/business')).json!.business);
    expect((await upload('kind=service', PNG)).status).toBe(400);

    const withPhoto = biz((await upload(`kind=service&targetId=${b.services[0]!.id}`, PNG)).json);
    expect(withPhoto.services[0]!.image?.url).toMatch(/^\/media\//);
    const staffPhoto = biz((await upload(`kind=staff&targetId=${b.staff[0]!.id}`, PNG)).json);
    expect(staffPhoto.staff[0]!.photo).not.toBeNull();

    const gallery = biz((await upload('kind=gallery', PNG)).json).gallery;
    expect(gallery).toHaveLength(1);
    const removed = biz((await call('DELETE', `/business/media/${gallery[0]!.id}`)).json);
    expect(removed.gallery).toEqual([]);
  });
});

describe('publishing', () => {
  it('publishes with the picked template and the current data, and the page renders from them', async () => {
    await call('PATCH', '/business', { name: 'Kantine Rae', locationType: 'online' });
    const slug = `rae-${randomUUID().slice(0, 6)}`;
    const published = await call('POST', '/business/publish', { slug });
    expect(published.status).toBe(200);
    expect(biz(published.json).templateId).toBe(bySlug('carte').id);

    const page = (await call('GET', `/public/${slug}`)).json as unknown as PublicBusiness;
    expect(page.site.template.slug).toBe('carte');
    expect(page.site.template.layout).toEqual(bySlug('carte').layout);
    expect(page.site.theme).toEqual({ accent: '#2F55D4', font: 'mono' });
    expect(page.site.notice).toBeNull();
    expect(page.name).toBe('Kantine Rae');
    expect(page.services[0]).toMatchObject({ name: 'Tasting menu', image: { url: expect.stringMatching(/^\/media\//) } });
    expect(page.hero?.url).toMatch(/^\/media\//);
  });
});
