import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

/**
 * Decorator lấy thông tin user hiện tại từ JWT payload trong request.
 * Phải dùng sau @UseGuards(JwtAuthGuard).
 *
 * @example
 * async getProfile(@CurrentUser() user: JwtPayload) {
 *   return user.sub; // MongoDB ObjectId
 * }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);
