import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument } from 'mongoose';

export type UserDocument = User & MongooseDocument;

export enum UserRole {
  MEMBER = 'MEMBER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop()
  avatarUrl?: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.MEMBER,
  })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  // timestamps: createdAt, updatedAt (tự sinh bởi Mongoose)
}

export const UserSchema = SchemaFactory.createForClass(User);
