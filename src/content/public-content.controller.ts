import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators.js';
import { ArticlesService } from './articles.service.js';
import {
  PublicArticleDto,
  PublicArticleSummaryDto,
  PublicNicheDto,
  PublicEpisodeDto,
} from './content.dto.js';
import { EpisodesService } from './episodes.service.js';
import { NichesService } from './niches.service.js';

/** Read-only content for the website. No sign-in; only published items are returned. */
@ApiTags('Public - website content')
@Public()
@Controller('public')
export class PublicContentController {
  constructor(
    private readonly niches: NichesService,
    private readonly articles: ArticlesService,
    private readonly episodes: EpisodesService,
  ) {}

  @Get('niches')
  @ApiOperation({ summary: 'Niches, for the Insights topic filter' })
  @ApiOkResponse({ type: [PublicNicheDto] })
  async listNiches(): Promise<PublicNicheDto[]> {
    const niches = await this.niches.findAll();
    return niches.map((niche) => PublicNicheDto.from(niche));
  }

  @Get('articles')
  @ApiOperation({ summary: 'Published articles, featured first then newest' })
  @ApiQuery({ name: 'niche', required: false, description: 'Niche slug' })
  @ApiOkResponse({ type: [PublicArticleSummaryDto] })
  listArticles(@Query('niche') niche?: string) {
    return this.articles.listPublished(niche);
  }

  @Get('articles/:slug')
  @ApiOperation({ summary: 'One published article, with its body' })
  @ApiOkResponse({ type: PublicArticleDto })
  @ApiNotFoundResponse()
  getArticle(@Param('slug') slug: string) {
    return this.articles.getPublished(slug);
  }

  @Get('episodes')
  @ApiOperation({ summary: 'Published episodes, highest episode number first' })
  @ApiQuery({ name: 'series', required: false, description: 'Series slug' })
  @ApiOkResponse({ type: [PublicEpisodeDto] })
  listEpisodes(@Query('series') series?: string) {
    return this.episodes.listPublished(series);
  }

  @Get('episodes/:slug')
  @ApiOperation({ summary: 'One published episode, with its YouTube link' })
  @ApiOkResponse({ type: PublicEpisodeDto })
  @ApiNotFoundResponse()
  getEpisode(@Param('slug') slug: string) {
    return this.episodes.getPublished(slug);
  }
}
