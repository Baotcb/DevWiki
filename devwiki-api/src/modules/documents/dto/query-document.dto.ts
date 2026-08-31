import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';
import { DocumentStatus } from '../schemas/document.schema';

export class QueryDocumentDto {
  @ApiPropertyOptional({ example: '1', description: 'Trang hiện tại (bắt đầu từ 1)', default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ example: '20', description: 'Số tài liệu mỗi trang (tối đa 100)', default: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({
    enum: DocumentStatus,
    description: 'Lọc theo trạng thái',
    example: DocumentStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Lọc theo tác giả (MongoDB ObjectId)',
  })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Lọc theo category (MongoDB ObjectId)',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'docker',
    description: 'Lọc theo tag',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    enum: ['updatedAt_desc', 'createdAt_desc', 'viewCount_desc', 'title_asc'],
    default: 'updatedAt_desc',
    description: 'Sắp xếp kết quả',
  })
  @IsOptional()
  @IsIn(['updatedAt_desc', 'createdAt_desc', 'viewCount_desc', 'title_asc'])
  sort?: 'updatedAt_desc' | 'createdAt_desc' | 'viewCount_desc' | 'title_asc';

  @ApiPropertyOptional({
    example: 'true',
    description: 'Chỉ lấy tài liệu bị đánh dấu lỗi thời',
  })
  @IsOptional()
  @IsString()
  isOutdated?: string;
}
