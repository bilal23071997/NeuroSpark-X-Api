import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators.js';
import { Role } from '../common/role.enum.js';
import { RoleEntity } from './role.entity.js';
import { RolesService } from './roles.service.js';

@ApiTags('Admin - roles')
@ApiBearerAuth('access-token')
@Controller('admin/roles')
@Roles(Role.Admin)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List the static roles (for role dropdowns)' })
  @ApiOkResponse({ type: [RoleEntity] })
  findAll() {
    return this.roles.findAll();
  }
}
