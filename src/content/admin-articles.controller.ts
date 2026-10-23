import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Article } from './article.entity.js';
import { ArticlesService } from './articles.service.js';
import { CreateArticleDto, UpdateArticleDto } from './content.dto.js';
import { PublishStatus } from './publish-status.enum.js';

@ApiTags('Admin - articles (Insights)')
@ApiBearerAuth('access-token')
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'List articles (drafts and published), newest first' })
  @ApiQuery({ name: 'status', enum: PublishStatus, required: false })
  @ApiQuery({ name: 'nicheId', required: false })
  @ApiOkResponse({ type: [Article] })
  findAll(
    @Query('status', new ParseEnumPipe(PublishStatus, { optional: true })) status?: PublishStatus,
    @Query('nicheId', new ParseUUIDPipe({ optional: true })) nicheId?: string,
  ) {
    return this.articles.findAll({ status, nicheId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'One article' })
  @ApiOkResponse({ type: Article })
  @ApiNotFoundResponse()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.articles.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an article (starts as a draft)' })
  @ApiCreatedResponse({ type: Article })
  @ApiConflictResponse({ description: 'Slug already in use' })
  create(@Body() dto: CreateArticleDto) {
    return this.articles.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an article' })
  @ApiOkResponse({ type: Article })
  @ApiNotFoundResponse()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateArticleDto) {
    return this.articles.update(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publish an article (sets its publish date the first time)' })
  @ApiOkResponse({ type: Article })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.articles.publish(id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Take an article back to draft' })
  @ApiOkResponse({ type: Article })
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.articles.unpublish(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an article' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.articles.remove(id);
  }
}
