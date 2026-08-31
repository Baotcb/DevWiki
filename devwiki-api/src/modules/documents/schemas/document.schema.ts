import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export type DocumentDocument = DocumentItem & MongooseDocument;

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Schema({ timestamps: true, collection: 'documents' })
export class DocumentItem {
  // ── Core ──────────────────────────────────────────────────────────────────
  @Prop({ required: true, trim: true })
  title: string;

  /** Slug URL-safe, unique. Hỗ trợ cả tiếng Anh lẫn tiếng Việt (đã normalize). */
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  /** Nội dung Markdown raw — luôn là phiên bản hiện tại (mới nhất). */
  @Prop({ required: true, default: '' })
  content: string;

  // ── Status & Flags ────────────────────────────────────────────────────────
  @Prop({
    type: String,
    enum: Object.values(DocumentStatus),
    default: DocumentStatus.DRAFT,
    index: true,
  })
  status: DocumentStatus;

  @Prop({ default: false })
  isOutdated: boolean;

  // ── Ownership ─────────────────────────────────────────────────────────────
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  authorId: Types.ObjectId;

  /** Người chỉnh sửa lần cuối (có thể khác tác giả gốc). */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  // ── Organization ──────────────────────────────────────────────────────────
  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop([String])
  tags: string[];

  // ── Versioning ────────────────────────────────────────────────────────────
  /** Số version hiện tại — tăng dần mỗi khi save. Bắt đầu từ 1. */
  @Prop({ default: 1 })
  currentVersion: number;

  // ── Analytics ─────────────────────────────────────────────────────────────
  @Prop({ default: 0 })
  viewCount: number;

  @Prop()
  publishedAt?: Date;

  // ── RAG / Vector Search ───────────────────────────────────────────────────
  /**
   * Vector embedding của nội dung tài liệu.
   * Được sinh ra async sau khi save (không block luồng CRUD).
   * Dùng cho MongoDB Atlas Vector Search để hỗ trợ AI semantic search (RAG).
   * Dimension phụ thuộc vào model embedding được dùng (VD: 768 cho nomic-embed-text).
   */
  @Prop({ type: [Number], select: false }) // select: false → không trả về mặc định
  embedding?: number[];

  /** Trạng thái embedding: pending | done | failed */
  @Prop({
    type: String,
    enum: ['pending', 'done', 'failed'],
    default: 'pending',
  })
  embeddingStatus: 'pending' | 'done' | 'failed';

  /** Thời điểm embedding được cập nhật lần cuối */
  @Prop()
  embeddingUpdatedAt?: Date;

  // timestamps: createdAt, updatedAt (do Mongoose tự sinh)
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentItem);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Text index để hỗ trợ MongoDB full-text search (fallback khi chưa có Atlas Search)
DocumentSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Compound index để query danh sách hiệu quả
DocumentSchema.index({ status: 1, createdAt: -1 });
DocumentSchema.index({ authorId: 1, status: 1 });