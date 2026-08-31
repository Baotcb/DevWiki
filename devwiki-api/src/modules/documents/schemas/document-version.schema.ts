import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export type DocumentVersionDocument = DocumentVersion & MongooseDocument;

@Schema({
  // Chỉ lưu createdAt, không cần updatedAt vì version là immutable
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'document_versions',
})
export class DocumentVersion {
  /** ID của tài liệu cha */
  @Prop({ type: Types.ObjectId, ref: 'DocumentItem', required: true, index: true })
  documentId: Types.ObjectId;

  /** Toàn bộ nội dung Markdown tại thời điểm version này được tạo. */
  @Prop({ required: true })
  content: string;

  /** Số thứ tự version — tăng dần, không bao giờ reset hay xóa. */
  @Prop({ required: true })
  versionNumber: number;

  /** Mô tả ngắn về thay đổi. VD: "Fix lỗi cài đặt", "Khôi phục từ v3" */
  @Prop({ default: '' })
  changeSummary: string;

  /** Người tạo version này (có thể khác authorId của document). */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  // createdAt từ timestamps
}

export const DocumentVersionSchema = SchemaFactory.createForClass(DocumentVersion);

// Compound index: query nhanh tất cả versions của một document, mới nhất trước
DocumentVersionSchema.index({ documentId: 1, versionNumber: -1 });
