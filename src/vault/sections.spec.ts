import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { normalizeSections } from './sections.js';

describe('normalizeSections', () => {
  it('keeps the order, assigns ids and trims text', () => {
    const result = normalizeSections([
      { type: 'text', title: '  Intro ', body: '  Hello\n\nWorld  ' },
      { type: 'bullets', items: [' one ', '', 'two'] },
      { type: 'faq', faq: [{ question: ' Q? ', answer: ' A. ' }] },
      { type: 'image', imageUrl: 'https://cdn.example.com/a.png', alt: ' A cover ' },
    ]);
    expect(result.map((section) => section.type)).toEqual(['text', 'bullets', 'faq', 'image']);
    expect(new Set(result.map((section) => section.id)).size).toBe(4);
    expect(result[0]).toMatchObject({ title: 'Intro', body: 'Hello\n\nWorld' });
    expect(result[1].items).toEqual(['one', 'two']);
    expect(result[2].faq).toEqual([{ question: 'Q?', answer: 'A.' }]);
    expect(result[3]).toMatchObject({ imageUrl: 'https://cdn.example.com/a.png', alt: 'A cover' });
  });

  it('keeps a given id and drops fields that do not belong to the type', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const [section] = normalizeSections([
      { id, type: 'text', body: 'Hi', items: ['stray'], imageUrl: 'https://x.test/a.png' },
    ]);
    expect(section).toEqual({ id, type: 'text', title: undefined, body: 'Hi' });
  });

  it.each([
    [{ type: 'text', body: '   ' }, /a text section needs a body/],
    [{ type: 'bullets', items: ['  '] }, /at least one item/],
    [{ type: 'faq', faq: [{ question: 'Q', answer: ' ' }] }, /each with an answer/],
    [{ type: 'faq', faq: [] }, /each with an answer/],
    [{ type: 'image', alt: 'x' }, /needs an imageUrl/],
    [{ type: 'image', imageUrl: 'https://x.test/a.png' }, /needs alt text/],
  ] as const)('rejects %o', (section, message) => {
    expect(() => normalizeSections([section as never])).toThrow(BadRequestException);
    expect(() => normalizeSections([section as never])).toThrow(message);
  });

  it('names the section that is wrong and rejects duplicate ids', () => {
    expect(() => normalizeSections([{ type: 'text', body: 'ok' }, { type: 'text' }])).toThrow(
      /sections\[1\]/,
    );
    const id = '11111111-1111-4111-8111-111111111111';
    expect(() =>
      normalizeSections([
        { id, type: 'text', body: 'a' },
        { id, type: 'text', body: 'b' },
      ]),
    ).toThrow(/duplicate id/);
  });
});
