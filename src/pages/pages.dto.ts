import { PartialType } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SLUG_PATTERN } from '../content/helpers.js';

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
  slug: string;
  title: string;
}

export class PublicPageDto extends PublicPageLinkDto {
  body: string;
  /** ISO date of the last edit. */
  updatedAt: string;
}
