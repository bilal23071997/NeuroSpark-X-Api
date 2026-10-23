import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role, STAFF_ROLES } from '../common/role.enum.js';

export class CreateUserDto {
  /** @example jane@neurosparkx.com */
  @IsEmail()
  email: string;

  /** @example Jane Editor */
  @IsString()
  @MinLength(1)
  name: string;

  /** At least 10 characters. */
  @IsString()
  @MinLength(10)
  password: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role: Role;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  password?: string;

  @ApiProperty({ enum: Role, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
