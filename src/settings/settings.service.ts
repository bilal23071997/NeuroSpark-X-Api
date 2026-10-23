import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SETTING_DEFINITIONS, SETTING_KEYS, type SettingKey } from './settings.constants.js';
import type { AdminSettingDto, PublicSettingsDto } from './settings.dto.js';
import { SiteSetting } from './site-setting.entity.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(SiteSetting) private readonly settings: Repository<SiteSetting>) {}

  async listForAdmin(): Promise<AdminSettingDto[]> {
    const values = await this.valueMap();
    return SETTING_KEYS.map((key) => ({
      key,
      label: SETTING_DEFINITIONS[key].label,
      kind: SETTING_DEFINITIONS[key].kind,
      description: SETTING_DEFINITIONS[key].description,
      value: values.get(key) ?? null,
    }));
  }

  async getPublic(): Promise<PublicSettingsDto> {
    const values = await this.valueMap();
    return Object.fromEntries(SETTING_KEYS.filter((key) => values.has(key)).map((key) => [key, values.get(key)]));
  }

  async set(key: string, rawValue: string | null | undefined): Promise<AdminSettingDto> {
    if (!(SETTING_KEYS as string[]).includes(key)) throw new NotFoundException('Unknown setting');
    const definition = SETTING_DEFINITIONS[key as SettingKey];
    const value = rawValue?.trim() ?? '';

    if (!value) {
      await this.settings.delete({ key });
    } else {
      this.validate(definition.kind, value, definition.label);
      await this.settings.save({ key, value });
    }
    return { key, label: definition.label, kind: definition.kind, description: definition.description, value: value || null };
  }

  private validate(kind: 'email' | 'url', value: string, label: string) {
    if (kind === 'email') {
      if (!EMAIL_PATTERN.test(value)) throw new BadRequestException(`${label} must be an email address`);
      return;
    }
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException(`${label} must be a full https link`);
    }
    if (url.protocol !== 'https:') throw new BadRequestException(`${label} must be a full https link`);
  }

  private async valueMap() {
    const rows = await this.settings.find();
    return new Map(rows.map((row) => [row.key, row.value]));
  }
}
