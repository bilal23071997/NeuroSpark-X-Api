import type { PublishStatus } from '../content/publish-status.enum.js';
import type { Product } from './product.entity.js';
import { ProductSectionResponse } from './vault.dto.js';
import type { VaultCategory } from './vault-category.entity.js';

// What the admin portal receives for Vault products and for a single group.
// The group tree is VaultGroupNodeDto and the website's product pages are
// PublicProductDto, both in vault.dto.ts.

/** One group on its own (after it is created or edited). */
export class VaultGroupResponse {
  Id: number;
  Slug: string;
  Name: string;
  Description: string;
  SortOrder: number;
  /** Null for top-level groups. */
  ParentId: number | null;
  IsOfficial: boolean;

  static from(group: VaultCategory): VaultGroupResponse {
    return Object.assign(new VaultGroupResponse(), {
      Id: group.id,
      Slug: group.slug,
      Name: group.name,
      Description: group.description,
      SortOrder: group.sortOrder,
      ParentId: group.parentId,
      IsOfficial: group.isOfficial,
    });
  }
}

/** The group a product sits in, as a short reference. */
export class ProductGroupResponse {
  Id: number;
  Slug: string;
  Name: string;
  ParentId: number | null;

  static from(group: VaultCategory): ProductGroupResponse {
    return Object.assign(new ProductGroupResponse(), {
      Id: group.id,
      Slug: group.slug,
      Name: group.name,
      ParentId: group.parentId,
    });
  }
}

export class ProductResponse {
  Id: string;
  Slug: string;
  Name: string;
  Summary: string;
  Description: string;
  /** US cents; 0 means free. */
  PriceCents: number;
  SalePriceCents: number | null;
  Format: string;
  Delivery: string;
  Destination: string | null;
  ForWho: string;
  Included: string[];
  Symbol: string | null;
  CoverImageUrl: string | null;
  GalleryImages: string[];
  Sections: ProductSectionResponse[];
  /** The storage key of the paid file; admin only, never sent to the website. */
  FileKey: string | null;
  FileName: string | null;
  FileSizeBytes: number | null;
  CategoryId: number;
  Category: ProductGroupResponse;
  Status: PublishStatus;
  PublishedAt: Date | null;
  IsFeatured: boolean;
  IsPopular: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;

  static from(product: Product): ProductResponse {
    return Object.assign(new ProductResponse(), {
      Id: product.id,
      Slug: product.slug,
      Name: product.name,
      Summary: product.summary,
      Description: product.description,
      PriceCents: product.priceCents,
      SalePriceCents: product.salePriceCents,
      Format: product.format,
      Delivery: product.delivery,
      Destination: product.destination,
      ForWho: product.forWho,
      Included: product.included,
      Symbol: product.symbol,
      CoverImageUrl: product.coverImageUrl,
      GalleryImages: product.galleryImages,
      Sections: product.sections.map((section) =>
        ProductSectionResponse.from(section),
      ),
      FileKey: product.fileKey,
      FileName: product.fileName,
      FileSizeBytes: product.fileSizeBytes,
      CategoryId: product.categoryId,
      Category: ProductGroupResponse.from(product.category),
      Status: product.status,
      PublishedAt: product.publishedAt,
      IsFeatured: product.isFeatured,
      IsPopular: product.isPopular,
      CreatedAt: product.createdAt,
      UpdatedAt: product.updatedAt,
    });
  }
}
