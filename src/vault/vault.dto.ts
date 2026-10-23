import { PartialType } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { SLUG_PATTERN } from '../content/helpers.js';
import { ECOSYSTEM_DESTINATION_SLUGS, PRODUCT_SYMBOLS } from './constants.js';

export class CreateProductDto {
  /** @example The Sovereignty Starter Guide */
  @IsString()
  @MinLength(1)
  name: string;

  /** Made from the name when left out. @example sovereignty-starter-guide */
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase letters, numbers and single hyphens' })
  slug?: string;

  /** The category id from GET /admin/vault/categories. */
  @IsInt()
  categoryId: number;

  @IsString()
  @MinLength(1)
  summary: string;

  @IsString()
  @MinLength(1)
  description: string;

  /** Regular price in US cents. 1900 means $19.00; 0 means free. @example 1900 */
  @IsInt()
  @Min(0)
  priceCents: number;

  /** Sale price in US cents, lower than the regular price. Send null to end a sale. @example 1500 */
  @IsOptional()
  @IsInt()
  @Min(0)
  salePriceCents?: number | null;

  /** @example Digital Guide */
  @IsString()
  @MinLength(1)
  format: string;

  /** @example Instant download (PDF) */
  @IsString()
  @MinLength(1)
  delivery: string;

  /** One of the five official ecosystem destinations. */
  @IsOptional()
  @IsIn(ECOSYSTEM_DESTINATION_SLUGS)
  destination?: (typeof ECOSYSTEM_DESTINATION_SLUGS)[number];

  @IsOptional()
  @IsString()
  forWho?: string;

  /** What the buyer gets, one line each. */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  included?: string[];

  /** Symbol art drawn on the product cover. */
  @IsOptional()
  @IsIn(PRODUCT_SYMBOLS)
  symbol?: (typeof PRODUCT_SYMBOLS)[number];

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

// ---------- Public (website) responses ----------

export class PublicVaultCategoryDto {
  slug: string;
  name: string;
  description: string;
}

export class PublicProductSummaryDto {
  slug: string;
  name: string;
  /** The category name. */
  category: string;
  categorySlug: string;
  format: string;
  destination: string | null;
  /** Regular price in US cents; 0 means free. */
  priceCents: number;
  /** Sale price in US cents, or null when not on sale. */
  salePriceCents: number | null;
  currency: 'USD';
  summary: string;
  symbol: string | null;
  isFeatured: boolean;
  isPopular: boolean;
  /** ISO date the product was first published. */
  date: string;
}

export class PublicProductDto extends PublicProductSummaryDto {
  description: string;
  forWho: string;
  included: string[];
  delivery: string;
}
