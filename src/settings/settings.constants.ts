export type SettingKind = 'email' | 'url';

export interface SettingDefinition {
  label: string;
  kind: SettingKind;
  description: string;
}

/**
 * The only settings that exist. Every one is public (shown on the website), so
 * never add a secret here. No defaults: an unset setting simply has no value.
 */
export const SETTING_DEFINITIONS = {
  contactEmail: {
    label: 'Contact email',
    kind: 'email',
    description: 'Shown in the footer and on the contact page.',
  },
  linkverseUrl: {
    label: 'LinkVerse link',
    kind: 'url',
    description: 'Page that lists all social profiles; linked from "Find Your Starting Point".',
  },
  whatsappUrl: {
    label: 'WhatsApp link',
    kind: 'url',
    description: 'Optional; shown in the footer when set.',
  },
  telegramUrl: {
    label: 'Telegram link',
    kind: 'url',
    description: 'Optional; shown in the footer when set.',
  },
} as const satisfies Record<string, SettingDefinition>;

export type SettingKey = keyof typeof SETTING_DEFINITIONS;

export const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS) as SettingKey[];
