import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public, Roles } from '../common/decorators.js';
import { Role } from '../common/role.enum.js';
import { AdminSettingDto, PublicSettingsDto, SetSettingDto } from './settings.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('Admin - site settings')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/settings')
@Roles(Role.Admin)
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Every setting, with its current value (null when not set)' })
  @ApiOkResponse({ type: [AdminSettingDto] })
  list() {
    return this.settings.listForAdmin();
  }

  @Put(':key')
  @ApiOperation({
    summary: 'Set or clear one setting',
    description: 'Keys: contactEmail, linkverseUrl, whatsappUrl, telegramUrl.',
  })
  @ApiOkResponse({ type: AdminSettingDto })
  @ApiBadRequestResponse({ description: 'The value is not a valid email or https link' })
  @ApiNotFoundResponse({ description: 'Unknown setting key' })
  set(@Param('key') key: string, @Body() dto: SetSettingDto) {
    return this.settings.set(key, dto.value);
  }
}

@ApiTags('Public - site settings')
@Public()
@Controller('public/settings')
export class PublicSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Site settings the website shows (contact email, social links)' })
  @ApiOkResponse({ type: PublicSettingsDto })
  get() {
    return this.settings.getPublic();
  }
}
