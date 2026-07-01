import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentItem, DocumentSchema } from './schemas/document.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentItem.name, schema: DocumentSchema }
    ])
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService]
})
export class DocumentsModule { }
