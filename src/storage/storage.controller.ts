import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators.js';
import { Role } from '../common/role.enum.js';
import { CreateUploadDto, PresignedUploadDto } from './storage.dto.js';
import { StorageService } from './storage.service.js';

@ApiTags('Admin - uploads')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/uploads')
@Roles(Role.Admin)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('presign')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get a short-lived URL to upload a file straight to the bucket',
    description:
      'Send the file with PUT to `uploadUrl` using exactly the returned `headers`. Images come back with a `publicUrl`; product files are private and come back with a `key` only.',
  })
  @ApiOkResponse({ type: PresignedUploadDto })
  @ApiBadRequestResponse({ description: 'Type or size not allowed for this kind of upload' })
  @ApiServiceUnavailableResponse({ description: 'File storage is not configured' })
  presign(@Body() dto: CreateUploadDto) {
    return this.storage.createUpload(dto);
  }
}
