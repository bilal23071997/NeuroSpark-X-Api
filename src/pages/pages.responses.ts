import type { PublishStatus } from '../content/publish-status.enum.js';
import type { SitePage } from './page.entity.js';

/** A text page as the admin portal receives it. The website's version is PublicPageDto. */
export class PageResponse {
  Id: string;
  Slug: string;
  Title: string;
  /** Markdown written in the rich text editor. */
  Body: string;
  Status: PublishStatus;
  PublishedAt: Date | null;
  CreatedAt: Date;
  UpdatedAt: Date;

  static from(page: SitePage): PageResponse {
    return Object.assign(new PageResponse(), {
      Id: page.id,
      Slug: page.slug,
      Title: page.title,
      Body: page.body,
      Status: page.status,
      PublishedAt: page.publishedAt,
      CreatedAt: page.createdAt,
      UpdatedAt: page.updatedAt,
    });
  }
}
