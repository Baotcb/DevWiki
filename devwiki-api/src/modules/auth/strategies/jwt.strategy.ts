import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super({
      // Lấy token từ Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  /**
   * Được gọi sau khi Passport đã verify chữ ký JWT thành công.
   * Kết quả trả về sẽ được gắn vào request.user.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Kiểm tra user vẫn còn tồn tại và chưa bị vô hiệu hóa
    const user = await this.userModel
      .findById(payload.sub)
      .select('isActive')
      .lean();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa.');
    }

    return payload;
  }
}
