import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators.js';
import { Role } from '../common/role.enum.js';
import { RolesService } from './roles.service.js';
import { RoleResponse } from '../users/users.responses.js';

@ApiTags('Admin - roles')
@ApiBearerAuth('access-token')
@Controller('admin/roles')
@Roles(Role.Admin)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List the static roles (for role dropdowns)' })
  @ApiOkResponse({ type: [RoleResponse] })
  async findAll() {
    return (await this.roles.findAll()).map((item) => RoleResponse.from(item));
  }
}
