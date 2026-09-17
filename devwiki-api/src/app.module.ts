import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsModule } from './modules/documents/documents.module';
import { AuthModule } from './modules/auth/auth.module';
import { SearchModule } from './modules/search/search.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // 1. Đọc file .env và expose biến môi trường toàn cục cho toàn bộ ứng dụng
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Kết nối MongoDB Atlas, dùng ConfigService để lấy URI từ .env an toàn
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),

    DocumentsModule,
    AuthModule,
    SearchModule,
    HealthModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
