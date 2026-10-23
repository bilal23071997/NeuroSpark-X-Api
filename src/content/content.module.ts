import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminArticlesController } from './admin-articles.controller.js';
import { AdminEpisodesController } from './admin-episodes.controller.js';
import { AdminNichesController } from './admin-niches.controller.js';
import { Article } from './article.entity.js';
import { ArticlesService } from './articles.service.js';
import { Episode } from './episode.entity.js';
import { EpisodesService } from './episodes.service.js';
import { Niche } from './niche.entity.js';
import { NichesService } from './niches.service.js';
import { PublicContentController } from './public-content.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Niche, Article, Episode])],
  controllers: [
    AdminNichesController,
    AdminArticlesController,
    AdminEpisodesController,
    PublicContentController,
  ],
  providers: [NichesService, ArticlesService, EpisodesService],
})
export class ContentModule {}
