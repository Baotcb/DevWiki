import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DocumentsService } from './documents.service';
import { DocumentItem } from './schemas/document.schema';
import { DocumentVersion } from './schemas/document-version.schema';

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    // Mock Mongoose models — unit test không kết nối MongoDB thật
    const mockDocumentModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn(),
    };

    const mockVersionModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getModelToken(DocumentItem.name), useValue: mockDocumentModel },
        { provide: getModelToken(DocumentVersion.name), useValue: mockVersionModel },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
