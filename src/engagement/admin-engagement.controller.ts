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
import {
  CreateFreeResourceDto,
  SetReadDto,
  SetSubscribedDto,
  UpdateFreeResourceDto,
} from './engagement.dto.js';
import { EngagementService } from './engagement.service.js';
import { ContactMessageResponse, FreeResourceResponse, SubscriberResponse } from './engagement.responses.js';

@ApiTags('Admin - free resources')
@ApiBearerAuth('access-token')
@Controller('admin/free-resources')
export class AdminFreeResourcesController {
  constructor(private readonly engagement: EngagementService) {}

  @Get()
  @ApiOperation({ summary: 'List free resources (lead magnets), including unpublished ones' })
  @ApiOkResponse({ type: [FreeResourceResponse] })
  async findAll() {
    return (await this.engagement.findAllResources()).map((item) => FreeResourceResponse.from(item));
  }

  @Post()
  @ApiOperation({ summary: 'Add a free resource (hidden until isPublished is true)' })
  @ApiCreatedResponse({ type: FreeResourceResponse })
  async create(@Body() dto: CreateFreeResourceDto) {
    return FreeResourceResponse.from(await this.engagement.createResource(dto));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a free resource, or publish/hide it with isPublished' })
  @ApiOkResponse({ type: FreeResourceResponse })
  @ApiNotFoundResponse()
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFreeResourceDto) {
    return FreeResourceResponse.from(await this.engagement.updateResource(id, dto));
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
  @ApiOkResponse({ type: [SubscriberResponse] })
  async findAll(@Query('isSubscribed', new ParseBoolPipe({ optional: true })) isSubscribed?: boolean) {
    return (await this.engagement.findAllSubscribers(isSubscribed)).map((item) => SubscriberResponse.from(item));
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
  @ApiOkResponse({ type: SubscriberResponse })
  @ApiNotFoundResponse()
  async setSubscribed(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetSubscribedDto) {
    return SubscriberResponse.from(await this.engagement.setSubscribed(id, dto.isSubscribed));
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
  @ApiOkResponse({ type: [ContactMessageResponse] })
  async findAll(@Query('isRead', new ParseBoolPipe({ optional: true })) isRead?: boolean) {
    return (await this.engagement.findAllMessages(isRead)).map((item) => ContactMessageResponse.from(item));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mark a message read or unread' })
  @ApiOkResponse({ type: ContactMessageResponse })
  @ApiNotFoundResponse()
  async setRead(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetReadDto) {
    return ContactMessageResponse.from(await this.engagement.setRead(id, dto.isRead));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.engagement.removeMessage(id);
  }
}
