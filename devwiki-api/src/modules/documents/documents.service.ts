import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentItem, DocumentDocument } from './schemas/document.schema';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
    constructor(
        // Inject Mongoose Model để thao tác với collection 'documents'
        @InjectModel(DocumentItem.name)
        private readonly documentModel: Model<DocumentDocument>,
    ) { }

    async create(createDocumentDto: CreateDocumentDto): Promise<DocumentDocument> {
        const newDocument = new this.documentModel(createDocumentDto);
        return newDocument.save();
    }
}
