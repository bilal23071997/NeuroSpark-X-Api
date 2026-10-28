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
import { ArticlesService } from './articles.service.js';
import { CreateArticleDto, UpdateArticleDto } from './content.dto.js';
import { PublishStatus } from './publish-status.enum.js';
import { ArticleResponse } from './content.responses.js';

@ApiTags('Admin - articles (Insights)')
@ApiBearerAuth('access-token')
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'List articles (drafts and published), newest first' })
  @ApiQuery({ name: 'status', enum: PublishStatus, required: false })
  @ApiQuery({ name: 'nicheId', required: false })
  @ApiOkResponse({ type: [ArticleResponse] })
  async findAll(
    @Query('status', new ParseEnumPipe(PublishStatus, { optional: true })) status?: PublishStatus,
    @Query('nicheId', new ParseUUIDPipe({ optional: true })) nicheId?: string,
  ) {
    return (await this.articles.findAll({ status, nicheId })).map((item) => ArticleResponse.from(item));
  }

  @Get(':id')
  @ApiOperation({ summary: 'One article' })
  @ApiOkResponse({ type: ArticleResponse })
  @ApiNotFoundResponse()
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return ArticleResponse.from(await this.articles.get(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create an article (starts as a draft)' })
  @ApiCreatedResponse({ type: ArticleResponse })
  @ApiConflictResponse({ description: 'Slug already in use' })
  async create(@Body() dto: CreateArticleDto) {
    return ArticleResponse.from(await this.articles.create(dto));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an article' })
  @ApiOkResponse({ type: ArticleResponse })
  @ApiNotFoundResponse()
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateArticleDto) {
    return ArticleResponse.from(await this.articles.update(id, dto));
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publish an article (sets its publish date the first time)' })
  @ApiOkResponse({ type: ArticleResponse })
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    return ArticleResponse.from(await this.articles.publish(id));
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Take an article back to draft' })
  @ApiOkResponse({ type: ArticleResponse })
  async unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return ArticleResponse.from(await this.articles.unpublish(id));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an article' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.articles.remove(id);
  }
}
