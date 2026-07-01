import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── REGISTER ────────────────────────────────────────────────────────────────

  /**
   * Đăng ký tài khoản mới.
   * Role mặc định: MEMBER. Admin cấp quyền cao hơn sau.
   */
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiCreatedResponse({ description: 'Đăng ký thành công, trả về tokens và thông tin user.' })
  @ApiConflictResponse({ description: 'Email đã được sử dụng.' })
  async register(@Body() dto: RegisterDto) {
    try {
      const result = await this.authService.register(dto);
      return {
        message: 'Đăng ký thành công.',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // ─── LOGIN ────────────────────────────────────────────────────────────────────

  /**
   * Đăng nhập bằng email + password.
   * Trả về access_token (15 phút) và refresh_token (7 ngày).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiOkResponse({ description: 'Đăng nhập thành công, trả về JWT tokens.' })
  @ApiUnauthorizedResponse({ description: 'Email hoặc mật khẩu không đúng.' })
  async login(@Body() dto: LoginDto) {
    try {
      const result = await this.authService.login(dto);
      return {
        message: 'Đăng nhập thành công.',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────────────────────────

  /**
   * Cấp access_token mới bằng refresh_token.
   * Refresh token cũ bị vô hiệu hóa, cấp refresh token mới (Token Rotation).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token' })
  @ApiOkResponse({ description: 'Cấp token mới thành công.' })
  @ApiUnauthorizedResponse({ description: 'Refresh token không hợp lệ hoặc hết hạn.' })
  async refresh(@Body() dto: RefreshTokenDto) {
    try {
      const result = await this.authService.refreshTokens(dto.refreshToken);
      return {
        message: 'Làm mới token thành công.',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // ─── LOGOUT ───────────────────────────────────────────────────────────────────

  /**
   * Đăng xuất: vô hiệu hóa toàn bộ refresh token của user.
   * Yêu cầu Bearer token hợp lệ.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Đăng xuất' })
  @ApiOkResponse({ description: 'Đăng xuất thành công.' })
  @ApiUnauthorizedResponse({ description: 'Token không hợp lệ.' })
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.sub);
    return { message: 'Đăng xuất thành công.' };
  }

  // ─── GET PROFILE ──────────────────────────────────────────────────────────────

  /**
   * Lấy thông tin profile của user đang đăng nhập.
   * Sử dụng để client verify token còn hợp lệ.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  @ApiOkResponse({ description: 'Thông tin user.' })
  @ApiUnauthorizedResponse({ description: 'Token không hợp lệ.' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    const result = await this.authService.getProfile(user.sub);
    return { data: result };
  }
}
