import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './article.entity.js';
import type {
  CreateArticleDto,
  PublicArticleDto,
  PublicArticleSummaryDto,
  UpdateArticleDto,
} from './content.dto.js';
import { assertSlugFree, readTime, slugify } from './helpers.js';
import { Niche } from './niche.entity.js';
import { PublishStatus } from './publish-status.enum.js';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article) private readonly articles: Repository<Article>,
    @InjectRepository(Niche) private readonly niches: Repository<Niche>,
  ) {}

  // ---------- Admin ----------

  findAll(filter: { status?: PublishStatus; nicheId?: string }) {
    return this.articles.find({
      // TypeORM rejects `undefined` values, so only pass the filters that were given.
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.nicheId ? { nicheId: filter.nicheId } : {}),
      },
      relations: { niche: true },
      order: { createdAt: 'DESC' },
    });
  }

  async get(id: string) {
    const article = await this.articles.findOne({ where: { id }, relations: { niche: true } });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async create(dto: CreateArticleDto) {
    const slug = dto.slug ?? slugify(dto.title);
    await assertSlugFree(this.articles, slug);
    await this.assertNicheExists(dto.nicheId);
    return this.save(this.articles.create({ ...dto, slug }));
  }

  async update(id: string, dto: UpdateArticleDto) {
    const article = await this.get(id);
    if (dto.slug && dto.slug !== article.slug) await assertSlugFree(this.articles, dto.slug, id);
    if (dto.nicheId && dto.nicheId !== article.nicheId) await this.assertNicheExists(dto.nicheId);
    // Drop the loaded relation so the new nicheId is what gets saved.
    const { niche: _niche, ...rest } = article;
    return this.save(Object.assign(rest as Article, dto));
  }

  async publish(id: string) {
    const article = await this.get(id);
    article.status = PublishStatus.Published;
    article.publishedAt ??= new Date();
    return this.save(article);
  }

  async unpublish(id: string) {
    const article = await this.get(id);
    article.status = PublishStatus.Draft;
    return this.save(article);
  }

  async remove(id: string) {
    await this.get(id);
    await this.articles.delete(id);
  }

  // ---------- Public ----------

  async listPublished(nicheSlug?: string): Promise<PublicArticleSummaryDto[]> {
    const articles = await this.articles.find({
      where: {
        status: PublishStatus.Published,
        ...(nicheSlug ? { niche: { slug: nicheSlug } } : {}),
      },
      relations: { niche: true },
      order: { isFeatured: 'DESC', publishedAt: 'DESC' },
    });
    return articles.map((article) => this.toSummary(article));
  }

  async getPublished(slug: string): Promise<PublicArticleDto> {
    const article = await this.articles.findOne({
      where: { slug, status: PublishStatus.Published },
      relations: { niche: true },
    });
    if (!article) throw new NotFoundException('Article not found');
    return {
      ...this.toSummary(article),
      Body: article.body,
      SeoTitle: article.seoTitle,
      SeoDescription: article.seoDescription,
    };
  }

  // ---------- Internals ----------

  private async assertNicheExists(nicheId: string) {
    if (!(await this.niches.existsBy({ id: nicheId }))) {
      throw new BadRequestException('That niche does not exist');
    }
  }

  /** Saves, making sure at most one article is featured. */
  private async save(article: Article) {
    const saved = await this.articles.manager.transaction(async (manager) => {
      if (article.isFeatured) {
        await manager.update(Article, { isFeatured: true }, { isFeatured: false });
      }
      return manager.save(Article, article);
    });
    return this.get(saved.id);
  }

  private toSummary(article: Article): PublicArticleSummaryDto {
    return {
      Slug: article.slug,
      Title: article.title,
      Category: article.niche.name,
      NicheSlug: article.niche.slug,
      Excerpt: article.excerpt,
      Date: article.publishedAt!.toISOString(),
      ReadTime: readTime(article.body),
      IsFeatured: article.isFeatured,
    };
  }
}
