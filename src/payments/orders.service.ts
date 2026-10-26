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
import { AdminOrderDto, CreateCheckoutDto, PublicOrderDto } from './payments.dto.js';

/** Letters and digits without the look-alikes (0/O, 1/I), for the reference shown to buyers. */
const NUMBER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newOrderNumber() {
  const bytes = randomBytes(6);
  return `NSX-${Array.from(bytes, (byte) => NUMBER_ALPHABET[byte % NUMBER_ALPHABET.length]).join('')}`;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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
      if (product.priceCents <= 0 || !product.fileKey) {
        throw new BadRequestException(`"${product.name}" cannot be bought online`);
      }
    }
    const products = slugs.map((slug) => bySlug.get(slug)!);
    const unitPrice = (product: Product) => product.salePriceCents ?? product.priceCents;
    const totalCents = products.reduce((sum, product) => sum + unitPrice(product), 0);

    const site = this.siteUrl();
    const { stripe, keys } = await this.payments.stripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: products.map((product) => ({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: unitPrice(product),
          product_data: {
            name: product.name,
            description: product.summary.slice(0, 300),
            ...(product.coverImageUrl?.startsWith('https://') ? { images: [product.coverImageUrl] } : {}),
          },
        },
      })),
      success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/cart`,
    });
    if (!session.url) throw new ServiceUnavailableException('Stripe did not return a payment page');

    await this.orders.save(
      this.orders.create({
        number: newOrderNumber(),
        status: 'pending',
        totalCents,
        currency: 'usd',
        stripeSessionId: session.id,
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
    return { url: session.url };
  }

  // ---------- Stripe -> us ----------

  /** Verifies the signature and applies `checkout.session.completed` / `.expired`. */
  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    const keys = await this.payments.active();
    if (!keys?.webhookSecret) throw new ServiceUnavailableException('Webhook is not configured');
    if (!rawBody || !signature) throw new BadRequestException('Missing signature');
    const { stripe } = await this.payments.stripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, keys.webhookSecret);
    } catch {
      throw new BadRequestException('Invalid signature');
    }
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await this.applySession(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === 'checkout.session.expired') {
      await this.markStatus((event.data.object as Stripe.Checkout.Session).id, 'expired', 'pending');
    }
    return { received: true };
  }

  /**
   * Looks the order up for the thank-you page. If the webhook has not arrived
   * yet, asks Stripe directly, so the buyer is not left waiting.
   */
  async findForBuyer(sessionId: string): Promise<PublicOrderDto> {
    let order = await this.bySession(sessionId);
    if (order.status === 'pending') {
      try {
        const { stripe } = await this.payments.stripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        await this.applySession(session);
        order = await this.bySession(sessionId);
      } catch (error) {
        this.logger.warn(`Could not confirm ${sessionId} with Stripe: ${(error as Error).message}`);
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
    if (!item || !product?.fileKey) throw new NotFoundException('File not found');
    return this.storage.createDownloadUrl(product.fileKey, product.fileName ?? `${item.name}`);
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
    const order = await this.orders.findOne({ where: { id }, relations: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    return this.toAdmin(order);
  }

  // ---------- Internals ----------

  private async applySession(session: Stripe.Checkout.Session) {
    if (session.payment_status !== 'paid') return;
    const order = await this.orders.findOneBy({ stripeSessionId: session.id });
    if (!order || order.status === 'paid') return;
    order.status = 'paid';
    order.paidAt = new Date();
    order.email = session.customer_details?.email ?? session.customer_email ?? order.email;
    order.stripePaymentIntentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null);
    await this.orders.save(order);
  }

  private async markStatus(sessionId: string, to: OrderStatus, from: OrderStatus) {
    await this.orders.update({ stripeSessionId: sessionId, status: from }, { status: to });
  }

  private async bySession(sessionId: string) {
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new NotFoundException('Order not found');
    const order = await this.orders.findOne({
      where: { stripeSessionId: sessionId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private async toPublic(order: Order): Promise<PublicOrderDto> {
    const productIds = order.items.map((item) => item.productId).filter((id): id is string => Boolean(id));
    const withFile = new Set(
      productIds.length
        ? (await this.products.find({ where: { id: In(productIds) }, select: { id: true, fileKey: true } }))
            .filter((product) => product.fileKey)
            .map((product) => product.id)
        : [],
    );
    return {
      number: order.number,
      status: order.status,
      email: order.email,
      totalCents: order.totalCents,
      currency: order.currency,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        unitPriceCents: item.unitPriceCents,
        downloadable: order.status === 'paid' && Boolean(item.productId && withFile.has(item.productId)),
      })),
    };
  }

  private toAdmin(order: Order): AdminOrderDto {
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      email: order.email,
      totalCents: order.totalCents,
      currency: order.currency,
      mode: order.mode,
      stripeSessionId: order.stripeSessionId,
      stripePaymentIntentId: order.stripePaymentIntentId,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        unitPriceCents: item.unitPriceCents,
        downloadable: false,
      })),
    };
  }

  private siteUrl() {
    const url = this.config.get<string>('WEBSITE_URL')?.replace(/\/+$/, '');
    if (!url) throw new ServiceUnavailableException('WEBSITE_URL is not set on the server');
    return url;
  }
}
