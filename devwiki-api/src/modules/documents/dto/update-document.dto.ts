import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDocumentDto {
  @ApiPropertyOptional({
    example: 'Hướng dẫn setup Docker Local (cập nhật)',
    description: 'Tiêu đề mới (nếu muốn thay đổi)',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    example: '# Docker Setup\n\nNội dung đã cập nhật...',
    description: 'Nội dung Markdown mới',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    example: ['docker', 'devops'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'MongoDB ObjectId của Category',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'Cập nhật phần cài đặt Docker Compose v2',
    description: 'Mô tả thay đổi cho version mới này',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  changeSummary?: string;
}
