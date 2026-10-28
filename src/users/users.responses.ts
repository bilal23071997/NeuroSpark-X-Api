import type { Role } from '../common/role.enum.js';
import type { RoleEntity } from '../roles/role.entity.js';
import type { User } from './user.entity.js';

export class RoleResponse {
  Id: number;
  Name: Role;
  Description: string;

  static from(role: RoleEntity): RoleResponse {
    return Object.assign(new RoleResponse(), {
      Id: role.id,
      Name: role.name,
      Description: role.description,
    });
  }
}

/** A staff account. Password and refresh token hashes are never part of it. */
export class UserResponse {
  Id: string;
  Email: string;
  Name: string;
  Role: RoleResponse;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;

  static from(user: User): UserResponse {
    return Object.assign(new UserResponse(), {
      Id: user.id,
      Email: user.email,
      Name: user.name,
      Role: RoleResponse.from(user.role),
      IsActive: user.isActive,
      CreatedAt: user.createdAt,
      UpdatedAt: user.updatedAt,
    });
  }
}
