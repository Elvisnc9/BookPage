import { ConflictException, Inject, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { type BillingView, type CheckoutRequest, type DomainMode, type DomainOption, effectivePlan, PRO_PRICE } from '@bookpage/shared';
import { CONFIG, type Config } from '../config';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type DomainProvider, testDomains } from './domains';

/** An unpaid checkout older than this can't be paid any more; start a new one. */
const CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000;

const BILLING_SELECT = {
  id: true,
  plan: true,
  planRenewsAt: true,
  billingStatus: true,
  customDomain: true,
  domainMode: true,
  domainStatus: true,
} satisfies Prisma.BusinessSelect;
type BillingRow = Prisma.BusinessGetPayload<{ select: typeof BILLING_SELECT }>;

export interface CheckoutSummary {
  id: string;
  status: string;
  amountMinor: number;
  currency: string;
  domain: { name: string; mode: DomainMode } | null;
  testMode: boolean;
}

/**
 * Pro, paid yearly. Provider-neutral: a checkout session records what the owner chose;
 * the provider's "paid" event (the test provider's button in development) is applied
 * exactly once through `applyPaid`, keyed by the provider's event id.
 */
@Injectable()
export class BillingService {
  private readonly domains: DomainProvider | null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG) private readonly config: Config,
  ) {
    this.domains = config.billing.provider === 'test' ? testDomains : null;
  }

  get testMode() {
    return this.config.billing.provider === 'test';
  }

  async view(ownerId: string): Promise<BillingView> {
    return this.toView(await this.row(ownerId));
  }

  async searchDomains(query: string): Promise<DomainOption[]> {
    if (!this.domains) throw new ServiceUnavailableException('Domain search opens with Pro');
    return this.domains.search(query);
  }

  /** Starts paying for Pro: records the choice and returns where to pay. */
  async checkout(ownerId: string, req: CheckoutRequest): Promise<{ url: string }> {
    if (this.config.billing.provider === 'none') throw new ServiceUnavailableException('Pro opens soon');
    const b = await this.row(ownerId);
    if (effectivePlan(b) === 'pro' && b.billingStatus !== 'past_due') throw new ConflictException('You’re already on Pro');

    if (req.domain) {
      const taken = await this.prisma.business.findFirst({ where: { customDomain: req.domain.name, id: { not: b.id } }, select: { id: true } });
      if (taken) throw domainIssue('That domain is already connected to another BookPage page');
      if (req.domain.mode === 'register') {
        const option = (await this.searchDomains(req.domain.name)).find((o) => o.name === req.domain!.name);
        if (!option?.available) throw domainIssue('That domain isn’t available. Pick another.');
        if (!option.included) throw domainIssue('That domain costs more than the one included with Pro. Pick a standard one, or connect one you own.');
      }
    }

    const session = await this.prisma.checkoutSession.create({
      data: {
        businessId: b.id,
        provider: this.config.billing.provider,
        amountMinor: PRO_PRICE.amountMinor,
        currency: PRO_PRICE.currency,
        domainName: req.domain?.name ?? null,
        domainMode: req.domain?.mode ?? null,
      },
    });
    return { url: `${this.config.appOrigin}/billing/test-checkout?session=${session.id}` };
  }

  async session(ownerId: string, sessionId: string): Promise<CheckoutSummary> {
    const s = await this.ownSession(ownerId, sessionId);
    return {
      id: s.id,
      status: s.status === 'open' && expired(s.createdAt) ? 'expired' : s.status,
      amountMinor: s.amountMinor,
      currency: s.currency,
      domain: s.domainName ? { name: s.domainName, mode: s.domainMode as DomainMode } : null,
      testMode: s.provider === 'test',
    };
  }

  /** Development only: the test provider's "Pay" button. */
  async payTest(ownerId: string, sessionId: string): Promise<BillingView> {
    if (!this.testMode) throw new NotFoundException();
    const s = await this.ownSession(ownerId, sessionId);
    if (s.provider !== 'test') throw new NotFoundException();
    await this.applyPaid('test', `test_${s.id}`, s.id);
    return this.view(ownerId);
  }

  /**
   * A paid checkout turns Pro on for a year (stacked on any time left). Safe to call
   * again with the same event: the event row is written in the same transaction, so a
   * repeat finds it and changes nothing.
   */
  async applyPaid(provider: string, externalId: string, sessionId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.billingEvent.create({ data: { provider, externalId, type: 'checkout.paid', payload: { sessionId } } });
        const s = await tx.checkoutSession.findUniqueOrThrow({ where: { id: sessionId }, include: { business: { select: BILLING_SELECT } } });
        if (s.status === 'paid') return;
        if (expired(s.createdAt)) throw new ConflictException('This checkout has expired. Start again from your plan page.');

        const now = new Date();
        const from = s.business.planRenewsAt && s.business.planRenewsAt > now ? s.business.planRenewsAt : now;
        const renewsAt = new Date(from);
        renewsAt.setUTCFullYear(renewsAt.getUTCFullYear() + 1);

        await tx.billingEvent.update({ where: { provider_externalId: { provider, externalId } }, data: { businessId: s.businessId } });
        await tx.checkoutSession.update({ where: { id: s.id }, data: { status: 'paid', paidAt: now } });
        await tx.business.update({
          where: { id: s.businessId },
          data: {
            plan: 'pro',
            billingStatus: 'active',
            planRenewsAt: renewsAt,
            ...(s.domainName
              ? {
                  customDomain: s.domainName,
                  domainMode: s.domainMode,
                  // Registering happens after payment, in the owner's name. The test provider
                  // registers nothing, so it marks the name active straight away. A domain the
                  // owner already has waits for their DNS records.
                  domainStatus: s.domainMode === 'register' ? 'active' : 'pending',
                }
              : {}),
          },
        });
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      // The same event again (two deliveries racing): already applied.
      if (await this.prisma.billingEvent.findUnique({ where: { provider_externalId: { provider, externalId } } })) return;
      // Otherwise the only other unique value written is the domain.
      throw new ConflictException('That domain is already connected to another BookPage page');
    }
  }

  /** Stop renewing; Pro stays on until the paid year ends. */
  async cancel(ownerId: string): Promise<BillingView> {
    const b = await this.row(ownerId);
    if (b.billingStatus !== 'active') throw new ConflictException('There’s no renewal to cancel');
    await this.prisma.business.update({ where: { id: b.id }, data: { billingStatus: 'canceling' } });
    return this.view(ownerId);
  }

  async resume(ownerId: string): Promise<BillingView> {
    const b = await this.row(ownerId);
    if (b.billingStatus !== 'canceling' || effectivePlan(b) !== 'pro') throw new ConflictException('There’s nothing to resume');
    await this.prisma.business.update({ where: { id: b.id }, data: { billingStatus: 'active' } });
    return this.view(ownerId);
  }

  private async row(ownerId: string): Promise<BillingRow> {
    const b = await this.prisma.business.findFirst({ where: { ownerId }, orderBy: { createdAt: 'asc' }, select: BILLING_SELECT });
    if (!b) throw new NotFoundException('Set up your business first');
    return b;
  }

  private async ownSession(ownerId: string, sessionId: string) {
    const s = await this.prisma.checkoutSession.findFirst({ where: { id: sessionId, business: { ownerId } } });
    if (!s) throw new NotFoundException('Checkout not found');
    return s;
  }

  private toView(b: BillingRow): BillingView {
    return {
      plan: b.plan,
      effectivePlan: effectivePlan(b),
      status: b.billingStatus,
      renewsAt: b.planRenewsAt?.toISOString() ?? null,
      domain: b.customDomain ? { name: b.customDomain, mode: (b.domainMode ?? 'connect') as DomainMode, status: b.domainStatus } : null,
      price: PRO_PRICE,
      checkoutAvailable: this.config.billing.provider !== 'none',
      testMode: this.testMode,
    };
  }
}

const expired = (createdAt: Date) => Date.now() - createdAt.getTime() > CHECKOUT_TTL_MS;

const domainIssue = (message: string) =>
  new UnprocessableEntityException({ message, issues: [{ path: 'domain', message }] });
