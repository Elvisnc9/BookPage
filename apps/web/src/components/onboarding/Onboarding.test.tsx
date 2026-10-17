// @vitest-environment happy-dom
// The real onboarding wizard against an in-memory API: picking a template,
// filling every step, moving back and forth, refreshing, and publishing.
import { type OwnerBusiness, publishIssues, resolveSite, type SiteTemplate } from '@bookpage/shared';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATE_CATALOGUE, toRow } from '../../../../api/prisma/templates';
import Onboarding from './Onboarding';

const rows = TEMPLATE_CATALOGUE.map((t, i) => ({ ...toRow(t, i), thumbnailUrl: null, previewImageUrl: null }));
const templates = rows.map(({ layoutConfiguration, ...r }) => ({ ...r, layout: layoutConfiguration })) as unknown as SiteTemplate[];
const bySlug = (slug: string) => templates.find((t) => t.slug === slug)!;
const ORIGIN = { protocol: 'http:', rootDomain: 'bookpage.test', port: '' };

/** Just enough of the API, with the same rules: theme replaces, templates must be offered, publish checks issues. */
function fakeApi(start: OwnerBusiness) {
  let biz = structuredClone(start);
  let ids = 0;
  const calls: { method: string; path: string; body: unknown }[] = [];
  const view = (): OwnerBusiness => {
    const selected = rows.find((r) => r.id === biz.templateId) ?? null;
    biz.site = resolveSite({ selected, fallback: rows[0], theme: biz.theme });
    biz.updatedAt = new Date(Date.now() + ids++).toISOString();
    return structuredClone(biz);
  };
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const path = url.pathname.replace(/^\/api/, '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    if (method === 'GET' && path === '/business') return ok({ business: view() });
    if (method === 'PATCH' && path === '/business') {
      if (body.templateId && !rows.some((r) => r.id === body.templateId)) return new Response(JSON.stringify({ issues: [{ path: 'templateId', message: 'nope' }] }), { status: 400 });
      biz = { ...biz, ...body, theme: body.theme ?? biz.theme };
      return ok(view());
    }
    if (method === 'PUT' && path === '/business/services') {
      biz.services = body.map((s: OwnerBusiness['services'][number]) => ({ ...s, id: s.id ?? `svc-${ids++}`, description: s.description ?? null, image: null }));
      return ok(view());
    }
    if (method === 'PUT' && path === '/business/hours') { biz.hours = body; return ok(view()); }
    if (method === 'PUT' && path === '/business/staff') { biz.staff = body.map((p: { id?: string; name: string }) => ({ id: p.id ?? `p-${ids++}`, name: p.name, photo: null })); return ok(view()); }
    if (method === 'PATCH' && path === '/business/rules') { biz.rules = { ...biz.rules, ...body }; return ok(view()); }
    if (method === 'GET' && path === '/business/slug-available') return ok({ available: true });
    if (method === 'POST' && path === '/business/publish') {
      const issues = publishIssues(biz);
      if (issues.length) return new Response(JSON.stringify({ message: 'Not ready', issues }), { status: 422 });
      biz = { ...biz, slug: body.slug, onboardingStep: 5, publishedAt: new Date().toISOString(), templateId: biz.templateId ?? rows[0]!.id };
      return ok(view());
    }
    return new Response('{}', { status: 404 });
  });
  return { fetch, calls, get: () => biz };
}

function draft(): OwnerBusiness {
  return {
    id: 'b1', slug: 'draft-abcd1234', name: '', category: null, description: null, locationType: 'premises', addressLine1: null, addressLine2: null,
    city: null, region: null, postalCode: null, country: 'GB', serviceAreas: [], phone: null, whatsapp: null, email: null,
    timezone: 'Europe/London', currency: 'GBP', templateId: null, theme: {},
    site: resolveSite({ selected: null, fallback: rows[0], theme: {} }),
    logo: null, hero: null, gallery: [], onboardingStep: 0, publishedAt: null, updatedAt: '2030-01-01T00:00:00.000Z',
    hours: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opensAt: 540, closesAt: 1080 })),
    services: [], staff: [{ id: 'p0', name: 'Rae', photo: null }],
    rules: { minNoticeMin: 120, windowDays: 60, autoConfirm: true, customerFields: { phone: 'required', note: 'optional' } },
  };
}

beforeAll(() => {
  // happy-dom has no layout: give the preview and gallery what they observe.
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver = class {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(el: Element) { this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  window.scrollTo = () => {};
});
let api: ReturnType<typeof fakeApi>;
beforeEach(() => { api = fakeApi(draft()); vi.stubGlobal('fetch', api.fetch); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const type = (el: Element, value: string) => fireEvent.input(el, { target: { value } });
const title = () => document.querySelector('#ob-step-title')?.textContent;
const previewSite = () => document.querySelector('.ob-canvas .site') as HTMLElement | null;
async function next(expectTitle: string) {
  await act(async () => { fireEvent.submit(document.querySelector('form.ob-form')!); });
  await waitFor(() => expect(title()).toBe(expectTitle), { timeout: 4000 });
}

describe('onboarding', () => {
  it('loads the active templates and marks the current pick', () => {
    render(<Onboarding initial={draft()} templates={templates} origin={ORIGIN} />);
    const radios = screen.getAllByRole('radio', { name: /, / }).filter((r) => (r as HTMLInputElement).name === 'template');
    expect(radios).toHaveLength(templates.length);
    expect((screen.getByRole('radio', { name: 'Classic, Beauty & wellness' }) as HTMLInputElement).checked).toBe(true);
    expect(document.querySelector('.ob-tpl[data-selected]')?.textContent).toContain('Selected');
  });

  it('saves the picked template at once and the preview switches to it', async () => {
    render(<Onboarding initial={draft()} templates={templates} origin={ORIGIN} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Carte, Food & drink' }));
    await waitFor(() => expect(api.get().templateId).toBe(bySlug('carte').id), { timeout: 3000 });
    expect(previewSite()?.dataset.template).toBe('carte');
    expect(api.calls.find((c) => c.method === 'PATCH' && (c.body as { templateId?: string }).templateId)).toBeTruthy();
  });

  it('keeps the pick after a refresh', async () => {
    const first = render(<Onboarding initial={draft()} templates={templates} origin={ORIGIN} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Noir, Beauty & wellness' }));
    await waitFor(() => expect(api.get().templateId).toBe(bySlug('noir').id), { timeout: 3000 });
    first.unmount();
    // A refresh renders from the server's copy.
    render(<Onboarding initial={structuredClone(api.get())} templates={templates} origin={ORIGIN} />);
    expect((screen.getByRole('radio', { name: 'Noir, Beauty & wellness' }) as HTMLInputElement).checked).toBe(true);
    expect(previewSite()?.dataset.template).toBe('noir');
  });

  it('walks all five steps, keeps the draft when moving back, and publishes with the picked template', async () => {
    render(<Onboarding initial={draft()} templates={templates} origin={ORIGIN} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Shelf, Retail' }));
    fireEvent.click(screen.getByRole('radio', { name: /Tomato/ }));
    await next('About your business');

    // Required fields are enforced.
    await act(async () => { fireEvent.submit(document.querySelector('form.ob-form')!); });
    expect(document.querySelector('.ob-nav-msg')?.textContent).toBe('Add your business name');

    type(screen.getByLabelText('Business name'), 'Polish Bar');
    fireEvent.click(screen.getByRole('button', { name: 'Nails & lashes' }));
    type(screen.getByLabelText('One line about you'), 'Nails, brows and the good skincare.');
    type(screen.getByLabelText('Street address'), '1 Market Street');
    type(screen.getByLabelText('City'), 'London');
    type(screen.getByLabelText('Phone'), '020 7946 0958');
    // The preview follows the typing (after its short throttle).
    await waitFor(() => expect(previewSite()?.querySelector('h1')?.textContent).toBe('Polish Bar'));
    await next('Add your services');

    type(await screen.findByLabelText('Service name'), 'Gel manicure');
    type(screen.getByLabelText('Price'), '42');
    await waitFor(() => expect(previewSite()?.textContent).toContain('Gel manicure'));
    await next('Set up your bookings');
    await next('Review and publish');

    // Back to About and Template: everything is where the owner left it.
    fireEvent.click(screen.getByRole('button', { name: /About/ }));
    await waitFor(() => expect(title()).toBe('About your business'));
    expect((screen.getByLabelText('Business name') as HTMLInputElement).value).toBe('Polish Bar');
    fireEvent.click(screen.getByRole('button', { name: /Template/ }));
    await waitFor(() => expect(title()).toBe('Pick a look'));
    expect((screen.getByRole('radio', { name: 'Shelf, Retail' }) as HTMLInputElement).checked).toBe(true);
    expect(previewSite()?.style.getPropertyValue('--accent')).toBe('#D9432B');
    fireEvent.click(screen.getByRole('button', { name: /Services/ }));
    await waitFor(() => expect((screen.getByLabelText('Service name') as HTMLInputElement).value).toBe('Gel manicure'));

    fireEvent.click(screen.getByRole('button', { name: /Publish/ }));
    await waitFor(() => expect(title()).toBe('Review and publish'));
    await waitFor(() => expect(document.querySelector('.ob-slug-note')?.textContent).toContain('is yours'), { timeout: 3000 });
    await act(async () => { fireEvent.submit(document.querySelector('form.ob-form')!); });
    await waitFor(() => expect(screen.getByText(/Your page is/)).toBeTruthy(), { timeout: 4000 });

    const published = api.get();
    expect(published.templateId).toBe(bySlug('shelf').id);
    expect(published.theme).toEqual({ accent: '#D9432B' });
    expect(published).toMatchObject({ name: 'Polish Bar', city: 'London', slug: 'polishbar' });
    expect(published.services.map((s) => s.name)).toEqual(['Gel manicure']);
  });

  it('switching template keeps what the owner typed', async () => {
    const start = { ...draft(), name: 'Forge Athletic', onboardingStep: 2 };
    api = fakeApi(start);
    vi.stubGlobal('fetch', api.fetch);
    render(<Onboarding initial={start} templates={templates} origin={ORIGIN} />);
    fireEvent.click(screen.getByRole('button', { name: /Template/ }));
    await waitFor(() => expect(title()).toBe('Pick a look'));
    for (const name of ['Pulse, Fitness', 'Journal, Creative', 'Billboard, Home & local']) {
      fireEvent.click(screen.getByRole('radio', { name }));
      await waitFor(() => expect(previewSite()?.textContent?.toLowerCase()).toContain('forge'));
    }
    await waitFor(() => expect(api.get().templateId).toBe(bySlug('billboard').id), { timeout: 3000 });
    expect(api.get().name).toBe('Forge Athletic');
  });

  it('tells the owner, instead of switching silently, when their template was retired', () => {
    const retired = { ...draft(), templateId: '01929b00-0000-7000-8000-00000000dead' };
    retired.site = { ...retired.site, notice: { code: 'inactive', requested: 'vapor' } };
    render(<Onboarding initial={retired} templates={templates} origin={ORIGIN} />);
    expect(document.body.textContent).toContain('The template you picked (vapor) has been retired');
    expect(previewSite()?.dataset.template).toBe('classic');
  });
});
