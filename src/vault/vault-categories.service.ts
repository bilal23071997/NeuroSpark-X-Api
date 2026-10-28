import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublishStatus } from '../content/publish-status.enum.js';
import { slugify } from '../content/helpers.js';
import { VAULT_CATEGORIES } from './constants.js';
import { Product } from './product.entity.js';
import { VaultCategory } from './vault-category.entity.js';
import type {
  CreateGroupDto,
  PublicVaultCategoryDto,
  ReorderSubGroupsDto,
  UpdateGroupDto,
  VaultGroupNodeDto,
} from './vault.dto.js';

@Injectable()
export class VaultCategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(VaultCategory)
    private readonly categories: Repository<VaultCategory>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  /**
   * Keeps the five official categories in place on every start: creates any that
   * are missing and restores name, order and official flag. A description an
   * admin edited is left alone.
   */
  async onModuleInit() {
    for (const [index, official] of VAULT_CATEGORIES.entries()) {
      const existing = await this.categories.findOneBy({ slug: official.slug });
      if (existing) {
        await this.categories.update(existing.id, {
          name: official.name,
          sortOrder: index + 1,
          isOfficial: true,
          parentId: null,
        });
      } else {
        await this.categories.insert({
          ...official,
          sortOrder: index + 1,
          isOfficial: true,
          parentId: null,
        });
      }
    }
  }

  // ---------- Reads ----------

  /** Flat list, official categories first then sub-groups by parent and order. */
  findAll() {
    return this.categories.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  /** Admin tree: the five categories with their sub-groups; counts include drafts. */
  async adminTree(): Promise<VaultGroupNodeDto[]> {
    const [groups, counts] = await Promise.all([
      this.findAll(),
      this.countProducts(false),
    ]);
    return this.buildTree(groups, counts);
  }

  /** Website tree: the five categories with their sub-groups; counts are published products only. */
  async publicTree(): Promise<PublicVaultCategoryDto[]> {
    const [groups, counts] = await Promise.all([
      this.findAll(),
      this.countProducts(true),
    ]);
    return this.buildTree(groups, counts).map((top) => ({
      slug: top.slug,
      name: top.name,
      description: top.description,
      productCount: top.productCount,
      children: top.children.map((child) => ({
        slug: child.slug,
        name: child.name,
        description: child.description,
        productCount: child.productCount,
      })),
    }));
  }

  async get(id: number) {
    const group = await this.categories.findOneBy({ id });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  /** For products: 400 (not 404) because the id came from the request body. */
  async getOrFail(id: number) {
    const group = await this.categories.findOneBy({ id });
    if (!group) throw new BadRequestException('That category does not exist');
    return group;
  }

  // ---------- Sub-group writes ----------

  /** A sub-group when `parentId` is given, otherwise a new top-level group (after the five official ones). */
  async createGroup(dto: CreateGroupDto) {
    const parentId = dto.parentId ?? null;
    if (parentId !== null) await this.assertTopLevel(parentId);
    const slug = dto.slug ?? slugify(dto.name);
    await this.assertSlugFree(slug);

    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(parentId));
    const saved = await this.categories.save(
      this.categories.create({
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() ?? '',
        parentId,
        sortOrder,
        isOfficial: false,
      }),
    );
    return this.get(saved.id);
  }

  async update(id: number, dto: UpdateGroupDto) {
    const group = await this.get(id);

    if (group.isOfficial) {
      // The five official categories keep their name, slug, place and order.
      const locked = ['name', 'slug', 'parentId', 'sortOrder'] as const;
      const touched = locked.filter((field) => dto[field] !== undefined);
      if (touched.length > 0) {
        throw new BadRequestException(
          `An official category cannot change ${touched.join(', ')}; only its description can be edited`,
        );
      }
      if (dto.description !== undefined)
        group.description = dto.description.trim();
      return this.categories.save(group);
    }

    if (dto.slug && dto.slug !== group.slug)
      await this.assertSlugFree(dto.slug, id);
    if (dto.parentId !== undefined && dto.parentId !== group.parentId) {
      if (group.parentId === null) {
        throw new BadRequestException(
          'A top-level group cannot be moved under another group',
        );
      }
      await this.assertTopLevel(dto.parentId);
      group.parentId = dto.parentId;
      // Moving to another category puts it last there unless an order was given.
      if (dto.sortOrder === undefined)
        group.sortOrder = await this.nextSortOrder(dto.parentId);
    }
    if (dto.name !== undefined) group.name = dto.name.trim();
    if (dto.slug !== undefined) group.slug = dto.slug;
    if (dto.description !== undefined)
      group.description = dto.description.trim();
    if (dto.sortOrder !== undefined) group.sortOrder = dto.sortOrder;
    await this.categories.save(group);
    return this.get(id);
  }

  /** Sets the order of one category's sub-groups to the order of `ids`. */
  async reorder(dto: ReorderSubGroupsDto) {
    await this.assertTopLevel(dto.parentId);
    const children = await this.categories.findBy({ parentId: dto.parentId });
    const have = new Set(children.map((child) => child.id));
    const sent = new Set(dto.ids);
    const exact =
      sent.size === dto.ids.length &&
      sent.size === have.size &&
      dto.ids.every((id) => have.has(id));
    if (!exact) {
      throw new BadRequestException(
        'ids must list every sub-group of that category exactly once',
      );
    }
    await this.categories.manager.transaction(async (manager) => {
      for (const [index, id] of dto.ids.entries()) {
        await manager.update(VaultCategory, id, { sortOrder: index + 1 });
      }
    });
    return this.adminTree();
  }

  async remove(id: number) {
    const group = await this.get(id);
    if (group.isOfficial) {
      throw new ConflictException(
        'The five official categories cannot be deleted',
      );
    }
    if (await this.categories.existsBy({ parentId: id })) {
      throw new ConflictException(
        'This group still has sub-groups; delete or move them first',
      );
    }
    if (await this.products.existsBy({ categoryId: id })) {
      throw new ConflictException(
        'This group still has products; move or delete them first',
      );
    }
    await this.categories.delete(id);
  }

  // ---------- Internals ----------

  private async assertTopLevel(parentId: number) {
    const parent = await this.categories.findOneBy({ id: parentId });
    if (!parent)
      throw new BadRequestException('That parent category does not exist');
    if (parent.parentId !== null) {
      throw new BadRequestException(
        'Sub-groups go under a top-level group, not under another sub-group',
      );
    }
  }

  private async assertSlugFree(slug: string, excludeId?: number) {
    const query = this.categories
      .createQueryBuilder('c')
      .where('c.slug = :slug', { slug });
    if (excludeId) query.andWhere('c.id != :excludeId', { excludeId });
    if (await query.getExists())
      throw new ConflictException(`The slug "${slug}" is already in use`);
  }

  private async nextSortOrder(parentId: number | null) {
    const query = this.categories
      .createQueryBuilder('c')
      .select('MAX(c.sortOrder)', 'max');
    if (parentId === null) query.where('c.parentId IS NULL');
    else query.where('c.parentId = :parentId', { parentId });
    const { max } = (await query.getRawOne<{ max: number | null }>())!;
    return (max ?? 0) + 1;
  }

  /** Products per group id; `publishedOnly` drops drafts. */
  private async countProducts(publishedOnly: boolean) {
    const query = this.products
      .createQueryBuilder('p')
      .select('p.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.categoryId');
    if (publishedOnly)
      query.where('p.status = :status', { status: PublishStatus.Published });
    const rows = await query.getRawMany<{
      categoryId: number;
      count: string;
    }>();
    return new Map(
      rows.map((row) => [Number(row.categoryId), Number(row.count)]),
    );
  }

  private buildTree(
    groups: VaultCategory[],
    counts: Map<number, number>,
  ): VaultGroupNodeDto[] {
    const toNode = (group: VaultCategory): VaultGroupNodeDto => ({
      id: group.id,
      slug: group.slug,
      name: group.name,
      description: group.description,
      sortOrder: group.sortOrder,
      parentId: group.parentId,
      isOfficial: group.isOfficial,
      productCount: counts.get(group.id) ?? 0,
      children: [],
    });

    const tops = groups.filter((group) => group.parentId === null).map(toNode);
    for (const top of tops) {
      top.children = groups
        .filter((group) => group.parentId === top.id)
        .map(toNode)
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        );
      top.productCount += top.children.reduce(
        (sum, child) => sum + child.productCount,
        0,
      );
    }
    return tops.sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
