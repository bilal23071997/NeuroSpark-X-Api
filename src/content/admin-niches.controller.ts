import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateNicheDto, UpdateNicheDto } from './content.dto.js';
import { Niche } from './niche.entity.js';
import { NichesService } from './niches.service.js';
import { NicheResponse } from './content.responses.js';

@ApiTags('Admin - niches')
@ApiBearerAuth('access-token')
@Controller('admin/niches')
export class AdminNichesController {
  constructor(private readonly niches: NichesService) {}

  @Get()
  @ApiOperation({ summary: 'List niches (the topic areas articles are filed under)' })
  @ApiOkResponse({ type: [NicheResponse] })
  async findAll() {
    return (await this.niches.findAll()).map((item) => NicheResponse.from(item));
  }

  @Post()
  @ApiOperation({ summary: 'Create a niche' })
  @ApiCreatedResponse({ type: NicheResponse })
  @ApiConflictResponse({ description: 'Slug already in use' })
  async create(@Body() dto: CreateNicheDto) {
    return NicheResponse.from(await this.niches.create(dto));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a niche' })
  @ApiOkResponse({ type: NicheResponse })
  @ApiNotFoundResponse()
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNicheDto) {
    return NicheResponse.from(await this.niches.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a niche with no articles' })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'Niche still has articles' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.niches.remove(id);
  }
}
