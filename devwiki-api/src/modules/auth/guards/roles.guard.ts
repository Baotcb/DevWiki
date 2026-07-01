import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/schemas/user.schema';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

/**
 * Guard kiểm tra role của user hiện tại.
 * PHẢI dùng sau JwtAuthGuard (vì cần request.user đã được populate).
 *
 * @example
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu không khai báo @Roles() thì cho qua (chỉ cần JWT hợp lệ)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{ user: JwtPayload }>().user;

    if (!requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(
        `Yêu cầu quyền: ${requiredRoles.join(' hoặc ')}. Quyền hiện tại: ${user.role}.`,
      );
    }

    return true;
  }
}
