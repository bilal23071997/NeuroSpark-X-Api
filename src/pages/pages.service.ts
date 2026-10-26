import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublishStatus } from '../content/publish-status.enum.js';
import { SitePage } from './page.entity.js';
import type { CreatePageDto, PublicPageDto, PublicPageLinkDto, UpdatePageDto } from './pages.dto.js';

@Injectable()
export class PagesService {
  constructor(@InjectRepository(SitePage) private readonly pages: Repository<SitePage>) {}

  // ---------- Admin ----------

  findAll() {
    return this.pages.find({ order: { slug: 'ASC' } });
  }

  async get(id: string) {
    const page = await this.pages.findOneBy({ id });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async create(dto: CreatePageDto) {
    await this.assertSlugFree(dto.slug);
    return this.pages.save(this.pages.create(dto));
  }

  async update(id: string, dto: UpdatePageDto) {
    const page = await this.get(id);
    if (dto.slug && dto.slug !== page.slug) await this.assertSlugFree(dto.slug, id);
    return this.pages.save(Object.assign(page, dto));
  }

  async publish(id: string) {
    const page = await this.get(id);
    page.status = PublishStatus.Published;
    page.publishedAt ??= new Date();
    return this.pages.save(page);
  }

  async unpublish(id: string) {
    const page = await this.get(id);
    page.status = PublishStatus.Draft;
    return this.pages.save(page);
  }

  async remove(id: string) {
    await this.get(id);
    await this.pages.delete(id);
  }

  // ---------- Public ----------

  /** Slug and title of every published page, for the footer. */
  async listPublished(): Promise<PublicPageLinkDto[]> {
    const pages = await this.pages.find({
      where: { status: PublishStatus.Published },
      order: { title: 'ASC' },
    });
    return pages.map(({ slug, title }) => ({ slug, title }));
  }

  async getPublished(slug: string): Promise<PublicPageDto> {
    const page = await this.pages.findOneBy({ slug, status: PublishStatus.Published });
    if (!page) throw new NotFoundException('Page not found');
    return {
      slug: page.slug,
      title: page.title,
      body: page.body,
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  // ---------- Internals ----------

  private async assertSlugFree(slug: string, excludeId?: string) {
    const query = this.pages.createQueryBuilder('p').where('p.slug = :slug', { slug });
    if (excludeId) query.andWhere('p.id != :excludeId', { excludeId });
    if (await query.getExists()) throw new ConflictException(`The slug "${slug}" is already in use`);
  }
}
