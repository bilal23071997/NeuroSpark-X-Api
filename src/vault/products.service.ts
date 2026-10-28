import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { assertSlugFree, slugify } from '../content/helpers.js';
import { PublishStatus } from '../content/publish-status.enum.js';
import { Product } from './product.entity.js';
import { normalizeSections } from './sections.js';
import type {
  CreateProductDto,
  PublicProductDto,
  PublicProductSummaryDto,
  UpdateProductDto,
} from './vault.dto.js';
import { VaultCategoriesService } from './vault-categories.service.js';

/** Fields that may be set back to null; null for any other field is ignored. */
const NULLABLE_FIELDS = [
  'salePriceCents',
  'destination',
  'symbol',
  'coverImageUrl',
  'fileKey',
  'fileName',
  'fileSizeBytes',
];

/** A group (category or sub-group) is loaded together with its parent. */
const WITH_GROUP = { category: { parent: true } } as const;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly categories: VaultCategoriesService,
  ) {}

  // ---------- Admin ----------

  /** `categoryId` of an official category also matches products in its sub-groups. */
  findAll(filter: { status?: PublishStatus; categoryId?: number }) {
    const base: FindOptionsWhere<Product> = filter.status
      ? { status: filter.status }
      : {};
    return this.products.find({
      // TypeORM rejects `undefined` values, so only pass the filters that were given.
      where: filter.categoryId
        ? [
            { ...base, categoryId: filter.categoryId },
            { ...base, category: { parentId: filter.categoryId } },
          ]
        : base,
      relations: WITH_GROUP,
      order: { createdAt: 'DESC' },
    });
  }

  async get(id: string) {
    const product = await this.products.findOne({
      where: { id },
      relations: WITH_GROUP,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    const slug = dto.slug ?? slugify(dto.name);
    await assertSlugFree(this.products, slug);
    await this.categories.getOrFail(dto.categoryId);
    this.assertPrices(dto.priceCents, dto.salePriceCents ?? null);

    const product = this.products.create({
      ...dto,
      slug,
      sections: dto.sections ? normalizeSections(dto.sections) : [],
    });
    this.assertFileFields(product);
    return this.save(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.get(id);
    if (dto.slug && dto.slug !== product.slug)
      await assertSlugFree(this.products, dto.slug, id);
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      await this.categories.getOrFail(dto.categoryId);
    }

    // A PATCH may send null to clear an optional field; for required fields it is ignored.
    const changes: Record<string, unknown> = Object.fromEntries(
      Object.entries(dto).filter(
        ([key, value]) => value !== null || NULLABLE_FIELDS.includes(key),
      ),
    );
    if (dto.sections) changes.sections = normalizeSections(dto.sections);

    // Drop the loaded relation so the new categoryId is what gets saved.
    const { category: _category, ...rest } = product;
    const merged = Object.assign(rest as Product, changes);
    this.assertPrices(merged.priceCents, merged.salePriceCents);
    this.assertFileFields(merged);
    return this.save(merged);
  }

  async publish(id: string) {
    const product = await this.get(id);
    product.status = PublishStatus.Published;
    product.publishedAt ??= new Date();
    return this.save(product);
  }

  async unpublish(id: string) {
    const product = await this.get(id);
    product.status = PublishStatus.Draft;
    return this.save(product);
  }

  async remove(id: string) {
    await this.get(id);
    // Once orders exist, deleting a bought product must be blocked; there are none yet.
    // The uploaded files stay in the bucket; cleaning them up is a separate, later job.
    await this.products.delete(id);
  }

  // ---------- Public ----------

  /** A top-level `categorySlug` also returns the products of its sub-groups. */
  async listPublished(filter: {
    categorySlug?: string;
    featured?: boolean;
    popular?: boolean;
  }): Promise<PublicProductSummaryDto[]> {
    const base: FindOptionsWhere<Product> = {
      status: PublishStatus.Published,
      ...(filter.featured ? { isFeatured: true } : {}),
      ...(filter.popular ? { isPopular: true } : {}),
    };
    const products = await this.products.find({
      where: filter.categorySlug
        ? [
            { ...base, category: { slug: filter.categorySlug } },
            { ...base, category: { parent: { slug: filter.categorySlug } } },
          ]
        : base,
      relations: WITH_GROUP,
      order: { publishedAt: 'DESC' },
    });
    return products.map((product) => this.toSummary(product));
  }

  async getPublished(slug: string): Promise<PublicProductDto> {
    const product = await this.products.findOne({
      where: { slug, status: PublishStatus.Published },
      relations: WITH_GROUP,
    });
    if (!product) throw new NotFoundException('Product not found');
    return {
      ...this.toSummary(product),
      description: product.description,
      forWho: product.forWho,
      included: product.included,
      delivery: product.delivery,
      galleryImages: product.galleryImages,
      sections: product.sections,
      // The size is public; the file key is not — it is never put in a public response.
      fileName: product.fileName,
      fileSizeBytes: product.fileSizeBytes,
    };
  }

  // ---------- Internals ----------

  private assertPrices(priceCents: number, salePriceCents: number | null) {
    if (
      salePriceCents !== null &&
      (salePriceCents <= 0 || salePriceCents >= priceCents)
    ) {
      throw new BadRequestException(
        'salePriceCents must be above 0 and lower than priceCents',
      );
    }
  }

  /** The paid file is described by its key, name and size together, or not at all. */
  private assertFileFields(
    product: Pick<Product, 'fileKey' | 'fileName' | 'fileSizeBytes'>,
  ) {
    const set = [
      product.fileKey,
      product.fileName,
      product.fileSizeBytes,
    ].filter((value) => value !== null && value !== undefined).length;
    if (set !== 0 && set !== 3) {
      throw new BadRequestException(
        'fileKey, fileName and fileSizeBytes must be set together (or all cleared)',
      );
    }
  }

  private async save(product: Product) {
    const saved = await this.products.save(product);
    return this.get(saved.id);
  }

  private toSummary(product: Product): PublicProductSummaryDto {
    return {
      slug: product.slug,
      name: product.name,
      category: product.category.name,
      categorySlug: product.category.slug,
      parentCategory: product.category.parent?.name ?? null,
      parentCategorySlug: product.category.parent?.slug ?? null,
      format: product.format,
      destination: product.destination,
      priceCents: product.priceCents,
      salePriceCents: product.salePriceCents,
      currency: 'USD',
      summary: product.summary,
      symbol: product.symbol,
      coverImageUrl: product.coverImageUrl,
      isFeatured: product.isFeatured,
      isPopular: product.isPopular,
      // The file key itself stays private; only whether a sale is possible is public.
      purchasable: product.priceCents > 0 && Boolean(product.fileKey),
      date: product.publishedAt!.toISOString(),
    };
  }
}
