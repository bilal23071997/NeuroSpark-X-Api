import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators.js';
import { Role } from '../common/role.enum.js';
import { VaultCategoriesService } from './vault-categories.service.js';
import { VaultCategory } from './vault-category.entity.js';
import {
  CreateGroupDto,
  ReorderSubGroupsDto,
  UpdateGroupDto,
  VaultGroupNodeDto,
} from './vault.dto.js';

/**
 * The five official categories are fixed top-level groups. Admins manage the
 * sub-groups under them (one level deep).
 */
@ApiTags('Admin - Vault groups')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/vault/categories')
@Roles(Role.Admin)
export class AdminVaultCategoriesController {
  constructor(private readonly categories: VaultCategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'The group tree: the five categories, each with its sub-groups',
    description:
      'Use the `id` of any group as a product `categoryId`. Counts include drafts.',
  })
  @ApiOkResponse({ type: [VaultGroupNodeDto] })
  tree() {
    return this.categories.adminTree();
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a sub-group (send parentId) or a new top-level group (leave parentId out)',
  })
  @ApiCreatedResponse({ type: VaultCategory })
  @ApiBadRequestResponse({
    description: 'The parent does not exist or is itself a sub-group',
  })
  @ApiConflictResponse({ description: 'Slug already in use' })
  create(@Body() dto: CreateGroupDto) {
    return this.categories.createGroup(dto);
  }

  @Put('reorder')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Set the order of one category’s sub-groups',
    description:
      '`ids` must list every sub-group of that category exactly once, in the new order.',
  })
  @ApiOkResponse({ type: [VaultGroupNodeDto] })
  @ApiBadRequestResponse({
    description: 'ids do not match that category’s sub-groups',
  })
  reorder(@Body() dto: ReorderSubGroupsDto) {
    return this.categories.reorder(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a group',
    description:
      'A sub-group can change name, slug, description, order or parent. An official category accepts only `description`.',
  })
  @ApiOkResponse({ type: VaultCategory })
  @ApiBadRequestResponse({
    description: 'Tried to change a locked field of an official category',
  })
  @ApiNotFoundResponse()
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGroupDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an empty sub-group' })
  @ApiNoContentResponse()
  @ApiConflictResponse({
    description: 'It is an official category, or it still has products',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(id);
  }
}
