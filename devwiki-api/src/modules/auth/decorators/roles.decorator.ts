import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/schemas/user.schema';

export const ROLES_KEY = 'roles';

/**
 * Decorator để khai báo role được phép truy cập route.
 * Dùng kết hợp với RolesGuard.
 *
 * @example
 * @Roles(UserRole.ADMIN, UserRole.EDITOR)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async someAdminRoute() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
