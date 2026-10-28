import type { Article } from './article.entity.js';
import type { Episode } from './episode.entity.js';
import type { Niche } from './niche.entity.js';
import type { PublishStatus } from './publish-status.enum.js';

// What the admin portal receives for niches, articles and episodes. The
// website's versions are in content.dto.ts (PublicNicheDto and friends).

export class NicheResponse {
  Id: string;
  Slug: string;
  Name: string;
  Description: string;
  SortOrder: number;
  CreatedAt: Date;
  UpdatedAt: Date;

  static from(niche: Niche): NicheResponse {
    return Object.assign(new NicheResponse(), {
      Id: niche.id,
      Slug: niche.slug,
      Name: niche.name,
      Description: niche.description,
      SortOrder: niche.sortOrder,
      CreatedAt: niche.createdAt,
      UpdatedAt: niche.updatedAt,
    });
  }
}

export class ArticleResponse {
  Id: string;
  Slug: string;
  Title: string;
  Excerpt: string;
  /** Paragraphs, or one block of Markdown from the rich text editor. */
  Body: string[];
  Niche: NicheResponse;
  NicheId: string;
  Status: PublishStatus;
  PublishedAt: Date | null;
  IsFeatured: boolean;
  SeoTitle: string | null;
  SeoDescription: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;

  static from(article: Article): ArticleResponse {
    return Object.assign(new ArticleResponse(), {
      Id: article.id,
      Slug: article.slug,
      Title: article.title,
      Excerpt: article.excerpt,
      Body: article.body,
      Niche: NicheResponse.from(article.niche),
      NicheId: article.nicheId,
      Status: article.status,
      PublishedAt: article.publishedAt,
      IsFeatured: article.isFeatured,
      SeoTitle: article.seoTitle,
      SeoDescription: article.seoDescription,
      CreatedAt: article.createdAt,
      UpdatedAt: article.updatedAt,
    });
  }
}

export class EpisodeResponse {
  Id: string;
  Slug: string;
  /** Slug of the podcast series. */
  Series: string;
  EpisodeNumber: number;
  Title: string;
  Description: string;
  Duration: string | null;
  YoutubeUrl: string | null;
  ShowNotes: string[];
  Status: PublishStatus;
  PublishedAt: Date | null;
  IsFeatured: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;

  static from(episode: Episode): EpisodeResponse {
    return Object.assign(new EpisodeResponse(), {
      Id: episode.id,
      Slug: episode.slug,
      Series: episode.series,
      EpisodeNumber: episode.episodeNumber,
      Title: episode.title,
      Description: episode.description,
      Duration: episode.duration,
      YoutubeUrl: episode.youtubeUrl,
      ShowNotes: episode.showNotes,
      Status: episode.status,
      PublishedAt: episode.publishedAt,
      IsFeatured: episode.isFeatured,
      CreatedAt: episode.createdAt,
      UpdatedAt: episode.updatedAt,
    });
  }
}
