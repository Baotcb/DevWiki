import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('bootstrap');

  // Cho phép React frontend (Vite dev server) gọi API
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    credentials: true,
  });

  app.setGlobalPrefix('/api');

  // Bật validation cho toàn bộ DTO dùng class-validator
  // whitelist: tự động loại bỏ các field không khai báo trong DTO
  // transform: tự động convert type (string → number, v.v.)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('DevWiki - Internal Knowledge Base API')
    .setDescription('Hệ thống tài liệu quản trị tri thức nội bộ tích hợp AI cho Dev Team')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập mã token JWT vào đây',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  logger.log(`🚀 DevWiki API đang chạy tại: http://localhost:${process.env.PORT ?? 3000}`);
  logger.log(`📚 Swagger docs: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap();

