import { PartialType } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { SLUG_PATTERN, YOUTUBE_URL_PATTERN } from './helpers.js';
import type { Niche } from './niche.entity.js';

const SLUG_MESSAGE = 'slug must be lowercase letters, numbers and single hyphens';

// ---------- Niches ----------

export class CreateNicheDto {
  /** @example AI Business & Systems */
  @IsString()
  @MinLength(1)
  name: string;

  /** Made from the name when left out. @example ai-business-systems */
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Lower numbers show first. */
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateNicheDto extends PartialType(CreateNicheDto) {}

// ---------- Articles ----------

export class CreateArticleDto {
  /** @example Custom GPTs Are the New Business Infrastructure */
  @IsString()
  @MinLength(1)
  title: string;

  /** Made from the title when left out. @example custom-gpts-for-business */
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  @IsString()
  @MinLength(1)
  excerpt: string;

  /** Paragraphs, in order. */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  body: string[];

  /** The niche this article is filed under. */
  @IsUUID()
  nicheId: string;

  /** Making this true un-features the current featured article. */
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}

// ---------- Episodes ----------

export class CreateEpisodeDto {
  /** @example The Sovereignty Stack: Healing, Systems, and Ownership */
  @IsString()
  @MinLength(1)
  title: string;

  /** Made from the title when left out. */
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  /**
   * Slug of the podcast series. The series list is hardcoded on the website,
   * so this must match one of its slugs.
   * @example build-with-ai
   */
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  series: string;

  @IsInt()
  @Min(1)
  episodeNumber: number;

  @IsString()
  @MinLength(1)
  description: string;

  /** @example 41 min */
  @IsOptional()
  @IsString()
  duration?: string;

  /**
   * The YouTube link for this episode. Required before the episode can be published.
   * @example https://www.youtube.com/watch?v=dQw4w9WgXcQ
   */
  @IsOptional()
  @Matches(YOUTUBE_URL_PATTERN, { message: 'youtubeUrl must be a YouTube video link' })
  youtubeUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  showNotes?: string[];

  /** Making this true un-features the current featured episode. */
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateEpisodeDto extends PartialType(CreateEpisodeDto) {}

// ---------- Public (website) responses ----------

export class PublicNicheDto {
  Slug: string;
  Name: string;
  Description: string;

  static from(niche: Niche): PublicNicheDto {
    return Object.assign(new PublicNicheDto(), {
      Slug: niche.slug,
      Name: niche.name,
      Description: niche.description,
    });
  }
}

export class PublicArticleSummaryDto {
  Slug: string;
  Title: string;
  /** The niche name. */
  Category: string;
  NicheSlug: string;
  Excerpt: string;
  /** ISO date the article was first published. */
  Date: string;
  /** @example 9 min read */
  ReadTime: string;
  IsFeatured: boolean;
}

export class PublicArticleDto extends PublicArticleSummaryDto {
  Body: string[];
  SeoTitle: string | null;
  SeoDescription: string | null;
}

export class PublicEpisodeDto {
  Slug: string;
  Title: string;
  /** Slug of the podcast series. */
  Series: string;
  EpisodeNumber: number;
  Duration: string | null;
  Description: string;
  ShowNotes: string[];
  YoutubeUrl: string;
  /** ISO date the episode was first published. */
  Date: string;
  IsFeatured: boolean;
}
