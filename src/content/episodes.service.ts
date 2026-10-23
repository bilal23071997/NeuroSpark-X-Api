import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateEpisodeDto, PublicEpisodeDto, UpdateEpisodeDto } from './content.dto.js';
import { Episode } from './episode.entity.js';
import { assertSlugFree, slugify } from './helpers.js';
import { PublishStatus } from './publish-status.enum.js';

@Injectable()
export class EpisodesService {
  constructor(@InjectRepository(Episode) private readonly episodes: Repository<Episode>) {}

  // ---------- Admin ----------

  findAll(filter: { status?: PublishStatus; series?: string }) {
    return this.episodes.find({
      // TypeORM rejects `undefined` values, so only pass the filters that were given.
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.series ? { series: filter.series } : {}),
      },
      order: { episodeNumber: 'DESC' },
    });
  }

  async get(id: string) {
    const episode = await this.episodes.findOneBy({ id });
    if (!episode) throw new NotFoundException('Episode not found');
    return episode;
  }

  async create(dto: CreateEpisodeDto) {
    const slug = dto.slug ?? slugify(dto.title);
    await assertSlugFree(this.episodes, slug);
    return this.save(this.episodes.create({ ...dto, slug }));
  }

  async update(id: string, dto: UpdateEpisodeDto) {
    const episode = await this.get(id);
    if (dto.slug && dto.slug !== episode.slug) await assertSlugFree(this.episodes, dto.slug, id);
    return this.save(Object.assign(episode, dto));
  }

  async publish(id: string) {
    const episode = await this.get(id);
    // An episode must really play, so it cannot go live without its YouTube link.
    if (!episode.youtubeUrl) {
      throw new BadRequestException('Add the YouTube link before publishing this episode');
    }
    episode.status = PublishStatus.Published;
    episode.publishedAt ??= new Date();
    return this.save(episode);
  }

  async unpublish(id: string) {
    const episode = await this.get(id);
    episode.status = PublishStatus.Draft;
    return this.save(episode);
  }

  async remove(id: string) {
    await this.get(id);
    await this.episodes.delete(id);
  }

  // ---------- Public ----------

  async listPublished(series?: string): Promise<PublicEpisodeDto[]> {
    const episodes = await this.episodes.find({
      where: { status: PublishStatus.Published, ...(series ? { series } : {}) },
      order: { episodeNumber: 'DESC' },
    });
    return episodes.map((episode) => this.toPublic(episode));
  }

  async getPublished(slug: string): Promise<PublicEpisodeDto> {
    const episode = await this.episodes.findOneBy({ slug, status: PublishStatus.Published });
    if (!episode) throw new NotFoundException('Episode not found');
    return this.toPublic(episode);
  }

  // ---------- Internals ----------

  /** Saves, making sure at most one episode is featured. */
  private async save(episode: Episode) {
    const saved = await this.episodes.manager.transaction(async (manager) => {
      if (episode.isFeatured) {
        await manager.update(Episode, { isFeatured: true }, { isFeatured: false });
      }
      return manager.save(Episode, episode);
    });
    return this.get(saved.id);
  }

  private toPublic(episode: Episode): PublicEpisodeDto {
    return {
      slug: episode.slug,
      title: episode.title,
      series: episode.series,
      episodeNumber: episode.episodeNumber,
      duration: episode.duration,
      description: episode.description,
      showNotes: episode.showNotes,
      youtubeUrl: episode.youtubeUrl!,
      date: episode.publishedAt!.toISOString(),
      isFeatured: episode.isFeatured,
    };
  }
}
