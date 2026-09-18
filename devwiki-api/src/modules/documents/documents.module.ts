import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentItem, DocumentSchema } from './schemas/document.schema';
import { DocumentVersion, DocumentVersionSchema } from './schemas/document-version.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    MongooseModule.forFeature([
      { name: DocumentItem.name, schema: DocumentSchema },
      { name: DocumentVersion.name, schema: DocumentVersionSchema },
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  // Export service để SearchModule và EmbeddingModule có thể dùng
  exports: [DocumentsService],
})
export class DocumentsModule { }
