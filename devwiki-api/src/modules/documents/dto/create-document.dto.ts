import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
    @ApiProperty({
        example: 'Hướng dẫn setup Docker Local',
        description: 'Tiêu đề bài viết',
    })
    title: string;

    @ApiProperty({
        example: '# Docker Setup\n\nHướng dẫn từng bước...',
        description: 'Nội dung markdown của bài viết',
    })
    content: string;

    @ApiPropertyOptional({
        example: ['docker', 'devops', 'local'],
        description: 'Danh sách tag để phân loại bài viết',
        type: [String],
    })
    tags?: string[];

    @ApiProperty({
        example: 'user-001',
        description: 'ID của người tạo bài viết',
    })
    authorId: string;
}
