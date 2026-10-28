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
  ApiBadRequestResponse,
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
import { CreateEpisodeDto, UpdateEpisodeDto } from './content.dto.js';
import { EpisodesService } from './episodes.service.js';
import { PublishStatus } from './publish-status.enum.js';
import { EpisodeResponse } from './content.responses.js';

@ApiTags('Admin - episodes (Listen)')
@ApiBearerAuth('access-token')
@Controller('admin/episodes')
export class AdminEpisodesController {
  constructor(private readonly episodes: EpisodesService) {}

  @Get()
  @ApiOperation({ summary: 'List episodes (drafts and published), newest number first' })
  @ApiQuery({ name: 'status', enum: PublishStatus, required: false })
  @ApiQuery({ name: 'series', required: false, description: 'Series slug' })
  @ApiOkResponse({ type: [EpisodeResponse] })
  async findAll(
    @Query('status', new ParseEnumPipe(PublishStatus, { optional: true })) status?: PublishStatus,
    @Query('series') series?: string,
  ) {
    return (await this.episodes.findAll({ status, series })).map((item) => EpisodeResponse.from(item));
  }

  @Get(':id')
  @ApiOperation({ summary: 'One episode' })
  @ApiOkResponse({ type: EpisodeResponse })
  @ApiNotFoundResponse()
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return EpisodeResponse.from(await this.episodes.get(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create an episode (starts as a draft)' })
  @ApiCreatedResponse({ type: EpisodeResponse })
  @ApiConflictResponse({ description: 'Slug already in use' })
  async create(@Body() dto: CreateEpisodeDto) {
    return EpisodeResponse.from(await this.episodes.create(dto));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an episode' })
  @ApiOkResponse({ type: EpisodeResponse })
  @ApiNotFoundResponse()
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEpisodeDto) {
    return EpisodeResponse.from(await this.episodes.update(id, dto));
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Publish an episode',
    description: 'Needs a YouTube link. Sets the publish date the first time.',
  })
  @ApiOkResponse({ type: EpisodeResponse })
  @ApiBadRequestResponse({ description: 'The episode has no YouTube link yet' })
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    return EpisodeResponse.from(await this.episodes.publish(id));
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Take an episode back to draft' })
  @ApiOkResponse({ type: EpisodeResponse })
  async unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return EpisodeResponse.from(await this.episodes.unpublish(id));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an episode' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.episodes.remove(id);
  }
}
