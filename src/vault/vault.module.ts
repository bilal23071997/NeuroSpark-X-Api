import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminVaultCategoriesController } from './admin-vault-categories.controller.js';
import { AdminVaultController } from './admin-vault.controller.js';
import { Product } from './product.entity.js';
import { ProductsService } from './products.service.js';
import { PublicVaultController } from './public-vault.controller.js';
import { VaultCategoriesService } from './vault-categories.service.js';
import { VaultCategory } from './vault-category.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([VaultCategory, Product])],
  controllers: [AdminVaultCategoriesController, AdminVaultController, PublicVaultController],
  providers: [VaultCategoriesService, ProductsService],
})
export class VaultModule {}
