import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSettingsController, PublicSettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { SiteSetting } from './site-setting.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([SiteSetting])],
  controllers: [AdminSettingsController, PublicSettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
