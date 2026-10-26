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
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public, Roles } from '../common/decorators.js';
import { Role } from '../common/role.enum.js';
import { SitePage } from './page.entity.js';
import { CreatePageDto, PublicPageDto, PublicPageLinkDto, UpdatePageDto } from './pages.dto.js';
import { PagesService } from './pages.service.js';

@ApiTags('Admin - site pages')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/pages')
@Roles(Role.Admin)
export class AdminPagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  @ApiOperation({ summary: 'List site pages (drafts and published)' })
  @ApiOkResponse({ type: [SitePage] })
  findAll() {
    return this.pages.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'One page' })
  @ApiOkResponse({ type: SitePage })
  @ApiNotFoundResponse()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a page (starts as a draft)' })
  @ApiCreatedResponse({ type: SitePage })
  @ApiConflictResponse({ description: 'Slug already in use' })
  create(@Body() dto: CreatePageDto) {
    return this.pages.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a page' })
  @ApiOkResponse({ type: SitePage })
  @ApiNotFoundResponse()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePageDto) {
    return this.pages.update(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publish a page' })
  @ApiOkResponse({ type: SitePage })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.publish(id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Take a page back to draft' })
  @ApiOkResponse({ type: SitePage })
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.unpublish(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a page' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.remove(id);
  }
}

/** Read-only pages for the website. Only published pages are returned. */
@ApiTags('Public - site pages')
@Public()
@Controller('public/pages')
export class PublicPagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  @ApiOperation({ summary: 'Slug and title of every published page, for the footer' })
  @ApiOkResponse({ type: [PublicPageLinkDto] })
  list() {
    return this.pages.listPublished();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'One published page' })
  @ApiOkResponse({ type: PublicPageDto })
  @ApiNotFoundResponse()
  get(@Param('slug') slug: string) {
    return this.pages.getPublished(slug);
  }
}
