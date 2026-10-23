import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ECOSYSTEM_DESTINATION_SLUGS } from '../vault/constants.js';

// ---------- Free resources ----------

export class CreateFreeResourceDto {
  /** @example The Nervous System Literacy Workbook */
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  description: string;

  /** @example Guide */
  @IsString()
  @MinLength(1)
  type: string;

  /** One of the five official ecosystem destinations. */
  @IsOptional()
  @IsIn(ECOSYSTEM_DESTINATION_SLUGS)
  destination?: (typeof ECOSYSTEM_DESTINATION_SLUGS)[number];

  /** Where the free file or page lives. */
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  /** Lower numbers show first. */
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateFreeResourceDto extends PartialType(CreateFreeResourceDto) {}

export class PublicFreeResourceDto {
  title: string;
  description: string;
  type: string;
  destination: string | null;
  url: string;
}

// ---------- Newsletter ----------

export class SubscribeDto {
  /** @example jane@example.com */
  @IsEmail()
  @MaxLength(254)
  email: string;

  /** Where the form lives. @example footer */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}

export class SetSubscribedDto {
  /** `false` marks the address as unsubscribed. */
  @IsBoolean()
  isSubscribed: boolean;
}

export class AcknowledgedDto {
  /** Always true: the response never reveals whether the address was already known. */
  ok: boolean;
}

// ---------- Contact ----------

export class SendContactMessageDto {
  /** @example Jane Doe */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  /** @example jane@example.com */
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;
}

export class SetReadDto {
  @IsBoolean()
  isRead: boolean;
}
