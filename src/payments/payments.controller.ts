import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public, Roles } from '../common/decorators.js';
import { Role } from '../common/role.enum.js';
import type { OrderStatus } from './order.entity.js';
import { OrdersService } from './orders.service.js';
import { PaymentsConfigService } from './payments-config.service.js';
import {
  AdminOrderDto,
  CheckoutSessionDto,
  CreateCheckoutDto,
  PaymentSettingsDto,
  PaymentStatusDto,
  PaymentTestResultDto,
  PublicOrderDto,
  UpdatePaymentSettingsDto,
} from './payments.dto.js';

// The thank-you page polls while Stripe confirms, so this is generous but not unlimited.
const LOOKUP_LIMIT = { default: { limit: 20, ttl: 60_000 } };

const ORDER_STATUSES: OrderStatus[] = ['pending', 'paid', 'expired', 'refunded'];

@ApiTags('Admin - payments')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/payments')
@Roles(Role.Admin)
export class AdminPaymentsController {
  constructor(
    private readonly payments: PaymentsConfigService,
    private readonly config: ConfigService,
  ) {}

  @Get('settings')
  @ApiOperation({
    summary: 'Stripe setup: mode, masked keys, webhook URL',
    description: 'Secret keys are never returned in full: only a masked form such as `sk_test_••••4f2a`.',
  })
  @ApiOkResponse({ type: PaymentSettingsDto })
  settings(@Req() req: Request) {
    return this.payments.getForAdmin(this.webhookUrl(req));
  }

  @Put('settings')
  @ApiOperation({
    summary: 'Save Stripe keys and/or switch between test and live',
    description:
      'Send only what changes. A key is replaced only when sent. Needs PAYMENTS_ENCRYPTION_KEY on the server.',
  })
  @ApiOkResponse({ type: PaymentSettingsDto })
  @ApiBadRequestResponse({ description: 'A key has the wrong prefix, or live is missing keys' })
  @ApiServiceUnavailableResponse({ description: 'PAYMENTS_ENCRYPTION_KEY is not set' })
  async update(@Body() dto: UpdatePaymentSettingsDto, @Req() req: Request) {
    await this.payments.update(dto);
    return this.payments.getForAdmin(this.webhookUrl(req));
  }

  @Delete('settings/:mode')
  @ApiOperation({ summary: 'Remove the saved keys of one mode (test or live)' })
  @ApiOkResponse({ type: PaymentSettingsDto })
  @ApiBadRequestResponse({ description: 'mode must be test or live' })
  async clear(@Param('mode') mode: string, @Req() req: Request) {
    if (mode !== 'test' && mode !== 'live') throw new BadRequestException('mode must be test or live');
    await this.payments.clear(mode);
    return this.payments.getForAdmin(this.webhookUrl(req));
  }

  @Post('test')
  @ApiOperation({ summary: 'Ask Stripe whether the active secret key works' })
  @ApiOkResponse({ type: PaymentTestResultDto })
  async test(): Promise<PaymentTestResultDto> {
    const keys = await this.payments.active();
    if (!keys) return { ok: false, mode: 'test', message: 'No secret key is saved for the current mode' };
    try {
      const { stripe } = await this.payments.stripe();
      await stripe.balance.retrieve();
      return { ok: true, mode: keys.mode, message: `Connected to Stripe in ${keys.mode} mode` };
    } catch (error) {
      return { ok: false, mode: keys.mode, message: `Stripe rejected the key: ${(error as Error).message}` };
    }
  }

  private webhookUrl(req: Request) {
    const base =
      this.config.get<string>('API_PUBLIC_URL')?.replace(/\/+$/, '') ?? `${req.protocol}://${req.get('host')}`;
    return `${base}/public/payments/webhook`;
  }
}

@ApiTags('Admin - orders')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/orders')
@Roles(Role.Admin)
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Orders, newest first (latest 200)' })
  @ApiQuery({ name: 'status', required: false, enum: ORDER_STATUSES })
  @ApiOkResponse({ type: [AdminOrderDto] })
  list(@Query('status') status?: string) {
    return this.orders.listForAdmin(ORDER_STATUSES.find((value) => value === status));
  }

  @Get(':id')
  @ApiOperation({ summary: 'One order' })
  @ApiOkResponse({ type: AdminOrderDto })
  @ApiNotFoundResponse()
  get(@Param('id') id: string) {
    return this.orders.getForAdmin(id);
  }
}

/** Everything the website's cart, checkout and thank-you pages call. No sign-in. */
@ApiTags('Public - checkout')
@Public()
@Controller('public')
export class PublicCheckoutController {
  constructor(
    private readonly payments: PaymentsConfigService,
    private readonly orders: OrdersService,
  ) {}

  @Get('payments/status')
  @ApiOperation({ summary: 'Whether checkout is switched on' })
  @ApiOkResponse({ type: PaymentStatusDto })
  async status(): Promise<PaymentStatusDto> {
    return { enabled: await this.payments.isEnabled() };
  }

  @Post('checkout')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Start a checkout for one or more products',
    description: 'Prices come from the database, never from the request. Returns the Stripe payment page URL.',
  })
  @ApiOkResponse({ type: CheckoutSessionDto })
  @ApiBadRequestResponse({ description: 'A product is unknown, unpublished, free or has no file' })
  @ApiServiceUnavailableResponse({ description: 'Payments are not set up' })
  checkout(@Body() dto: CreateCheckoutDto) {
    return this.orders.createCheckout(dto);
  }

  @Get('orders/:sessionId')
  @Throttle(LOOKUP_LIMIT)
  @ApiOperation({
    summary: 'The thank-you page order, found by its Stripe session id',
    description: 'The session id is long and unguessable, so it acts as the buyer’s receipt link.',
  })
  @ApiOkResponse({ type: PublicOrderDto })
  @ApiNotFoundResponse()
  order(@Param('sessionId') sessionId: string) {
    return this.orders.findForBuyer(sessionId);
  }

  @Get('orders/:sessionId/items/:itemId/download')
  @Throttle(LOOKUP_LIMIT)
  @ApiOperation({ summary: 'A 10-minute download link for one purchased file (paid orders only)' })
  @ApiOkResponse({ schema: { properties: { url: { type: 'string' } } } })
  @ApiNotFoundResponse()
  async download(@Param('sessionId') sessionId: string, @Param('itemId') itemId: string) {
    return { url: await this.orders.downloadUrl(sessionId, itemId) };
  }

  /** Stripe calls this; the signature is checked against the raw body. */
  @Post('payments/webhook')
  @SkipThrottle()
  @ApiOperation({ summary: 'Stripe webhook (checkout.session.completed / expired)' })
  @ApiBadRequestResponse({ description: 'Bad signature' })
  webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.orders.handleWebhook(req.rawBody, signature);
  }
}

