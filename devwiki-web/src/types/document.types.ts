import type { User } from './auth.types';

// ── Enums ────────────────────────────────────────────────────────────────────
export type DocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type EmbeddingStatus = 'pending' | 'done' | 'failed';

// ── Document author (populated từ DB) ────────────────────────────────────────
export type DocumentAuthor = Pick<User, 'id' | 'fullName' | 'avatarUrl'>;

// ── Document đầy đủ (dùng ở detail page) ─────────────────────────────────────
export interface Document {
  _id: string;
  title: string;
  slug: string;
  content: string;
  status: DocumentStatus;
  isOutdated: boolean;
  authorId: DocumentAuthor;
  updatedBy?: DocumentAuthor;
  categoryId?: string;
  tags: string[];
  currentVersion: number;
  viewCount: number;
  publishedAt?: string;
  embeddingStatus: EmbeddingStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Document summary (dùng ở list — không có content) ────────────────────────
export type DocumentSummary = Omit<Document, 'content'>;

// ── Document Version ──────────────────────────────────────────────────────────
export interface DocumentVersion {
  _id: string;
  documentId: string;
  content: string;
  versionNumber: number;
  changeSummary: string;
  createdBy: DocumentAuthor;
  createdAt: string;
}

// ── Danh sách versions (không có content) ────────────────────────────────────
export type DocumentVersionSummary = Omit<DocumentVersion, 'content'>;

// ── API Response formats ───────────────────────────────────────────────────────
export interface DocumentListResponse {
  items: DocumentSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Query params ──────────────────────────────────────────────────────────────
export interface DocumentQuery {
  page?: number;
  limit?: number;
  status?: DocumentStatus;
  authorId?: string;
  tag?: string;
  sort?: 'updatedAt_desc' | 'createdAt_desc' | 'viewCount_desc' | 'title_asc';
  isOutdated?: boolean;
}

// ── Create/Update payloads ────────────────────────────────────────────────────
export interface CreateDocumentPayload {
  title: string;
  content?: string;
  tags?: string[];
  categoryId?: string;
  changeSummary?: string;
}

export interface UpdateDocumentPayload {
  title?: string;
  content?: string;
  tags?: string[];
  categoryId?: string;
  changeSummary?: string;
}
