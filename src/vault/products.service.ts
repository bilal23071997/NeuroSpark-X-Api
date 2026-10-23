import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { assertSlugFree, slugify } from '../content/helpers.js';
import { PublishStatus } from '../content/publish-status.enum.js';
import { Product } from './product.entity.js';
import type {
  CreateProductDto,
  PublicProductDto,
  PublicProductSummaryDto,
  UpdateProductDto,
} from './vault.dto.js';
import { VaultCategoriesService } from './vault-categories.service.js';

/** Fields that may be set back to null; null for any other field is ignored. */
const NULLABLE_FIELDS = ['salePriceCents', 'destination', 'symbol'];

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly categories: VaultCategoriesService,
  ) {}

  // ---------- Admin ----------

  findAll(filter: { status?: PublishStatus; categoryId?: number }) {
    return this.products.find({
      // TypeORM rejects `undefined` values, so only pass the filters that were given.
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      },
      relations: { category: true },
      order: { createdAt: 'DESC' },
    });
  }

  async get(id: string) {
    const product = await this.products.findOne({ where: { id }, relations: { category: true } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    const slug = dto.slug ?? slugify(dto.name);
    await assertSlugFree(this.products, slug);
    await this.categories.getOrFail(dto.categoryId);
    this.assertPrices(dto.priceCents, dto.salePriceCents ?? null);
    return this.save(this.products.create({ ...dto, slug }));
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.get(id);
    if (dto.slug && dto.slug !== product.slug) await assertSlugFree(this.products, dto.slug, id);
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      await this.categories.getOrFail(dto.categoryId);
    }

    // A PATCH may send null to clear an optional field; for required fields it is ignored.
    const changes = Object.fromEntries(
      Object.entries(dto).filter(([key, value]) => value !== null || NULLABLE_FIELDS.includes(key)),
    );
    // Drop the loaded relation so the new categoryId is what gets saved.
    const { category: _category, ...rest } = product;
    const merged = Object.assign(rest as Product, changes);
    this.assertPrices(merged.priceCents, merged.salePriceCents);
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
    await this.products.delete(id);
  }

  // ---------- Public ----------

  async listPublished(filter: {
    categorySlug?: string;
    featured?: boolean;
    popular?: boolean;
  }): Promise<PublicProductSummaryDto[]> {
    const products = await this.products.find({
      where: {
        status: PublishStatus.Published,
        ...(filter.categorySlug ? { category: { slug: filter.categorySlug } } : {}),
        ...(filter.featured ? { isFeatured: true } : {}),
        ...(filter.popular ? { isPopular: true } : {}),
      },
      relations: { category: true },
      order: { publishedAt: 'DESC' },
    });
    return products.map((product) => this.toSummary(product));
  }

  async getPublished(slug: string): Promise<PublicProductDto> {
    const product = await this.products.findOne({
      where: { slug, status: PublishStatus.Published },
      relations: { category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return {
      ...this.toSummary(product),
      description: product.description,
      forWho: product.forWho,
      included: product.included,
      delivery: product.delivery,
    };
  }

  // ---------- Internals ----------

  private assertPrices(priceCents: number, salePriceCents: number | null) {
    if (salePriceCents !== null && salePriceCents >= priceCents) {
      throw new BadRequestException('salePriceCents must be lower than priceCents');
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
      format: product.format,
      destination: product.destination,
      priceCents: product.priceCents,
      salePriceCents: product.salePriceCents,
      currency: 'USD',
      summary: product.summary,
      symbol: product.symbol,
      isFeatured: product.isFeatured,
      isPopular: product.isPopular,
      date: product.publishedAt!.toISOString(),
    };
  }
}
