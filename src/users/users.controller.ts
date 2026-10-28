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
import { UsersService } from './users.service.js';
import { UserResponse } from './users.responses.js';

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
  @ApiOkResponse({ type: [UserResponse] })
  async findAll(@Query('role', new ParseEnumPipe(Role, { optional: true })) role?: Role) {
    return (await this.users.findAll(role)).map((item) => UserResponse.from(item));
  }

  @Post()
  @ApiOperation({ summary: 'Create a staff account (admin or editor)' })
  @ApiCreatedResponse({ type: UserResponse })
  @ApiConflictResponse({ description: 'Email already in use' })
  async create(@Body() dto: CreateUserDto) {
    return UserResponse.from(await this.users.create(dto));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update name, role, password or active state',
    description: 'Deactivating a user or changing their password ends their sessions.',
  })
  @ApiOkResponse({ type: UserResponse })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return UserResponse.from(await this.users.update(id, dto));
  }
}
