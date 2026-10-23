import { Controller, Get, Param, ParseBoolPipe, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators.js';
import { ProductsService } from './products.service.js';
import { VaultCategoriesService } from './vault-categories.service.js';
import {
  PublicProductDto,
  PublicProductSummaryDto,
  PublicVaultCategoryDto,
} from './vault.dto.js';

/** Read-only catalog for the website. No sign-in; only published products are returned. */
@ApiTags('Public - The Vault')
@Public()
@Controller('public/vault')
export class PublicVaultController {
  constructor(
    private readonly products: ProductsService,
    private readonly categories: VaultCategoriesService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'The five categories, in their official order' })
  @ApiOkResponse({ type: [PublicVaultCategoryDto] })
  async findCategories(): Promise<PublicVaultCategoryDto[]> {
    const categories = await this.categories.findAll();
    return categories.map(({ slug, name, description }) => ({ slug, name, description }));
  }

  @Get('products')
  @ApiOperation({ summary: 'Published products, newest first' })
  @ApiQuery({ name: 'category', required: false, description: 'Category slug' })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'popular', required: false, type: Boolean })
  @ApiOkResponse({ type: [PublicProductSummaryDto] })
  list(
    @Query('category') categorySlug?: string,
    @Query('featured', new ParseBoolPipe({ optional: true })) featured?: boolean,
    @Query('popular', new ParseBoolPipe({ optional: true })) popular?: boolean,
  ) {
    return this.products.listPublished({ categorySlug, featured, popular });
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'One published product, with its full description' })
  @ApiOkResponse({ type: PublicProductDto })
  @ApiNotFoundResponse()
  get(@Param('slug') slug: string) {
    return this.products.getPublished(slug);
  }
}
