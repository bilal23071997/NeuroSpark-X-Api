import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators.js';
import { Role } from '../common/role.enum.js';
import { PublishStatus } from '../content/publish-status.enum.js';
import { Product } from './product.entity.js';
import { ProductsService } from './products.service.js';
import { VaultCategoriesService } from './vault-categories.service.js';
import { VaultCategory } from './vault-category.entity.js';
import { CreateProductDto, UpdateProductDto } from './vault.dto.js';

@ApiTags('Admin - The Vault')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/vault')
@Roles(Role.Admin)
export class AdminVaultController {
  constructor(
    private readonly products: ProductsService,
    private readonly categories: VaultCategoriesService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'The five fixed Vault categories (read-only, for dropdowns)' })
  @ApiOkResponse({ type: [VaultCategory] })
  findCategories() {
    return this.categories.findAll();
  }

  @Get('products')
  @ApiOperation({ summary: 'List products (drafts and published), newest first' })
  @ApiQuery({ name: 'status', enum: PublishStatus, required: false })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiOkResponse({ type: [Product] })
  findAll(
    @Query('status', new ParseEnumPipe(PublishStatus, { optional: true })) status?: PublishStatus,
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
  ) {
    return this.products.findAll({ status, categoryId });
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'One product' })
  @ApiOkResponse({ type: Product })
  @ApiNotFoundResponse()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.get(id);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a product (starts as a draft)' })
  @ApiCreatedResponse({ type: Product })
  @ApiConflictResponse({ description: 'Slug already in use' })
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Edit a product' })
  @ApiOkResponse({ type: Product })
  @ApiNotFoundResponse()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Post('products/:id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publish a product (sets its publish date the first time)' })
  @ApiOkResponse({ type: Product })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.publish(id);
  }

  @Post('products/:id/unpublish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Take a product back to draft' })
  @ApiOkResponse({ type: Product })
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.unpublish(id);
  }

  @Delete('products/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(id);
  }
}
