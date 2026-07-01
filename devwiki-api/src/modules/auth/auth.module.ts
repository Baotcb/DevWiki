import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule không cấu hình secret ở đây vì AuthService tự ký với secret riêng
    // cho access_token và refresh_token (2 secret khác nhau)
    JwtModule.register({}),

    // Đăng ký schemas cần dùng trong module này
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // Export JwtStrategy và PassportModule để các module khác dùng @UseGuards(JwtAuthGuard)
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
