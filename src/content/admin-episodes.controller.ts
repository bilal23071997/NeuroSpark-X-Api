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
import { Episode } from './episode.entity.js';
import { EpisodesService } from './episodes.service.js';
import { PublishStatus } from './publish-status.enum.js';

@ApiTags('Admin - episodes (Listen)')
@ApiBearerAuth('access-token')
@Controller('admin/episodes')
export class AdminEpisodesController {
  constructor(private readonly episodes: EpisodesService) {}

  @Get()
  @ApiOperation({ summary: 'List episodes (drafts and published), newest number first' })
  @ApiQuery({ name: 'status', enum: PublishStatus, required: false })
  @ApiQuery({ name: 'series', required: false, description: 'Series slug' })
  @ApiOkResponse({ type: [Episode] })
  findAll(
    @Query('status', new ParseEnumPipe(PublishStatus, { optional: true })) status?: PublishStatus,
    @Query('series') series?: string,
  ) {
    return this.episodes.findAll({ status, series });
  }

  @Get(':id')
  @ApiOperation({ summary: 'One episode' })
  @ApiOkResponse({ type: Episode })
  @ApiNotFoundResponse()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.episodes.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an episode (starts as a draft)' })
  @ApiCreatedResponse({ type: Episode })
  @ApiConflictResponse({ description: 'Slug already in use' })
  create(@Body() dto: CreateEpisodeDto) {
    return this.episodes.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an episode' })
  @ApiOkResponse({ type: Episode })
  @ApiNotFoundResponse()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEpisodeDto) {
    return this.episodes.update(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Publish an episode',
    description: 'Needs a YouTube link. Sets the publish date the first time.',
  })
  @ApiOkResponse({ type: Episode })
  @ApiBadRequestResponse({ description: 'The episode has no YouTube link yet' })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.episodes.publish(id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Take an episode back to draft' })
  @ApiOkResponse({ type: Episode })
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.episodes.unpublish(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an episode' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.episodes.remove(id);
  }
}
