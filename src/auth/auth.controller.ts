import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators.js';
import { UsersService } from '../users/users.service.js';
import type { AuthRequest } from './auth.types.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto, LoginDto, RefreshDto, TokensDto } from './dto.js';
import { UserResponse } from '../users/users.responses.js';

/** Admin portal sign-in. Only staff (admin, editor) have accounts; shoppers never sign in. */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  // Slows password guessing: 10 attempts per minute per IP.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: TokensDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiTooManyRequestsResponse({ description: 'More than 10 attempts in a minute' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiOkResponse({ type: TokensDto })
  @ApiUnauthorizedResponse({ description: 'Invalid, used or revoked refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Sign out and revoke the refresh token' })
  @ApiNoContentResponse()
  async logout(@Req() req: AuthRequest) {
    await this.auth.logout(req.user.id);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'The signed-in user, with their role' })
  @ApiOkResponse({ type: UserResponse })
  async me(@Req() req: AuthRequest) {
    return UserResponse.from(await this.users.getOrFail(req.user.id));
  }

  @Post('password')
  @HttpCode(204)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Change my password',
    description: 'Signs the user out everywhere; sign in again with the new password.',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Current password is incorrect' })
  async changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto) {
    await this.users.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }
}
