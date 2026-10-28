import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PublicFreeResourceDto,
  type AcknowledgedDto,
  type CreateFreeResourceDto,
  type SendContactMessageDto,
  type SubscribeDto,
  type UpdateFreeResourceDto,
} from './engagement.dto.js';
import { ContactMessage } from './contact-message.entity.js';
import { FreeResource } from './free-resource.entity.js';
import { NewsletterSubscriber } from './newsletter-subscriber.entity.js';

/** Stops spreadsheet apps from running a cell that starts with = + - @ as a formula. */
function csvCell(value: string | null) {
  const text = value ?? '';
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

@Injectable()
export class EngagementService {
  constructor(
    @InjectRepository(FreeResource) private readonly resources: Repository<FreeResource>,
    @InjectRepository(NewsletterSubscriber)
    private readonly subscribers: Repository<NewsletterSubscriber>,
    @InjectRepository(ContactMessage) private readonly messages: Repository<ContactMessage>,
  ) {}

  // ---------- Free resources ----------

  findAllResources() {
    return this.resources.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }

  async getResource(id: string) {
    const resource = await this.resources.findOneBy({ id });
    if (!resource) throw new NotFoundException('Free resource not found');
    return resource;
  }

  createResource(dto: CreateFreeResourceDto) {
    return this.resources.save(this.resources.create(dto));
  }

  async updateResource(id: string, dto: UpdateFreeResourceDto) {
    const resource = await this.getResource(id);
    return this.resources.save(Object.assign(resource, dto));
  }

  async removeResource(id: string) {
    await this.getResource(id);
    await this.resources.delete(id);
  }

  async listPublishedResources(): Promise<PublicFreeResourceDto[]> {
    const resources = await this.resources.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
    return resources.map((resource) => PublicFreeResourceDto.from(resource));
  }

  // ---------- Newsletter ----------

  /** Adds or re-activates a subscriber. Never reveals whether the address was already known. */
  async subscribe(dto: SubscribeDto) {
    const email = dto.email.trim().toLowerCase();
    // Insert-or-ignore so two sign-ups at the same moment cannot collide on the unique email.
    await this.subscribers
      .createQueryBuilder()
      .insert()
      .values({ email, source: dto.source ?? null })
      .orIgnore()
      .execute();
    // Someone who had unsubscribed and signs up again is subscribed again.
    await this.subscribers.update(
      { email, isSubscribed: false },
      { isSubscribed: true, unsubscribedAt: null },
    );
    return { Ok: true } satisfies AcknowledgedDto;
  }

  findAllSubscribers(isSubscribed?: boolean) {
    return this.subscribers.find({
      where: isSubscribed === undefined ? {} : { isSubscribed },
      order: { subscribedAt: 'DESC' },
    });
  }

  async setSubscribed(id: string, isSubscribed: boolean) {
    const subscriber = await this.subscribers.findOneBy({ id });
    if (!subscriber) throw new NotFoundException('Subscriber not found');
    subscriber.isSubscribed = isSubscribed;
    subscriber.unsubscribedAt = isSubscribed ? null : new Date();
    return this.subscribers.save(subscriber);
  }

  /** Erases a subscriber completely, e.g. when they ask for their data to be deleted. */
  async removeSubscriber(id: string) {
    const subscriber = await this.subscribers.findOneBy({ id });
    if (!subscriber) throw new NotFoundException('Subscriber not found');
    await this.subscribers.delete(id);
  }

  async exportSubscribersCsv() {
    const subscribers = await this.findAllSubscribers(true);
    const rows = subscribers.map((s) =>
      [csvCell(s.email), csvCell(s.source), csvCell(s.subscribedAt.toISOString())].join(','),
    );
    return ['email,source,subscribedAt', ...rows].join('\n') + '\n';
  }

  // ---------- Contact messages ----------

  async sendMessage(dto: SendContactMessageDto) {
    await this.messages.insert({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      subject: dto.subject?.trim() || null,
      message: dto.message.trim(),
    });
    return { Ok: true } satisfies AcknowledgedDto;
  }

  findAllMessages(isRead?: boolean) {
    return this.messages.find({
      where: isRead === undefined ? {} : { isRead },
      order: { createdAt: 'DESC' },
    });
  }

  async setRead(id: string, isRead: boolean) {
    const message = await this.messages.findOneBy({ id });
    if (!message) throw new NotFoundException('Message not found');
    message.isRead = isRead;
    return this.messages.save(message);
  }

  async removeMessage(id: string) {
    const message = await this.messages.findOneBy({ id });
    if (!message) throw new NotFoundException('Message not found');
    await this.messages.delete(id);
  }
}
