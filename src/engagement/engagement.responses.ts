import type { ContactMessage } from './contact-message.entity.js';
import type { FreeResource } from './free-resource.entity.js';
import type { NewsletterSubscriber } from './newsletter-subscriber.entity.js';

// What the admin portal receives for free resources, newsletter subscribers
// and contact messages. The website's free resource card is PublicFreeResourceDto.

export class FreeResourceResponse {
  Id: string;
  Title: string;
  Description: string;
  Type: string;
  Destination: string | null;
  Url: string;
  IsPublished: boolean;
  SortOrder: number;
  CreatedAt: Date;
  UpdatedAt: Date;

  static from(resource: FreeResource): FreeResourceResponse {
    return Object.assign(new FreeResourceResponse(), {
      Id: resource.id,
      Title: resource.title,
      Description: resource.description,
      Type: resource.type,
      Destination: resource.destination,
      Url: resource.url,
      IsPublished: resource.isPublished,
      SortOrder: resource.sortOrder,
      CreatedAt: resource.createdAt,
      UpdatedAt: resource.updatedAt,
    });
  }
}

export class SubscriberResponse {
  Id: string;
  Email: string;
  Source: string | null;
  IsSubscribed: boolean;
  SubscribedAt: Date;
  UnsubscribedAt: Date | null;

  static from(subscriber: NewsletterSubscriber): SubscriberResponse {
    return Object.assign(new SubscriberResponse(), {
      Id: subscriber.id,
      Email: subscriber.email,
      Source: subscriber.source,
      IsSubscribed: subscriber.isSubscribed,
      SubscribedAt: subscriber.subscribedAt,
      UnsubscribedAt: subscriber.unsubscribedAt,
    });
  }
}

export class ContactMessageResponse {
  Id: string;
  Name: string;
  Email: string;
  Subject: string | null;
  Message: string;
  IsRead: boolean;
  CreatedAt: Date;

  static from(message: ContactMessage): ContactMessageResponse {
    return Object.assign(new ContactMessageResponse(), {
      Id: message.id,
      Name: message.name,
      Email: message.email,
      Subject: message.subject,
      Message: message.message,
      IsRead: message.isRead,
      CreatedAt: message.createdAt,
    });
  }
}
