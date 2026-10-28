import { PartialType } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SLUG_PATTERN } from '../content/helpers.js';
import type { SitePage } from './page.entity.js';

export class CreatePageDto {
  /** The page address: "privacy" is served at /privacy. Lowercase letters, numbers, hyphens. @example privacy */
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase letters, numbers and single hyphens' })
  @MaxLength(60)
  slug: string;

  /** @example Privacy Policy */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  /** Plain text. Separate paragraphs with a blank line; start a paragraph with "## " for a heading. */
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  body: string;
}

export class UpdatePageDto extends PartialType(CreatePageDto) {}

export class PublicPageLinkDto {
  Slug: string;
  Title: string;

  static from(page: SitePage): PublicPageLinkDto {
    return Object.assign(new PublicPageLinkDto(), { Slug: page.slug, Title: page.title });
  }
}

export class PublicPageDto extends PublicPageLinkDto {
  Body: string;
  /** ISO date of the last edit. */
  UpdatedAt: string;

  static from(page: SitePage): PublicPageDto {
    return Object.assign(new PublicPageDto(), {
      Slug: page.slug,
      Title: page.title,
      Body: page.body,
      UpdatedAt: page.updatedAt.toISOString(),
    });
  }
}
