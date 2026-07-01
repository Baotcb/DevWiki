import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard bảo vệ route bằng JWT.
 * Dùng: @UseGuards(JwtAuthGuard) trên controller hoặc route handler.
 *
 * Nếu token không hợp lệ hoặc hết hạn → tự động trả về 401 Unauthorized.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
