import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export const SECTION_TYPES = ['text', 'bullets', 'faq', 'image'] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export interface FaqItem {
  question: string;
  answer: string;
}

/** One block on a product page. The website draws them in the stored order with a fixed theme. */
export interface ProductSection {
  id: string;
  type: SectionType;
  title?: string;
  /** Plain text; paragraphs are separated by a blank line. */
  body?: string;
  /** Bullet lines (type `bullets`). */
  items?: string[];
  /** Questions and answers (type `faq`). */
  faq?: FaqItem[];
  /** Public https image URL (type `image`). */
  imageUrl?: string;
  alt?: string;
}

/**
 * Checks each section has what its type needs, drops fields that do not belong
 * to the type, and gives every section a unique id. Throws 400 naming the
 * section when something is wrong.
 */
export function normalizeSections(input: Partial<ProductSection>[]): ProductSection[] {
  const seen = new Set<string>();

  return input.map((raw, index) => {
    const where = `sections[${index}]`;
    const fail = (message: string): never => {
      throw new BadRequestException(`${where}: ${message}`);
    };

    const id = raw.id ?? randomUUID();
    if (seen.has(id)) fail('duplicate id');
    seen.add(id);

    const title = raw.title?.trim() || undefined;
    switch (raw.type) {
      case 'text': {
        const body = raw.body?.trim();
        if (!body) fail('a text section needs a body');
        return { id, type: 'text', title, body };
      }
      case 'bullets': {
        const items = (raw.items ?? []).map((item) => item.trim()).filter(Boolean);
        if (items.length === 0) fail('a bullets section needs at least one item');
        return { id, type: 'bullets', title, items };
      }
      case 'faq': {
        const faq = (raw.faq ?? []).map((entry) => ({
          question: entry.question.trim(),
          answer: entry.answer.trim(),
        }));
        if (faq.length === 0 || faq.some((entry) => !entry.question || !entry.answer)) {
          fail('a faq section needs at least one question, each with an answer');
        }
        return { id, type: 'faq', title, faq };
      }
      case 'image': {
        if (!raw.imageUrl) fail('an image section needs an imageUrl');
        const alt = raw.alt?.trim();
        if (!alt) fail('an image section needs alt text (describe the image)');
        return { id, type: 'image', title, imageUrl: raw.imageUrl, alt };
      }
      default:
        return fail('unknown section type');
    }
  });
}
