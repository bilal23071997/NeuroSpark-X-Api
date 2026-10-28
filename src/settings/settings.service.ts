import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SETTING_DEFINITIONS, SETTING_KEYS, type SettingKey } from './settings.constants.js';
import { PublicSettingsDto, type AdminSettingDto } from './settings.dto.js';
import { SiteSetting } from './site-setting.entity.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(SiteSetting) private readonly settings: Repository<SiteSetting>) {}

  async listForAdmin(): Promise<AdminSettingDto[]> {
    const values = await this.valueMap();
    return SETTING_KEYS.map((key) => ({
      Key: key,
      Label: SETTING_DEFINITIONS[key].label,
      Kind: SETTING_DEFINITIONS[key].kind,
      Description: SETTING_DEFINITIONS[key].description,
      Value: values.get(key) ?? null,
    }));
  }

  async getPublic(): Promise<PublicSettingsDto> {
    const values = await this.valueMap();
    // Only the settings that have a value are sent.
    return Object.assign(new PublicSettingsDto(), {
      ...(values.has('contactEmail') && { ContactEmail: values.get('contactEmail') }),
      ...(values.has('linkverseUrl') && { LinkverseUrl: values.get('linkverseUrl') }),
      ...(values.has('whatsappUrl') && { WhatsappUrl: values.get('whatsappUrl') }),
      ...(values.has('telegramUrl') && { TelegramUrl: values.get('telegramUrl') }),
    });
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
    return { Key: key, Label: definition.label, Kind: definition.kind, Description: definition.description, Value: value || null };
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
