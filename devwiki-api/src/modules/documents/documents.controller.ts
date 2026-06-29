import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiCreatedResponse } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách tất cả bài viết markdown' })
    findAll() {
        return [
            { id: '1', title: 'Hướng dẫn setup Docker Local', content: '...' },
            { id: '2', title: 'Quy trình Gitflow của team', content: '...' }
        ];
    }

    @Post()
    @ApiOperation({ summary: 'Tạo mới một bài viết markdown' })
    @ApiCreatedResponse({ description: 'Bài viết đã được tạo thành công.' })
    async create(@Body() createDocumentDto: CreateDocumentDto) {
        const result = await this.documentsService.create(createDocumentDto);
        return {
            message: 'Tạo bài viết thành công.',
            data: result,
        };
    }
}
