import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)           // Toàn bộ controller yêu cầu JWT
@ApiBearerAuth('JWT-auth')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ─── LIST ─────────────────────────────────────────────────────────────────────

  /**
   * Lấy danh sách tài liệu với filter và pagination.
   * Hỗ trợ lọc theo: status, authorId, categoryId, tag, isOutdated.
   */
  @Get()
  @ApiOperation({ summary: 'Danh sách tài liệu (có filter, pagination)' })
  @ApiOkResponse({ description: 'Trả về danh sách tài liệu + metadata phân trang.' })
  async findAll(
    @Query() query: QueryDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.documentsService.findAll(query, user);
    return { data: result };
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────────

  /**
   * Tạo tài liệu mới (status = DRAFT).
   * Tự động sinh slug từ title (hỗ trợ tiếng Việt).
   * Đồng thời tạo version 1 trong document_versions.
   */
  @Post()
  @ApiOperation({ summary: 'Tạo tài liệu mới (DRAFT)' })
  @ApiCreatedResponse({ description: 'Tài liệu đã được tạo thành công.' })
  async create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      const result = await this.documentsService.create(dto, user);
      return {
        message: 'Tạo tài liệu thành công.',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // ─── GET BY SLUG ──────────────────────────────────────────────────────────────

  /**
   * Lấy chi tiết tài liệu theo slug.
   * Tăng viewCount +1 mỗi khi xem.
   */
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Chi tiết tài liệu theo slug' })
  @ApiParam({ name: 'slug', example: 'huong-dan-setup-docker-local' })
  @ApiOkResponse({ description: 'Thông tin chi tiết tài liệu.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tài liệu.' })
  async findBySlug(@Param('slug') slug: string) {
    const result = await this.documentsService.findBySlug(slug);
    return { data: result };
  }

  // ─── GET BY ID ────────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết tài liệu theo ID' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tài liệu.' })
  async findById(@Param('id') id: string) {
    const result = await this.documentsService.findById(id);
    return { data: result };
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────

  /**
   * Cập nhật tài liệu — tạo version snapshot tự động.
   * - Chủ sở hữu (Member): được sửa tài liệu của mình
   * - Editor / Admin: được sửa mọi tài liệu
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tài liệu (tạo version snapshot)' })
  @ApiOkResponse({ description: 'Tài liệu đã được cập nhật, version mới đã được tạo.' })
  @ApiForbiddenResponse({ description: 'Không có quyền chỉnh sửa tài liệu này.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      const result = await this.documentsService.update(id, dto, user);
      return {
        message: 'Cập nhật tài liệu thành công.',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // ─── PUBLISH ──────────────────────────────────────────────────────────────────

  /**
   * Publish tài liệu — chỉ EDITOR và ADMIN.
   */
  @Patch(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish tài liệu (chỉ Editor+)' })
  @ApiOkResponse({ description: 'Tài liệu đã được publish.' })
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      const result = await this.documentsService.publish(id, user);
      return {
        message: 'Publish tài liệu thành công.',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // ─── MARK OUTDATED ────────────────────────────────────────────────────────────

  /**
   * Đánh dấu tài liệu lỗi thời — mọi thành viên đều có thể báo cáo.
   */
  @Patch(':id/mark-outdated')
  @ApiOperation({ summary: 'Đánh dấu tài liệu lỗi thời (Outdated)' })
  @ApiOkResponse({ description: 'Tài liệu đã được đánh dấu lỗi thời.' })
  async markOutdated(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.documentsService.markOutdated(id, user);
    return {
      message: 'Đã đánh dấu tài liệu lỗi thời.',
      data: result,
    };
  }

  // ─── DELETE (SOFT) ────────────────────────────────────────────────────────────

  /**
   * Xóa mềm tài liệu — chuyển status sang ARCHIVED.
   * Chủ sở hữu hoặc Editor+ có thể xóa.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa mềm tài liệu (ARCHIVED)' })
  @ApiOkResponse({ description: 'Tài liệu đã được xóa (archived).' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      await this.documentsService.remove(id, user);
      return { message: 'Đã xóa tài liệu thành công.' };
    } catch (error) {
      throw error;
    }
  }

  // ─── VERSION HISTORY ──────────────────────────────────────────────────────────

  /**
   * Lấy danh sách tất cả versions của tài liệu.
   * Không kèm content (nhẹ hơn) — chỉ metadata.
   */
  @Get(':id/versions')
  @ApiOperation({ summary: 'Lịch sử phiên bản của tài liệu' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của tài liệu' })
  async getVersions(@Param('id') id: string) {
    const result = await this.documentsService.getVersions(id);
    return { data: result };
  }

  /**
   * Lấy nội dung của một version cụ thể (kèm content đầy đủ).
   */
  @Get(':id/versions/:versionNumber')
  @ApiOperation({ summary: 'Nội dung một phiên bản cụ thể' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của tài liệu' })
  @ApiParam({ name: 'versionNumber', description: 'Số thứ tự phiên bản', example: '3' })
  async getVersion(
    @Param('id') id: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    const result = await this.documentsService.getVersion(id, parseInt(versionNumber, 10));
    return { data: result };
  }

  /**
   * Khôi phục tài liệu về một phiên bản cũ.
   * Tạo version mới với content của version cũ — KHÔNG xóa lịch sử.
   * Chỉ EDITOR+.
   */
  @Post(':id/versions/:versionNumber/restore')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Khôi phục phiên bản cũ (chỉ Editor+)' })
  async restoreVersion(
    @Param('id') id: string,
    @Param('versionNumber') versionNumber: string,
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      const result = await this.documentsService.restoreVersion(
        id,
        parseInt(versionNumber, 10),
        user,
      );
      return {
        message: `Đã khôi phục về phiên bản ${versionNumber} thành công.`,
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }
}
