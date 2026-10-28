import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { In, Repository } from 'typeorm';
import type Stripe from 'stripe';
import { PublishStatus } from '../content/publish-status.enum.js';
import { StorageService } from '../storage/storage.service.js';
import { Product } from '../vault/product.entity.js';
import { Order, OrderItem, OrderStatus } from './order.entity.js';
import { PaymentsConfigService } from './payments-config.service.js';
import {
  AdminOrderDto,
  CheckoutSessionDto,
  CreateCheckoutDto,
  OrderItemDto,
  PublicOrderDto,
  WebhookAckDto,
} from './payments.dto.js';

/** Letters and digits without the look-alikes (0/O, 1/I), for the reference shown to buyers. */
const NUMBER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** What the buyer pays for one product right now. */
const unitPrice = (product: Product) =>
  product.salePriceCents ?? product.priceCents;

/** A Stripe Checkout Session lives 24 hours. */
const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;
const STRIPE_CHECK_GAP_MS = 5000;

function newOrderNumber() {
  const bytes = randomBytes(6);
  return `NSX-${Array.from(bytes, (byte) => NUMBER_ALPHABET[byte % NUMBER_ALPHABET.length]).join('')}`;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  /** Session id -> when Stripe was last asked about it (per server instance). */
  private readonly lastStripeCheck = new Map<string, number>();

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly payments: PaymentsConfigService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Checkout ----------

  /** Creates a pending order and a Stripe Checkout Session; the buyer pays on Stripe's page. */
  async createCheckout(dto: CreateCheckoutDto) {
    if (!(await this.payments.isEnabled())) {
      throw new ServiceUnavailableException('Checkout is not available yet');
    }
    const slugs = [...new Set(dto.items.map((item) => item.slug))];
    const found = await this.products.find({
      where: { slug: In(slugs), status: PublishStatus.Published },
    });
    const bySlug = new Map(found.map((product) => [product.slug, product]));
    for (const slug of slugs) {
      const product = bySlug.get(slug);
      if (!product) throw new BadRequestException(`"${slug}" is not available`);
      if (unitPrice(product) <= 0 || !product.fileKey) {
        throw new BadRequestException(
          `"${product.name}" cannot be bought online`,
        );
      }
    }
    const products = slugs.map((slug) => bySlug.get(slug)!);
    const totalCents = products.reduce(
      (sum, product) => sum + unitPrice(product),
      0,
    );

    const site = this.siteUrl();
    const { stripe, keys } = await this.payments.stripe();

    // The order is saved first. If it were saved after the Stripe session, a
    // database error would leave the buyer with a payment page that Stripe
    // can charge but that no order points to.
    const order = await this.orders.save(
      this.orders.create({
        number: newOrderNumber(),
        status: 'pending',
        totalCents,
        currency: 'usd',
        stripeSessionId: null,
        mode: keys.mode,
        items: products.map((product) =>
          Object.assign(new OrderItem(), {
            productId: product.id,
            name: product.name,
            unitPriceCents: unitPrice(product),
          }),
        ),
      }),
    );

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: order.id,
        metadata: { orderId: order.id },
        line_items: products.map((product) => ({
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: unitPrice(product),
            product_data: {
              name: product.name,
              description: product.summary.slice(0, 300),
              ...(product.coverImageUrl?.startsWith('https://')
                ? { images: [product.coverImageUrl] }
                : {}),
            },
          },
        })),
        // Card fields are shown on the website's own /checkout page; Stripe sends the buyer to return_url after paying.
        ui_mode: 'elements',
        billing_address_collection: 'required',
        return_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      });
      if (!session.client_secret || !keys.publishableKey) {
        throw new ServiceUnavailableException(
          'Stripe did not return a payment form',
        );
      }
    } catch (error) {
      await this.orders.update(order.id, { status: 'expired' });
      throw error;
    }

    try {
      await this.orders.update(order.id, { stripeSessionId: session.id });
    } catch (error) {
      // The buyer can still pay: the webhook finds the order through the session metadata.
      this.logger.error(
        `Order ${order.number}: could not store Stripe session ${session.id}: ${(error as Error).message}`,
      );
    }
    return {
      ClientSecret: session.client_secret,
      PublishableKey: keys.publishableKey,
    } satisfies CheckoutSessionDto;
  }

  // ---------- Stripe -> us ----------

  /** Verifies the signature and applies `checkout.session.completed` / `.expired`. */
  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ) {
    const keys = await this.payments.active();
    if (!keys?.webhookSecret)
      throw new ServiceUnavailableException('Webhook is not configured');
    if (!rawBody || !signature)
      throw new BadRequestException('Missing signature');
    const { stripe } = await this.payments.stripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        keys.webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid signature');
    }
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await this.applySession(event.data.object);
        break;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        await this.markStatus(event.data.object.id, 'expired', 'pending');
        break;
      case 'charge.refunded': {
        // Only a full refund closes the order; a partial one leaves it paid.
        const charge = event.data.object;
        const intent =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (charge.refunded && intent) {
          await this.orders.update(
            { stripePaymentIntentId: intent, status: 'paid' },
            { status: 'refunded' },
          );
        }
        break;
      }
    }
    return { Received: true } satisfies WebhookAckDto;
  }

  /**
   * Looks the order up for the thank-you page. If the webhook has not arrived
   * yet, asks Stripe directly, so the buyer is not left waiting.
   */
  async findForBuyer(sessionId: string): Promise<PublicOrderDto> {
    let order = await this.bySession(sessionId);
    if (
      order.status === 'pending' &&
      Date.now() - order.createdAt.getTime() > SESSION_LIFETIME_MS
    ) {
      // Stripe sessions end after 24 hours: stop asking, and close the order.
      await this.markStatus(sessionId, 'expired', 'pending');
      order.status = 'expired';
    } else if (order.status === 'pending' && this.mayAskStripe(sessionId)) {
      try {
        const { stripe } = await this.payments.stripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        await this.applySession(session);
        order = await this.bySession(sessionId);
      } catch (error) {
        this.logger.warn(
          `Could not confirm ${sessionId} with Stripe: ${(error as Error).message}`,
        );
      }
    }
    return this.toPublic(order);
  }

  /** A short-lived link to one purchased file. Only for paid orders. */
  async downloadUrl(sessionId: string, itemId: string) {
    const order = await this.bySession(sessionId);
    if (order.status !== 'paid') throw new NotFoundException('Order not found');
    const item = order.items.find((candidate) => candidate.id === itemId);
    const product = item?.productId
      ? await this.products.findOneBy({ id: item.productId })
      : null;
    if (!item || !product?.fileKey)
      throw new NotFoundException('File not found');
    return this.storage.createDownloadUrl(
      product.fileKey,
      product.fileName ?? `${item.name}`,
    );
  }

  // ---------- Admin ----------

  async listForAdmin(status?: OrderStatus): Promise<AdminOrderDto[]> {
    const orders = await this.orders.find({
      where: status ? { status } : {},
      relations: { items: true },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return orders.map((order) => this.toAdmin(order));
  }

  async getForAdmin(id: string): Promise<AdminOrderDto> {
    const order = await this.orders.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.toAdmin(order);
  }

  // ---------- Internals ----------

  /** At most one Stripe lookup per session every few seconds, however often the page polls. */
  private mayAskStripe(sessionId: string) {
    const now = Date.now();
    if (now - (this.lastStripeCheck.get(sessionId) ?? 0) < STRIPE_CHECK_GAP_MS)
      return false;
    this.lastStripeCheck.set(sessionId, now);
    if (this.lastStripeCheck.size > 500) {
      for (const [key, at] of this.lastStripeCheck) {
        if (now - at > STRIPE_CHECK_GAP_MS) this.lastStripeCheck.delete(key);
      }
    }
    return true;
  }

  private async applySession(session: Stripe.Checkout.Session) {
    if (session.payment_status !== 'paid') return;
    let order = await this.orders.findOneBy({ stripeSessionId: session.id });
    const orderId = session.metadata?.orderId;
    if (!order && orderId && /^[0-9a-f-]{36}$/i.test(orderId)) {
      // The session id was never stored (see createCheckout): the metadata still points at the order.
      order = await this.orders.findOneBy({ id: orderId });
      if (order) order.stripeSessionId = session.id;
    }
    if (!order) {
      this.logger.error(
        `Paid Stripe session ${session.id} (payment ${String(session.payment_intent)}) matches no order. Check it in the Stripe dashboard.`,
      );
      return;
    }
    if (order.status === 'paid') return;
    if (
      session.amount_total !== order.totalCents ||
      session.currency?.toLowerCase() !== order.currency
    ) {
      this.logger.error(
        `Order ${order.number} NOT marked paid: Stripe session ${session.id} charged ${session.amount_total} ${session.currency}, the order expects ${order.totalCents} ${order.currency}.`,
      );
      return;
    }
    order.status = 'paid';
    order.paidAt = new Date();
    order.email =
      session.customer_details?.email ?? session.customer_email ?? order.email;
    order.stripePaymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);
    await this.orders.save(order);
  }

  private async markStatus(
    sessionId: string,
    to: OrderStatus,
    from: OrderStatus,
  ) {
    await this.orders.update(
      { stripeSessionId: sessionId, status: from },
      { status: to },
    );
  }

  private async bySession(sessionId: string) {
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId))
      throw new NotFoundException('Order not found');
    const order = await this.orders.findOne({
      where: { stripeSessionId: sessionId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private async toPublic(order: Order): Promise<PublicOrderDto> {
    const productIds = order.items
      .map((item) => item.productId)
      .filter((id): id is string => Boolean(id));
    const withFile = new Set(
      productIds.length
        ? (
            await this.products.find({
              where: { id: In(productIds) },
              select: { id: true, fileKey: true },
            })
          )
            .filter((product) => product.fileKey)
            .map((product) => product.id)
        : [],
    );
    return {
      Number: order.number,
      Status: order.status,
      Email: order.email,
      TotalCents: order.totalCents,
      Currency: order.currency,
      Items: order.items.map((item) =>
        OrderItemDto.from(
          item,
          order.status === 'paid' &&
            Boolean(item.productId && withFile.has(item.productId)),
        ),
      ),
    };
  }

  private toAdmin(order: Order): AdminOrderDto {
    return {
      Id: order.id,
      Number: order.number,
      Status: order.status,
      Email: order.email,
      TotalCents: order.totalCents,
      Currency: order.currency,
      Mode: order.mode,
      StripeSessionId: order.stripeSessionId,
      StripePaymentIntentId: order.stripePaymentIntentId,
      CreatedAt: order.createdAt,
      PaidAt: order.paidAt,
      Items: order.items.map((item) => OrderItemDto.from(item, false)),
    };
  }

  private siteUrl() {
    const url = this.config.get<string>('WEBSITE_URL')?.replace(/\/+$/, '');
    if (!url)
      throw new ServiceUnavailableException(
        'WEBSITE_URL is not set on the server',
      );
    return url;
  }
}
