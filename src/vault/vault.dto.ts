import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SLUG_PATTERN } from '../content/helpers.js';
import { ECOSYSTEM_DESTINATION_SLUGS, PRODUCT_SYMBOLS } from './constants.js';
import { SECTION_TYPES, type FaqItem, type SectionType } from './sections.js';

const SLUG_MESSAGE = 'slug must be lowercase letters, numbers and single hyphens';
const HTTPS_URL = { protocols: ['https'], require_protocol: true };

// ---------- Groups (categories and sub-groups) ----------

export class CreateSubGroupDto {
  /** @example Tarot & Oracle */
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  /** Made from the name when left out. Unique across every group. @example tarot-oracle */
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** The id of the official category this sub-group sits under (not another sub-group). */
  @IsInt()
  parentId: number;

  /** Order among its siblings; goes last when left out. */
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;
}

/**
 * For an official category only `description` may be changed; anything else is
 * refused with 400. A sub-group can be renamed, re-described, reordered or
 * moved to another official category.
 */
export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;
}

export class ReorderSubGroupsDto {
  /** The official category whose sub-groups are being ordered. */
  @IsInt()
  parentId: number;

  /** Every sub-group id of that category, in the new order. */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];
}

export class VaultGroupNodeDto {
  id: number;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  /** Null for the five official top-level categories. */
  parentId: number | null;
  /** True for the five official categories (never deletable, renamable or movable). */
  isOfficial: boolean;
  /** Products in this group, drafts included. A top-level group also counts its sub-groups. */
  productCount: number;
  /** Sub-groups in order; always empty on a sub-group. */
  children: VaultGroupNodeDto[];
}

// ---------- Product page sections ----------

export class FaqItemDto implements FaqItem {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  question: string;

  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  answer: string;
}

export class SectionDto {
  /** Keep the id the server returned so the section stays the same one; new sections get one assigned. */
  @IsOptional()
  @IsUUID()
  id?: string;

  /** `text` needs `body`; `bullets` needs `items`; `faq` needs `faq`; `image` needs `imageUrl` and `alt`. */
  @IsIn(SECTION_TYPES)
  type: SectionType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  /** Plain text. Separate paragraphs with a blank line. */
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  items?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faq?: FaqItemDto[];

  /** A public https image URL, e.g. the `publicUrl` from POST /admin/uploads/presign. */
  @IsOptional()
  @IsUrl(HTTPS_URL)
  imageUrl?: string;

  /** Describes the image for screen readers. Required for image sections. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  alt?: string;
}

// ---------- Products ----------

export class CreateProductDto {
  /** @example The Sovereignty Starter Guide */
  @IsString()
  @MinLength(1)
  name: string;

  /** Made from the name when left out. @example sovereignty-starter-guide */
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  /**
   * The group the product sits in: the id of an official category or of one of
   * its sub-groups (from GET /admin/vault/categories).
   */
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

  /** Symbol art drawn on the product cover when there is no cover image. */
  @IsOptional()
  @IsIn(PRODUCT_SYMBOLS)
  symbol?: (typeof PRODUCT_SYMBOLS)[number];

  /** Public https URL of the cover image. Send null to remove it. */
  @IsOptional()
  @IsUrl(HTTPS_URL)
  coverImageUrl?: string | null;

  /** Public https image URLs, in display order (up to 10). Replaces the whole list. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl(HTTPS_URL, { each: true })
  galleryImages?: string[];

  /** The page blocks, in display order (up to 30). Replaces the whole list. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections?: SectionDto[];

  /**
   * The paid file: the `key` returned by POST /admin/uploads/presign for kind
   * `product-file`. Needs `fileName` and `fileSizeBytes` too. Send null to detach.
   */
  @IsOptional()
  @Matches(/^private\/[A-Za-z0-9._/-]+$/, { message: 'fileKey must be a key from a product-file upload' })
  @MaxLength(300)
  fileKey?: string | null;

  /** @example starter-guide.pdf */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fileName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  fileSizeBytes?: number | null;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

// ---------- Public (website) responses ----------

export class PublicVaultSubGroupDto {
  slug: string;
  name: string;
  description: string;
  /** Published products in this sub-group. */
  productCount: number;
}

export class PublicVaultCategoryDto extends PublicVaultSubGroupDto {
  /** Sub-groups in order. A top-level `productCount` includes them. */
  children: PublicVaultSubGroupDto[];
}

export class PublicProductSummaryDto {
  slug: string;
  name: string;
  /** The name of the group the product sits in (may be a sub-group). */
  category: string;
  categorySlug: string;
  /** The official category above it when `category` is a sub-group; otherwise null. */
  parentCategory: string | null;
  parentCategorySlug: string | null;
  format: string;
  destination: string | null;
  /** Regular price in US cents; 0 means free. */
  priceCents: number;
  /** Sale price in US cents, or null when not on sale. */
  salePriceCents: number | null;
  currency: 'USD';
  summary: string;
  symbol: string | null;
  /** Public https image URL, or null (then draw `symbol`). */
  coverImageUrl: string | null;
  isFeatured: boolean;
  isPopular: boolean;
  /** ISO date the product was first published. */
  date: string;
}

export class PublicSectionDto {
  id: string;
  type: SectionType;
  title?: string;
  body?: string;
  items?: string[];
  faq?: FaqItemDto[];
  imageUrl?: string;
  alt?: string;
}

export class PublicProductDto extends PublicProductSummaryDto {
  description: string;
  forWho: string;
  included: string[];
  delivery: string;
  galleryImages: string[];
  /** Page blocks in display order. */
  sections: PublicSectionDto[];
  /** Size of the paid file, e.g. to show "PDF · 2.4 MB". The file itself is not downloadable yet. */
  fileName: string | null;
  fileSizeBytes: number | null;
}
