import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators.js';
import {
  AcknowledgedDto,
  PublicFreeResourceDto,
  SendContactMessageDto,
  SubscribeDto,
} from './engagement.dto.js';
import { EngagementService } from './engagement.service.js';

// Public form posts: at most 5 per minute per IP.
const FORM_LIMIT = { default: { limit: 5, ttl: 60_000 } };

/** Website-facing: free resources, newsletter sign-up and the contact form. No sign-in. */
@ApiTags('Public - forms and free resources')
@Public()
@Controller('public')
export class PublicEngagementController {
  constructor(private readonly engagement: EngagementService) {}

  @Get('free-resources')
  @ApiOperation({ summary: 'Published free resources, in display order' })
  @ApiOkResponse({ type: [PublicFreeResourceDto] })
  listFreeResources() {
    return this.engagement.listPublishedResources();
  }

  @Post('newsletter')
  @HttpCode(200)
  @Throttle(FORM_LIMIT)
  @ApiOperation({
    summary: 'Sign up for the newsletter',
    description:
      'Stores the address only; no email is sent yet. Always answers ok, so it never reveals whether an address was already subscribed.',
  })
  @ApiOkResponse({ type: AcknowledgedDto })
  @ApiTooManyRequestsResponse({ description: 'More than 5 requests in a minute' })
  subscribe(@Body() dto: SubscribeDto) {
    return this.engagement.subscribe(dto);
  }

  @Post('contact')
  @HttpCode(200)
  @Throttle(FORM_LIMIT)
  @ApiOperation({
    summary: 'Send a contact message',
    description: 'Stored for the admin to read; no email is sent yet.',
  })
  @ApiOkResponse({ type: AcknowledgedDto })
  @ApiTooManyRequestsResponse({ description: 'More than 5 requests in a minute' })
  sendMessage(@Body() dto: SendContactMessageDto) {
    return this.engagement.sendMessage(dto);
  }
}
