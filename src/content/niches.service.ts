import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './article.entity.js';
import type { CreateNicheDto, UpdateNicheDto } from './content.dto.js';
import { assertSlugFree, slugify } from './helpers.js';
import { Niche } from './niche.entity.js';

@Injectable()
export class NichesService {
  constructor(
    @InjectRepository(Niche) private readonly niches: Repository<Niche>,
    @InjectRepository(Article) private readonly articles: Repository<Article>,
  ) {}

  findAll() {
    return this.niches.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async get(id: string) {
    const niche = await this.niches.findOneBy({ id });
    if (!niche) throw new NotFoundException('Niche not found');
    return niche;
  }

  async create(dto: CreateNicheDto) {
    const slug = dto.slug ?? slugify(dto.name);
    await assertSlugFree(this.niches, slug);
    return this.niches.save(this.niches.create({ ...dto, slug }));
  }

  async update(id: string, dto: UpdateNicheDto) {
    const niche = await this.get(id);
    if (dto.slug && dto.slug !== niche.slug) await assertSlugFree(this.niches, dto.slug, id);
    return this.niches.save(Object.assign(niche, dto));
  }

  async remove(id: string) {
    await this.get(id);
    if (await this.articles.existsBy({ nicheId: id })) {
      throw new ConflictException('This niche still has articles; move or delete them first');
    }
    await this.niches.delete(id);
  }
}
