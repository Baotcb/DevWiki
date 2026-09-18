import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import slugify from 'slugify';
import { DocumentItem, DocumentDocument, DocumentStatus } from './schemas/document.schema';
import { DocumentVersion, DocumentVersionDocument } from './schemas/document-version.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DocumentAttachment } from './schemas/document.schema';

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentItem.name)
    private readonly documentModel: Model<DocumentDocument>,

    @InjectModel(DocumentVersion.name)
    private readonly versionModel: Model<DocumentVersionDocument>,
  ) { }

  private get uploadDir(): string {
    return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  /**
   * Sinh slug từ title.
   * Hỗ trợ cả tiếng Việt (normalize diacritics) và tiếng Anh.
   * Nếu slug đã tồn tại → append timestamp để đảm bảo unique.
   */
  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = slugify(title, {
      lower: true,
      strict: true,     // chỉ giữ chữ cái và số, bỏ ký tự đặc biệt
      locale: 'vi',     // normalize dấu tiếng Việt: ă→a, ơ→o, v.v.
      trim: true,
    });

    const slug = base || 'document';

    // Kiểm tra trùng lặp
    const findQuery: Record<string, unknown> = { slug };
    if (excludeId) {
      findQuery._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const existing = await this.documentModel.findOne(findQuery as Record<string, never>).select('_id').lean();

    if (!existing) return slug;

    // Trùng → append timestamp
    return `${slug}-${Date.now()}`;
  }

  /**
   * Kiểm tra user có quyền chỉnh sửa tài liệu không.
   * - Chủ sở hữu (authorId) → luôn được sửa
   * - EDITOR / ADMIN → luôn được sửa
   * - Ngược lại → ForbiddenException
   */
  private assertCanEdit(doc: DocumentDocument, user: JwtPayload): void {
    const isOwner = doc.authorId.toString() === user.sub;
    const isPrivileged = user.role === 'EDITOR' || user.role === 'ADMIN';
    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa tài liệu này.');
    }
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────────

  /**
   * Tạo tài liệu mới với status DRAFT.
   * Đồng thời tạo version 1 (snapshot) trong document_versions.
   * Đánh dấu embeddingStatus = 'pending' để background job xử lý sau.
   */
  async create(dto: CreateDocumentDto, user: JwtPayload): Promise<DocumentDocument> {
    const slug = await this.generateUniqueSlug(dto.title);

    const doc = await this.documentModel.create({
      title: dto.title,
      slug,
      content: dto.content ?? '',
      tags: dto.tags ?? [],
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined,
      authorId: new Types.ObjectId(user.sub),
      status: DocumentStatus.DRAFT,
      currentVersion: 1,
      embeddingStatus: 'pending',
    });

    // Tạo version 1 — snapshot nội dung ban đầu
    await this.versionModel.create({
      documentId: doc._id,
      content: doc.content,
      versionNumber: 1,
      changeSummary: dto.changeSummary || 'Tạo tài liệu',
      createdBy: new Types.ObjectId(user.sub),
    });

    // TODO: Trigger background job để sinh embedding cho RAG
    // this.embeddingQueue.add({ documentId: doc._id.toString(), content: doc.content });

    return doc;
  }

  // ─── FIND ALL ─────────────────────────────────────────────────────────────────

  /**
   * Lấy danh sách tài liệu với filter, sort và pagination.
   * Không trả về embedding field (select: false đã đặt trong schema).
   */
  async findAll(query: QueryDocumentDto, _user: JwtPayload) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, parseInt(query.limit ?? '20', 10));
    const skip = (page - 1) * limit;

    // Build filter — guard ObjectId.isValid để tránh cast error
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.authorId && Types.ObjectId.isValid(query.authorId)) {
      filter.authorId = new Types.ObjectId(query.authorId);
    }
    if (query.categoryId && Types.ObjectId.isValid(query.categoryId)) {
      filter.categoryId = new Types.ObjectId(query.categoryId);
    }
    if (query.tag) filter.tags = { $in: [query.tag] };
    if (query.isOutdated === 'true') filter.isOutdated = true;

    // Build sort
    const SORT_MAP: Record<string, Record<string, number>> = {
      updatedAt_desc: { updatedAt: -1 },
      createdAt_desc: { createdAt: -1 },
      viewCount_desc: { viewCount: -1 },
      title_asc: { title: 1 },
    };
    const sort = SORT_MAP[query.sort ?? 'updatedAt_desc'];

    const [items, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .sort(sort as Record<string, 1 | -1>)
        .skip(skip)
        .limit(limit)
        // Populate author info cho danh sách
        .populate('authorId', 'fullName avatarUrl')
        .select('-content -embedding') // bỏ content nặng và embedding trong list
        .lean(),
      this.documentModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── FIND BY SLUG ─────────────────────────────────────────────────────────────

  /**
   * Lấy chi tiết tài liệu theo slug.
   * Tăng viewCount +1 mỗi khi xem (fire-and-forget).
   */
  async findBySlug(slug: string): Promise<DocumentDocument> {
    const doc = await this.documentModel
      .findOne({ slug, status: { $ne: DocumentStatus.ARCHIVED } })
      .populate('authorId', 'fullName avatarUrl email')
      .populate('updatedBy', 'fullName avatarUrl')
      .lean();

    if (!doc) {
      throw new NotFoundException(`Không tìm thấy tài liệu với slug: "${slug}".`);
    }

    // Tăng viewCount bất đồng bộ (không await để không delay response)
    this.documentModel
      .updateOne({ _id: (doc as DocumentDocument & { _id: Types.ObjectId })._id }, { $inc: { viewCount: 1 } })
      .exec()
      .catch(() => {/* ignore */ });

    return doc as DocumentDocument;
  }

  // ─── FIND BY ID ───────────────────────────────────────────────────────────────

  async findById(id: string): Promise<DocumentDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID tài liệu không hợp lệ.');
    }

    const doc = await this.documentModel.findById(id).lean();
    if (!doc || doc.status === DocumentStatus.ARCHIVED) {
      throw new NotFoundException('Không tìm thấy tài liệu.');
    }
    return doc as DocumentDocument;
  }

  async uploadAttachment(
    id: string,
    file: UploadedFile,
    user: JwtPayload,
  ): Promise<DocumentDocument> {
    const doc = await this.documentModel.findById(id);
    if (!doc || doc.status === DocumentStatus.ARCHIVED) {
      throw new NotFoundException('Không tìm thấy tài liệu.');
    }

    this.assertCanEdit(doc, user);
    await mkdir(this.uploadDir, { recursive: true });

    const storedName = `${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await writeFile(join(this.uploadDir, storedName), file.buffer);

    const attachment: Partial<DocumentAttachment> = {
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.size,
      uploadedBy: new Types.ObjectId(user.sub),
      uploadedAt: new Date(),
    };

    try {
      const updated = await this.documentModel
        .findByIdAndUpdate(
          id,
          { $push: { attachments: attachment }, $set: { updatedBy: new Types.ObjectId(user.sub) } },
          { new: true },
        )
        .lean();
      return updated as DocumentDocument;
    } catch (error) {
      await unlink(join(this.uploadDir, storedName)).catch(() => undefined);
      throw error;
    }
  }

  async getAttachment(id: string, attachmentId: string) {
    const doc = await this.findById(id);
    const attachment = (doc.attachments ?? []).find(
      (item) => (item as unknown as { _id: Types.ObjectId })._id.toString() === attachmentId,
    );
    if (!attachment) throw new NotFoundException('Không tìm thấy file đính kèm.');

    return {
      attachment,
      stream: createReadStream(join(this.uploadDir, attachment.storedName)),
    };
  }

  async removeAttachment(id: string, attachmentId: string, user: JwtPayload): Promise<DocumentDocument> {
    const doc = await this.documentModel.findById(id);
    if (!doc || doc.status === DocumentStatus.ARCHIVED) {
      throw new NotFoundException('Không tìm thấy tài liệu.');
    }

    this.assertCanEdit(doc, user);
    const attachment = (doc.attachments ?? []).find(
      (item) => (item as unknown as { _id: Types.ObjectId })._id.toString() === attachmentId,
    );
    if (!attachment) throw new NotFoundException('Không tìm thấy file đính kèm.');

    await unlink(join(this.uploadDir, attachment.storedName)).catch(() => undefined);
    const updated = await this.documentModel
      .findByIdAndUpdate(
        id,
        { $pull: { attachments: { _id: attachmentId } }, $set: { updatedBy: new Types.ObjectId(user.sub) } },
        { new: true },
      )
      .lean();
    return updated as DocumentDocument;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────

  /**
   * Cập nhật tài liệu.
   * Logic snapshot:
   *   1. Lưu content HIỆN TẠI vào document_versions (version N)
   *   2. Ghi content MỚI lên document (version N+1)
   *
   * Đánh dấu embeddingStatus = 'pending' để trigger re-embed sau khi nội dung thay đổi.
   */
  async update(id: string, dto: UpdateDocumentDto, user: JwtPayload): Promise<DocumentDocument> {
    const doc = await this.documentModel.findById(id);
    if (!doc || doc.status === DocumentStatus.ARCHIVED) {
      throw new NotFoundException('Không tìm thấy tài liệu.');
    }

    this.assertCanEdit(doc, user);

    const nextVersion = doc.currentVersion + 1;
    const contentChanged = dto.content !== undefined && dto.content !== doc.content;
    const titleChanged = dto.title !== undefined && dto.title !== doc.title;

    // Tạo version snapshot NẾU có thay đổi content hoặc title
    if (contentChanged || titleChanged) {
      await this.versionModel.create({
        documentId: doc._id,
        content: doc.content, // snapshot nội dung CŨ trước khi ghi đè
        versionNumber: nextVersion,
        changeSummary: dto.changeSummary || `Cập nhật phiên bản ${nextVersion}`,
        createdBy: new Types.ObjectId(user.sub),
      });
    }

    // Build update payload
    const updatePayload: Partial<DocumentItem> = {
      updatedBy: new Types.ObjectId(user.sub) as unknown as Types.ObjectId,
    };

    if (dto.title !== undefined) {
      updatePayload.title = dto.title;
      // Chỉ re-generate slug nếu title thay đổi và doc vẫn là DRAFT
      if (doc.status === DocumentStatus.DRAFT) {
        updatePayload.slug = await this.generateUniqueSlug(dto.title, id);
      }
    }
    if (dto.content !== undefined) {
      updatePayload.content = dto.content;
      // Đánh dấu cần re-embed vì content thay đổi
      updatePayload.embeddingStatus = 'pending';
      updatePayload.embeddingUpdatedAt = undefined;
    }
    if (dto.tags !== undefined) updatePayload.tags = dto.tags;
    if (dto.categoryId !== undefined) {
      (updatePayload as Record<string, unknown>).categoryId = dto.categoryId
        ? new Types.ObjectId(dto.categoryId)
        : null;
    }
    if (contentChanged || titleChanged) {
      updatePayload.currentVersion = nextVersion;
    }

    const updated = await this.documentModel
      .findByIdAndUpdate(id, { $set: updatePayload }, { new: true })
      .lean();

    // TODO: Trigger re-embedding job nếu content thay đổi
    // if (contentChanged) this.embeddingQueue.add({ documentId: id, content: dto.content });

    return updated as DocumentDocument;
  }

  // ─── PUBLISH ──────────────────────────────────────────────────────────────────

  /** Chỉ EDITOR+ được publish. */
  async publish(id: string, user: JwtPayload): Promise<DocumentDocument> {
    if (user.role !== 'EDITOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ Editor hoặc Admin mới có thể publish tài liệu.');
    }

    const doc = await this.documentModel.findById(id);
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu.');

    if (doc.status === DocumentStatus.PUBLISHED) {
      throw new ConflictException('Tài liệu đã được publish rồi.');
    }

    const updated = await this.documentModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: DocumentStatus.PUBLISHED,
            publishedAt: new Date(),
            updatedBy: new Types.ObjectId(user.sub),
          },
        },
        { new: true },
      )
      .lean();

    return updated as DocumentDocument;
  }

  // ─── MARK OUTDATED ────────────────────────────────────────────────────────────

  async markOutdated(id: string, user: JwtPayload): Promise<DocumentDocument> {
    const doc = await this.documentModel.findById(id);
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu.');

    const updated = await this.documentModel
      .findByIdAndUpdate(
        id,
        { $set: { isOutdated: true, updatedBy: new Types.ObjectId(user.sub) } },
        { new: true },
      )
      .lean();

    return updated as DocumentDocument;
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────────────────

  /** Soft delete: chuyển status sang ARCHIVED, không xóa khỏi DB. */
  async remove(id: string, user: JwtPayload): Promise<void> {
    const doc = await this.documentModel.findById(id);
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu.');

    this.assertCanEdit(doc, user);

    await this.documentModel.findByIdAndUpdate(id, {
      $set: { status: DocumentStatus.ARCHIVED, updatedBy: new Types.ObjectId(user.sub) },
    });
  }

  // ─── VERSION HISTORY ──────────────────────────────────────────────────────────

  /** Lấy danh sách tất cả versions của một document (không kèm content để nhẹ). */
  async getVersions(documentId: string) {
    if (!Types.ObjectId.isValid(documentId)) {
      throw new NotFoundException('ID tài liệu không hợp lệ.');
    }

    const versions = await this.versionModel
      .find({ documentId: new Types.ObjectId(documentId) })
      .sort({ versionNumber: -1 }) // mới nhất trước
      .populate('createdBy', 'fullName avatarUrl')
      .select('-content') // không trả content trong danh sách (nặng)
      .lean();

    return versions;
  }

  /** Lấy nội dung của một version cụ thể. */
  async getVersion(documentId: string, versionNumber: number) {
    if (!Types.ObjectId.isValid(documentId)) {
      throw new NotFoundException('ID tài liệu không hợp lệ.');
    }

    const version = await this.versionModel
      .findOne({
        documentId: new Types.ObjectId(documentId),
        versionNumber,
      })
      .populate('createdBy', 'fullName avatarUrl')
      .lean();

    if (!version) {
      throw new NotFoundException(`Không tìm thấy phiên bản ${versionNumber}.`);
    }

    return version;
  }

  // ─── RESTORE VERSION ──────────────────────────────────────────────────────────

  /**
   * Khôi phục một version cũ.
   * Cách làm: tạo version mới với content từ version cũ (KHÔNG xóa version cũ).
   * Chỉ EDITOR+ được thực hiện.
   */
  async restoreVersion(documentId: string, versionNumber: number, user: JwtPayload): Promise<DocumentDocument> {
    if (user.role !== 'EDITOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ Editor hoặc Admin mới có thể khôi phục phiên bản cũ.');
    }

    const doc = await this.documentModel.findById(documentId);
    if (!doc) throw new NotFoundException('Không tìm thấy tài liệu.');

    const targetVersion = await this.versionModel.findOne({
      documentId: new Types.ObjectId(documentId),
      versionNumber,
    });
    if (!targetVersion) {
      throw new NotFoundException(`Không tìm thấy phiên bản ${versionNumber}.`);
    }

    const nextVersion = doc.currentVersion + 1;

    // Snapshot version hiện tại trước khi restore
    await this.versionModel.create({
      documentId: doc._id,
      content: targetVersion.content,
      versionNumber: nextVersion,
      changeSummary: `Khôi phục từ phiên bản ${versionNumber}`,
      createdBy: new Types.ObjectId(user.sub),
    });

    const updated = await this.documentModel
      .findByIdAndUpdate(
        documentId,
        {
          $set: {
            content: targetVersion.content,
            currentVersion: nextVersion,
            updatedBy: new Types.ObjectId(user.sub),
            embeddingStatus: 'pending',
          },
        },
        { new: true },
      )
      .lean();

    return updated as DocumentDocument;
  }

  // ─── RAG HELPERS (dùng bởi EmbeddingService) ─────────────────────────────────

  /**
   * Cập nhật embedding vector cho document sau khi sinh xong.
   * Được gọi bởi EmbeddingService / background job.
   */
  async updateEmbedding(documentId: string, embedding: number[]): Promise<void> {
    await this.documentModel.updateOne(
      { _id: new Types.ObjectId(documentId) },
      {
        $set: {
          embedding,
          embeddingStatus: 'done',
          embeddingUpdatedAt: new Date(),
        },
      },
    );
  }

  /**
   * Lấy các documents chưa có embedding (dùng cho batch job).
   */
  async findPendingEmbeddings(limit = 50): Promise<DocumentDocument[]> {
    return this.documentModel
      .find({ embeddingStatus: 'pending', status: DocumentStatus.PUBLISHED })
      .select('_id content title')
      .limit(limit)
      .lean() as unknown as DocumentDocument[];
  }
}
