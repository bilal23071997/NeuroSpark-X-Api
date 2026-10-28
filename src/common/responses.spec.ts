import { describe, expect, it } from 'vitest';
import type { Article } from '../content/article.entity.js';
import {
  ArticleResponse,
  EpisodeResponse,
  NicheResponse,
} from '../content/content.responses.js';
import type { Episode } from '../content/episode.entity.js';
import type { Niche } from '../content/niche.entity.js';
import type { ContactMessage } from '../engagement/contact-message.entity.js';
import {
  ContactMessageResponse,
  FreeResourceResponse,
  SubscriberResponse,
} from '../engagement/engagement.responses.js';
import { PublicFreeResourceDto } from '../engagement/engagement.dto.js';
import type { FreeResource } from '../engagement/free-resource.entity.js';
import type { NewsletterSubscriber } from '../engagement/newsletter-subscriber.entity.js';
import type { SitePage } from '../pages/page.entity.js';
import { PublicPageDto, PublicPageLinkDto } from '../pages/pages.dto.js';
import { PageResponse } from '../pages/pages.responses.js';
import { OrderItemDto } from '../payments/payments.dto.js';
import type { RoleEntity } from '../roles/role.entity.js';
import type { User } from '../users/user.entity.js';
import { RoleResponse, UserResponse } from '../users/users.responses.js';
import type { Product } from '../vault/product.entity.js';
import type { ProductSection } from '../vault/sections.js';
import { ProductSectionResponse } from '../vault/vault.dto.js';
import { ProductResponse } from '../vault/vault.responses.js';

/** The answers are sent as JSON, so test what the browser would receive. */
const sent = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown;

/** Every key at every depth must start with a capital letter. */
function lowerCaseKeys(value: unknown, path = ''): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, i) => lowerCaseKeys(item, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, inner]) => [
      ...(/^[a-z]/.test(key) ? [`${path}.${key}`] : []),
      ...lowerCaseKeys(inner, `${path}.${key}`),
    ]);
  }
  return [];
}

const when = new Date('2026-01-02T03:04:05.000Z');
const niche = {
  id: 'n1',
  slug: 'astro',
  name: 'Astro',
  description: 'd',
  sortOrder: 1,
  createdAt: when,
  updatedAt: when,
} as Niche;

describe('response classes', () => {
  it('niche, article and episode', () => {
    const article = {
      id: 'a1',
      slug: 's',
      title: 't',
      excerpt: 'e',
      body: ['p'],
      niche,
      nicheId: 'n1',
      status: 'draft',
      publishedAt: null,
      isFeatured: false,
      seoTitle: null,
      seoDescription: null,
      createdAt: when,
      updatedAt: when,
    } as unknown as Article;
    const episode = {
      id: 'e1',
      slug: 's',
      series: 'x',
      episodeNumber: 3,
      title: 't',
      description: 'd',
      duration: null,
      youtubeUrl: null,
      showNotes: ['a'],
      status: 'draft',
      publishedAt: null,
      isFeatured: false,
      createdAt: when,
      updatedAt: when,
    } as unknown as Episode;

    const out = sent([
      NicheResponse.from(niche),
      ArticleResponse.from(article),
      EpisodeResponse.from(episode),
    ]);
    expect(lowerCaseKeys(out)).toEqual([]);
    expect(out).toMatchObject([
      { Id: 'n1', SortOrder: 1, CreatedAt: '2026-01-02T03:04:05.000Z' },
      {
        Id: 'a1',
        NicheId: 'n1',
        Niche: { Slug: 'astro' },
        IsFeatured: false,
        SeoTitle: null,
      },
      { Id: 'e1', EpisodeNumber: 3, YoutubeUrl: null, ShowNotes: ['a'] },
    ]);
  });

  it('free resource, subscriber, message', () => {
    const resource = {
      id: 'r',
      title: 't',
      description: 'd',
      type: 'Guide',
      destination: null,
      url: 'https://x.y',
      isPublished: true,
      sortOrder: 1,
      createdAt: when,
      updatedAt: when,
    } as FreeResource;
    const subscriber = {
      id: 's',
      email: 'a@b.c',
      source: null,
      isSubscribed: true,
      subscribedAt: when,
      unsubscribedAt: null,
    } as NewsletterSubscriber;
    const message = {
      id: 'm',
      name: 'n',
      email: 'a@b.c',
      subject: null,
      message: 'hi',
      isRead: false,
      createdAt: when,
    } as ContactMessage;
    const out = sent([
      FreeResourceResponse.from(resource),
      PublicFreeResourceDto.from(resource),
      SubscriberResponse.from(subscriber),
      ContactMessageResponse.from(message),
    ]);
    expect(lowerCaseKeys(out)).toEqual([]);
    expect(out).toMatchObject([
      { IsPublished: true, SortOrder: 1 },
      { Title: 't', Url: 'https://x.y' },
      { IsSubscribed: true, UnsubscribedAt: null },
      { Message: 'hi', IsRead: false },
    ]);
  });

  it('pages', () => {
    const page = {
      id: 'p',
      slug: 's',
      title: 't',
      body: 'b',
      status: 'published',
      publishedAt: when,
      createdAt: when,
      updatedAt: when,
    } as unknown as SitePage;
    const out = sent([
      PageResponse.from(page),
      PublicPageLinkDto.from(page),
      PublicPageDto.from(page),
    ]);
    expect(lowerCaseKeys(out)).toEqual([]);
    expect(out).toMatchObject([
      { Body: 'b', Status: 'published' },
      { Slug: 's', Title: 't' },
      { Body: 'b', UpdatedAt: '2026-01-02T03:04:05.000Z' },
    ]);
  });

  it('users and roles never expose password or token hashes', () => {
    const role = { id: 1, name: 'admin', description: 'd' } as RoleEntity;
    const user = {
      id: 'u',
      email: 'a@b.c',
      name: 'A',
      role,
      isActive: true,
      createdAt: when,
      updatedAt: when,
      passwordHash: 'secret',
      refreshTokenHash: 'secret',
    } as User;
    const out = sent([RoleResponse.from(role), UserResponse.from(user)]);
    expect(lowerCaseKeys(out)).toEqual([]);
    expect(JSON.stringify(out)).not.toContain('secret');
    expect(out).toMatchObject([
      { Id: 1 },
      { Role: { Name: 'admin' }, IsActive: true },
    ]);
  });

  it('product sections keep their content and use capitalised keys', () => {
    const sections: ProductSection[] = [
      { id: 'a', type: 'text', title: 'T', body: 'B' },
      { id: 'b', type: 'bullets', items: ['x', 'y'] },
      { id: 'c', type: 'faq', faq: [{ question: 'Q?', answer: 'A.' }] },
      { id: 'd', type: 'image', imageUrl: 'https://x.y/i.png', alt: 'alt' },
    ];
    const out = sent(
      sections.map((section) => ProductSectionResponse.from(section)),
    );
    expect(lowerCaseKeys(out)).toEqual([]);
    expect(out).toEqual([
      { Id: 'a', Type: 'text', Title: 'T', Body: 'B' },
      { Id: 'b', Type: 'bullets', Items: ['x', 'y'] },
      { Id: 'c', Type: 'faq', Faq: [{ Question: 'Q?', Answer: 'A.' }] },
      { Id: 'd', Type: 'image', ImageUrl: 'https://x.y/i.png', Alt: 'alt' },
    ]);
  });

  it('admin product', () => {
    const product = {
      id: 'p',
      slug: 's',
      name: 'n',
      summary: 's',
      description: 'd',
      priceCents: 100,
      salePriceCents: null,
      format: 'PDF',
      delivery: 'x',
      destination: null,
      forWho: 'f',
      included: ['i'],
      symbol: null,
      coverImageUrl: null,
      galleryImages: [],
      sections: [{ id: 'a', type: 'text', body: 'B' }],
      fileKey: null,
      fileName: null,
      fileSizeBytes: null,
      categoryId: 2,
      category: {
        id: 2,
        slug: 'c',
        name: 'C',
        parentId: null,
        description: 'x',
        sortOrder: 1,
        isOfficial: true,
      },
      status: 'draft',
      publishedAt: null,
      isFeatured: false,
      isPopular: false,
      createdAt: when,
      updatedAt: when,
    } as unknown as Product;
    const out = sent(ProductResponse.from(product));
    expect(lowerCaseKeys(out)).toEqual([]);
    expect(out).toMatchObject({
      PriceCents: 100,
      CategoryId: 2,
      Category: { Id: 2, Slug: 'c', ParentId: null },
      Sections: [{ Body: 'B' }],
    });
  });

  it('order item', () => {
    const out = sent(
      OrderItemDto.from(
        { id: 'i', name: 'n', unitPriceCents: 5 } as never,
        true,
      ),
    );
    expect(out).toEqual({
      Id: 'i',
      Name: 'n',
      UnitPriceCents: 5,
      Downloadable: true,
    });
  });
});
