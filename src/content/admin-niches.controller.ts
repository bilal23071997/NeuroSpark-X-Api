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

@ApiTags('Admin - niches')
@ApiBearerAuth('access-token')
@Controller('admin/niches')
export class AdminNichesController {
  constructor(private readonly niches: NichesService) {}

  @Get()
  @ApiOperation({ summary: 'List niches (the topic areas articles are filed under)' })
  @ApiOkResponse({ type: [Niche] })
  findAll() {
    return this.niches.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a niche' })
  @ApiCreatedResponse({ type: Niche })
  @ApiConflictResponse({ description: 'Slug already in use' })
  create(@Body() dto: CreateNicheDto) {
    return this.niches.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a niche' })
  @ApiOkResponse({ type: Niche })
  @ApiNotFoundResponse()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNicheDto) {
    return this.niches.update(id, dto);
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
