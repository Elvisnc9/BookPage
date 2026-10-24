// @vitest-environment happy-dom
// The upgrade island against a fake API: domain search, the three choices, and
// handing over to the checkout URL the API returns.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Upgrade, { labelFrom } from './Upgrade';

const options = [
  { name: 'glowstudio.com', available: false, priceMinor: null, included: false },
  { name: 'glowstudio.co', available: true, priceMinor: 2900, included: false },
  { name: 'glowstudio.net', available: true, priceMinor: 1300, included: true },
];
let posted: { path: string; body: unknown }[];
const assign = vi.fn();

beforeEach(() => {
  posted = [];
  assign.mockReset();
  vi.stubGlobal('location', { ...window.location, assign });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/billing/domains') return new Response(JSON.stringify({ options }));
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      posted.push({ path: url.pathname, body });
      if (body.domain?.name === 'taken.example.com') return new Response(JSON.stringify({ message: 'That domain is already connected to another BookPage page' }), { status: 422 });
      return new Response(JSON.stringify(url.pathname === '/api/billing/checkout' ? { url: 'http://localhost:4321/billing/test-checkout?session=abc' } : { billing: {} }));
    }
    return new Response('{}', { status: 404 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('upgrade', () => {
  it('suggests a name from the business and picks the first included domain', async () => {
    expect(labelFrom('Glow Studio & Spa')).toBe('glowstudiospa');
    render(<Upgrade mode="checkout" businessName="Glow Studio" testMode />);
    expect((screen.getByLabelText('Search for a name') as HTMLInputElement).value).toBe('glowstudio');
    const radio = (name: string) => document.querySelector<HTMLInputElement>(`input[name="domain"][value="${name}"]`)!;
    await waitFor(() => expect(radio('glowstudio.net')).toBeTruthy());
    expect(radio('glowstudio.com').disabled).toBe(true); // taken
    expect(radio('glowstudio.co').disabled).toBe(true); // over the included price
    expect(radio('glowstudio.net').checked).toBe(true);
    expect(screen.getByText(/pretend checkout/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('http://localhost:4321/billing/test-checkout?session=abc'));
    expect(posted).toEqual([{ path: '/api/billing/checkout', body: { domain: { name: 'glowstudio.net', mode: 'register' } } }]);
  });

  it('connects a domain they own, checking it first, and shows the API refusal', async () => {
    render(<Upgrade mode="checkout" businessName="Glow" testMode={false} />);
    fireEvent.click(screen.getByRole('radio', { name: /I already have one/ }));
    const input = screen.getByLabelText('Your domain');
    fireEvent.input(input, { target: { value: 'not a domain' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    expect(screen.getByRole('alert').textContent).toBe('Use a domain like yourname.com');
    expect(posted).toEqual([]);

    fireEvent.input(input, { target: { value: 'Taken.Example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('already connected'));
    expect(posted[0]!.body).toEqual({ domain: { name: 'taken.example.com', mode: 'connect' } });
    expect(assign).not.toHaveBeenCalled();
  });

  it('can skip the domain at checkout, but not when adding one later', async () => {
    const { unmount } = render(<Upgrade mode="checkout" businessName="Glow" testMode />);
    fireEvent.click(screen.getByRole('radio', { name: /Skip for now/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await waitFor(() => expect(posted).toEqual([{ path: '/api/billing/checkout', body: { domain: null } }]));
    unmount();

    render(<Upgrade mode="domain" businessName="Glow" testMode />);
    expect(screen.queryByRole('radio', { name: /Skip for now/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add this domain' })).toBeTruthy();
  });
});
