import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SitePage } from './page.entity.js';
import { AdminPagesController, PublicPagesController } from './pages.controller.js';
import { PagesService } from './pages.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SitePage])],
  controllers: [AdminPagesController, PublicPagesController],
  providers: [PagesService],
})
export class PagesModule {}
