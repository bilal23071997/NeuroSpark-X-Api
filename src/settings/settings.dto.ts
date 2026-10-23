import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SetSettingDto {
  /**
   * The new value, checked against the setting's type (email or https link).
   * Send null or an empty string to clear it.
   * @example https://linkverse.example/neurospark
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  value?: string | null;
}

export class AdminSettingDto {
  key: string;
  label: string;
  /** `email` or `url`. */
  kind: string;
  description: string;
  /** Null when not set yet. */
  value: string | null;
}

/** Only the settings that have a value are present. */
export class PublicSettingsDto {
  contactEmail?: string;
  linkverseUrl?: string;
  whatsappUrl?: string;
  telegramUrl?: string;
}
