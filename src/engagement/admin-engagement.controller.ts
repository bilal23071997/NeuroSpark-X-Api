import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators.js';
import { Role } from '../common/role.enum.js';
import { ContactMessage } from './contact-message.entity.js';
import {
  CreateFreeResourceDto,
  SetReadDto,
  SetSubscribedDto,
  UpdateFreeResourceDto,
} from './engagement.dto.js';
import { EngagementService } from './engagement.service.js';
import { FreeResource } from './free-resource.entity.js';
import { NewsletterSubscriber } from './newsletter-subscriber.entity.js';

@ApiTags('Admin - free resources')
@ApiBearerAuth('access-token')
@Controller('admin/free-resources')
export class AdminFreeResourcesController {
  constructor(private readonly engagement: EngagementService) {}

  @Get()
  @ApiOperation({ summary: 'List free resources (lead magnets), including unpublished ones' })
  @ApiOkResponse({ type: [FreeResource] })
  findAll() {
    return this.engagement.findAllResources();
  }

  @Post()
  @ApiOperation({ summary: 'Add a free resource (hidden until isPublished is true)' })
  @ApiCreatedResponse({ type: FreeResource })
  create(@Body() dto: CreateFreeResourceDto) {
    return this.engagement.createResource(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a free resource, or publish/hide it with isPublished' })
  @ApiOkResponse({ type: FreeResource })
  @ApiNotFoundResponse()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFreeResourceDto) {
    return this.engagement.updateResource(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a free resource' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.engagement.removeResource(id);
  }
}

/** Subscriber emails are personal data, so this is admin only. */
@ApiTags('Admin - newsletter subscribers')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/newsletter')
@Roles(Role.Admin)
export class AdminNewsletterController {
  constructor(private readonly engagement: EngagementService) {}

  @Get()
  @ApiOperation({ summary: 'List subscribers, newest first' })
  @ApiQuery({ name: 'isSubscribed', required: false, type: Boolean })
  @ApiOkResponse({ type: [NewsletterSubscriber] })
  findAll(@Query('isSubscribed', new ParseBoolPipe({ optional: true })) isSubscribed?: boolean) {
    return this.engagement.findAllSubscribers(isSubscribed);
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="newsletter-subscribers.csv"')
  @ApiOperation({ summary: 'Download active subscribers as CSV (email, source, subscribedAt)' })
  @ApiProduces('text/csv')
  exportCsv() {
    return this.engagement.exportSubscribersCsv();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mark a subscriber as subscribed or unsubscribed' })
  @ApiOkResponse({ type: NewsletterSubscriber })
  @ApiNotFoundResponse()
  setSubscribed(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetSubscribedDto) {
    return this.engagement.setSubscribed(id, dto.isSubscribed);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Erase a subscriber completely (data-deletion requests)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.engagement.removeSubscriber(id);
  }
}

/** Messages contain personal data, so this is admin only. */
@ApiTags('Admin - contact messages')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/contact-messages')
@Roles(Role.Admin)
export class AdminContactController {
  constructor(private readonly engagement: EngagementService) {}

  @Get()
  @ApiOperation({ summary: 'List contact messages, newest first' })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiOkResponse({ type: [ContactMessage] })
  findAll(@Query('isRead', new ParseBoolPipe({ optional: true })) isRead?: boolean) {
    return this.engagement.findAllMessages(isRead);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mark a message read or unread' })
  @ApiOkResponse({ type: ContactMessage })
  @ApiNotFoundResponse()
  setRead(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetReadDto) {
    return this.engagement.setRead(id, dto.isRead);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.engagement.removeMessage(id);
  }
}
