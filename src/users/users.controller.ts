import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
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
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators.js';
import { Role } from '../common/role.enum.js';
import { CreateUserDto, UpdateUserDto } from './dto.js';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

@ApiTags('Admin - staff users')
@ApiBearerAuth('access-token')
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/users')
@Roles(Role.Admin)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List staff accounts, optionally by role' })
  @ApiQuery({ name: 'role', enum: Role, required: false })
  @ApiOkResponse({ type: [User] })
  findAll(@Query('role', new ParseEnumPipe(Role, { optional: true })) role?: Role) {
    return this.users.findAll(role);
  }

  @Post()
  @ApiOperation({ summary: 'Create a staff account (admin or editor)' })
  @ApiCreatedResponse({ type: User })
  @ApiConflictResponse({ description: 'Email already in use' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update name, role, password or active state',
    description: 'Deactivating a user or changing their password ends their sessions.',
  })
  @ApiOkResponse({ type: User })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }
}
