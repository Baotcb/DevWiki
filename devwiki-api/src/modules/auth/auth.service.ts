import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── REGISTER ────────────────────────────────────────────────────────────────

  /**
   * Đăng ký tài khoản mới.
   * - Email phải unique
   * - Password được hash bằng bcrypt trước khi lưu
   * - Role mặc định: MEMBER
   */
  async register(dto: RegisterDto) {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .lean();

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.userModel.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      fullName: dto.fullName,
      role: UserRole.MEMBER,
    });

    return this.buildAuthResponse(user);
  }

  // ─── LOGIN ────────────────────────────────────────────────────────────────────

  /**
   * Đăng nhập với email + password.
   * Trả về access_token (15m) và refresh_token (7d).
   */
  async login(dto: LoginDto) {
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .select('+passwordHash');

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    return this.buildAuthResponse(user);
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────────────────────────

  /**
   * Cấp access_token mới bằng refresh_token hợp lệ.
   * Refresh token cũ bị revoke, cấp refresh token mới (Refresh Token Rotation).
   */
  async refreshTokens(rawRefreshToken: string) {
    // Verify chữ ký của refresh token
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(rawRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn.');
    }

    // Tìm refresh token trong DB theo hash
    const tokenHash = await bcrypt.hash(rawRefreshToken, 5);
    const storedToken = await this.refreshTokenModel.findOne({
      userId: new Types.ObjectId(payload.sub),
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã bị thu hồi.');
    }

    // So sánh hash
    const isTokenValid = await bcrypt.compare(rawRefreshToken, storedToken.tokenHash);
    if (!isTokenValid) {
      throw new UnauthorizedException('Refresh token không hợp lệ.');
    }

    // Revoke token cũ (Rotation)
    storedToken.isRevoked = true;
    await storedToken.save();

    // Lấy user info để tạo token mới
    const user = await this.userModel.findById(payload.sub).lean();
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa.');
    }

    return this.buildAuthResponse(user);
  }

  // ─── LOGOUT ───────────────────────────────────────────────────────────────────

  /**
   * Đăng xuất: revoke tất cả refresh token của user hiện tại.
   */
  async logout(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId: new Types.ObjectId(userId), isRevoked: false },
      { isRevoked: true },
    );
  }

  // ─── GET PROFILE ──────────────────────────────────────────────────────────────

  /**
   * Lấy thông tin profile của user hiện tại (từ JWT payload).
   */
  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-passwordHash')
      .lean();

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy tài khoản.');
    }

    return user;
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

  /**
   * Tạo access_token + refresh_token và lưu refresh_token vào DB.
   */
  private async buildAuthResponse(user: UserDocument | (User & { _id: Types.ObjectId })) {
    const userId = (user._id as Types.ObjectId).toString();

    const payload: JwtPayload = {
      sub: userId,
      email: user.email,
      role: user.role,
    };

    // Ký access token (15 phút)
    const accessToken = this.jwtService.sign(
      { sub: payload.sub, email: payload.email, role: payload.role },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    // Ký refresh token (7 ngày)
    const rawRefreshToken = this.jwtService.sign(
      { sub: payload.sub, email: payload.email, role: payload.role },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    // Hash refresh token trước khi lưu DB
    const tokenHash = await bcrypt.hash(rawRefreshToken, BCRYPT_SALT_ROUNDS);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenModel.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: userId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
      },
    };
  }
}
