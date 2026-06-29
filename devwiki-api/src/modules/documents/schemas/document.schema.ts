import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument } from 'mongoose';

// Định nghĩa kiểu dữ liệu kết hợp giữa class của ta và Document của Mongoose
export type DocumentDocument = DocumentItem & MongooseDocument;

@Schema({
    timestamps: true, // Tự động quản lý createdAt và updatedAt
    collection: 'documents' // Map chính xác vào collection bạn đã tạo trên Compass
})
export class DocumentItem {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    content: string;

    @Prop([String]) // Mảng các chuỗi
    tags: string[];

    // Tạm thời để authorId là string, sau này khi làm Auth sẽ đổi thành ObjectId liên kết tới collection users
    @Prop({ required: true })
    authorId: string;
}

// Khởi tạo Schema từ class
export const DocumentSchema = SchemaFactory.createForClass(DocumentItem);