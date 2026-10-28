import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from './product.entity.js';
import { VaultCategoriesService } from './vault-categories.service.js';
import type { VaultCategory } from './vault-category.entity.js';

const official = {
  id: 1,
  slug: 'personal-growth',
  name: 'Personal Growth',
  description: 'old',
  sortOrder: 1,
  isOfficial: true,
  parentId: null,
} as VaultCategory;

const sub = {
  ...official,
  id: 9,
  slug: 'journals',
  name: 'Journals',
  isOfficial: false,
  parentId: 1,
} as VaultCategory;

function serviceWith(groups: VaultCategory[], hasProducts = false) {
  const categories = {
    findOneBy: vi.fn(
      async ({ id }: { id: number }) =>
        groups.find((group) => group.id === id) ?? null,
    ),
    save: vi.fn(async (group: VaultCategory) => group),
    existsBy: vi.fn(async ({ parentId }: { parentId: number }) =>
      groups.some((group) => group.parentId === parentId),
    ),
    delete: vi.fn(async () => undefined),
  } as unknown as Repository<VaultCategory>;
  const products = {
    existsBy: vi.fn(async () => hasProducts),
  } as unknown as Repository<Product>;
  return {
    service: new VaultCategoriesService(categories, products),
    categories,
  };
}

describe('official categories', () => {
  it('cannot be deleted', async () => {
    const { service, categories } = serviceWith([{ ...official }]);
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(categories.delete).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'Renamed' },
    { slug: 'new-slug' },
    { parentId: 2 },
    { sortOrder: 3 },
  ])('cannot change %o', async (change) => {
    const { service, categories } = serviceWith([{ ...official }]);
    await expect(service.update(1, change)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(categories.save).not.toHaveBeenCalled();
  });

  it('can change only the description', async () => {
    const { service } = serviceWith([{ ...official }]);
    await expect(
      service.update(1, { description: ' New text ' }),
    ).resolves.toMatchObject({
      description: 'New text',
      name: 'Personal Growth',
    });
  });
});

describe('sub-groups', () => {
  it('cannot be created under another sub-group', async () => {
    const { service } = serviceWith([{ ...official }, { ...sub }]);
    await expect(
      service.createGroup({ name: 'Deep', parentId: 9 }),
    ).rejects.toThrow(/not under another sub-group/);
  });

  it('cannot be deleted while they hold products', async () => {
    const { service, categories } = serviceWith(
      [{ ...official }, { ...sub }],
      true,
    );
    await expect(service.remove(9)).rejects.toBeInstanceOf(ConflictException);
    expect(categories.delete).not.toHaveBeenCalled();
  });

  it('a top-level group cannot be deleted while it has sub-groups', async () => {
    const custom = {
      ...official,
      id: 20,
      slug: 'custom',
      name: 'Custom',
      isOfficial: false,
    } as VaultCategory;
    const child = { ...sub, id: 21, parentId: 20 } as VaultCategory;
    const { service, categories } = serviceWith([
      { ...official },
      custom,
      child,
    ]);
    await expect(service.remove(20)).rejects.toBeInstanceOf(ConflictException);
    expect(categories.delete).not.toHaveBeenCalled();
  });

  it('can be deleted when empty', async () => {
    const { service, categories } = serviceWith(
      [{ ...official }, { ...sub }],
      false,
    );
    await service.remove(9);
    expect(categories.delete).toHaveBeenCalledWith(9);
  });
});
