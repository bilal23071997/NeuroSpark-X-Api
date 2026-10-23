import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VAULT_CATEGORIES } from './constants.js';
import { VaultCategory } from './vault-category.entity.js';

@Injectable()
export class VaultCategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(VaultCategory) private readonly categories: Repository<VaultCategory>,
  ) {}

  /** Keeps the static table in step with VAULT_CATEGORIES; safe to run on every start. */
  async onModuleInit() {
    await this.categories.upsert(
      VAULT_CATEGORIES.map((category, index) => ({ ...category, sortOrder: index + 1 })),
      ['slug'],
    );
  }

  findAll() {
    return this.categories.find({ order: { sortOrder: 'ASC' } });
  }

  async getOrFail(id: number) {
    const category = await this.categories.findOneBy({ id });
    if (!category) throw new BadRequestException('That category does not exist');
    return category;
  }
}
