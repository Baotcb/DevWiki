import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export type RefreshTokenDocument = RefreshToken & MongooseDocument;

@Schema({ timestamps: true, collection: 'refresh_tokens' })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  // Lưu hash của token thay vì raw token để bảo mật
  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;

  // createdAt từ timestamps
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Index tự động xóa document hết hạn
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
