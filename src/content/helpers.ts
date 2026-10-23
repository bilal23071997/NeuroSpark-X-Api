import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// youtube.com/watch?v=ID, youtube.com/embed/ID, youtube.com/live/ID or youtu.be/ID
export const YOUTUBE_URL_PATTERN =
  /^https:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)[\w-]{11}(?:[&?#].*)?$/;

export function slugify(text: string) {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  if (!slug) throw new BadRequestException('Could not make a slug from that text; provide one.');
  return slug;
}

/** Throws 409 if another row already uses this slug. */
export async function assertSlugFree<T extends { id: string; slug: string }>(
  repo: Repository<T>,
  slug: string,
  excludeId?: string,
) {
  const query = repo.createQueryBuilder('e').where('e.slug = :slug', { slug });
  if (excludeId) query.andWhere('e.id != :excludeId', { excludeId });
  if (await query.getExists()) throw new ConflictException(`The slug "${slug}" is already in use`);
}

export function readTime(paragraphs: string[]) {
  const words = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}
