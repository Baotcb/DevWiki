import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    example: 'Hướng dẫn setup Docker Local',
    description: 'Tiêu đề tài liệu (hỗ trợ cả tiếng Việt lẫn tiếng Anh)',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống.' })
  @MaxLength(200, { message: 'Tiêu đề tối đa 200 ký tự.' })
  title: string;

  @ApiPropertyOptional({
    example: '# Docker Setup\n\nHướng dẫn từng bước...',
    description: 'Nội dung Markdown. Có thể để trống khi tạo Draft.',
    default: '',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    example: ['docker', 'devops', 'local-setup'],
    description: 'Danh sách tag phân loại',
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
    example: 'Tạo tài liệu hướng dẫn Docker cho team',
    description: 'Ghi chú cho version đầu tiên',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  changeSummary?: string;
}
