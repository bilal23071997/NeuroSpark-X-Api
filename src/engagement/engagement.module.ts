import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdminContactController,
  AdminFreeResourcesController,
  AdminNewsletterController,
} from './admin-engagement.controller.js';
import { ContactMessage } from './contact-message.entity.js';
import { EngagementService } from './engagement.service.js';
import { FreeResource } from './free-resource.entity.js';
import { NewsletterSubscriber } from './newsletter-subscriber.entity.js';
import { PublicEngagementController } from './public-engagement.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([FreeResource, NewsletterSubscriber, ContactMessage])],
  controllers: [
    AdminFreeResourcesController,
    AdminNewsletterController,
    AdminContactController,
    PublicEngagementController,
  ],
  providers: [EngagementService],
})
export class EngagementModule {}
