import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

describe('DocumentsController', () => {
  let controller: DocumentsController;

  beforeEach(async () => {
    // Mock DocumentsService — controller chỉ cần biết interface
    const mockDocumentsService = {
      findAll: jest.fn(),
      create: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      publish: jest.fn(),
      markOutdated: jest.fn(),
      remove: jest.fn(),
      getVersions: jest.fn(),
      getVersion: jest.fn(),
      restoreVersion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: DocumentsService, useValue: mockDocumentsService },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
