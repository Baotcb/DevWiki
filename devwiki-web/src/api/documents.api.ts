import api from '../lib/api';
import type {
  Document,
  DocumentListResponse,
  DocumentQuery,
  DocumentVersion,
  DocumentVersionSummary,
  CreateDocumentPayload,
  UpdateDocumentPayload,
  DocumentAttachment,
} from '../types/document.types';

// ── Danh sách tài liệu (có filter, pagination) ────────────────────────────────
export async function getDocuments(query: DocumentQuery = {}): Promise<DocumentListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  if (query.authorId) params.set('authorId', query.authorId);
  if (query.tag) params.set('tag', query.tag);
  if (query.sort) params.set('sort', query.sort);
  if (query.isOutdated !== undefined) params.set('isOutdated', String(query.isOutdated));

  const { data } = await api.get<{ data: DocumentListResponse }>(`/documents?${params}`);
  return data.data;
}

// ── Chi tiết theo slug (dùng ở detail page) ───────────────────────────────────
export async function getDocumentBySlug(slug: string): Promise<Document> {
  const { data } = await api.get<{ data: Document }>(`/documents/by-slug/${slug}`);
  return data.data;
}

// ── Chi tiết theo ID (dùng ở editor) ─────────────────────────────────────────
export async function getDocumentById(id: string): Promise<Document> {
  const { data } = await api.get<{ data: Document }>(`/documents/${id}`);
  return data.data;
}

// ── Tạo mới ──────────────────────────────────────────────────────────────────
export async function createDocument(payload: CreateDocumentPayload): Promise<Document> {
  const { data } = await api.post<{ message: string; data: Document }>('/documents', payload);
  return data.data;
}

// ── Cập nhật (tạo version snapshot tự động) ───────────────────────────────────
export async function updateDocument(id: string, payload: UpdateDocumentPayload): Promise<Document> {
  const { data } = await api.patch<{ message: string; data: Document }>(`/documents/${id}`, payload);
  return data.data;
}

export async function uploadDocumentAttachment(id: string, file: File): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<{ message: string; data: Document }>(
    `/documents/${id}/attachments`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

export async function deleteDocumentAttachment(id: string, attachmentId: string): Promise<Document> {
  const { data } = await api.delete<{ message: string; data: Document }>(
    `/documents/${id}/attachments/${attachmentId}`,
  );
  return data.data;
}

export async function downloadDocumentAttachment(
  id: string,
  attachment: DocumentAttachment,
): Promise<void> {
  const { data } = await api.get<Blob>(`/documents/${id}/attachments/${attachment._id}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = attachment.originalName;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Publish ───────────────────────────────────────────────────────────────────
export async function publishDocument(id: string): Promise<Document> {
  const { data } = await api.patch<{ message: string; data: Document }>(`/documents/${id}/publish`);
  return data.data;
}

// ── Đánh dấu lỗi thời ────────────────────────────────────────────────────────
export async function markOutdated(id: string): Promise<Document> {
  const { data } = await api.patch<{ message: string; data: Document }>(`/documents/${id}/mark-outdated`);
  return data.data;
}

// ── Xóa mềm ──────────────────────────────────────────────────────────────────
export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

// ── Version History (danh sách — không có content) ────────────────────────────
export async function getDocumentVersions(id: string): Promise<DocumentVersionSummary[]> {
  const { data } = await api.get<{ data: DocumentVersionSummary[] }>(`/documents/${id}/versions`);
  return data.data;
}

// ── Nội dung một version cụ thể ───────────────────────────────────────────────
export async function getDocumentVersion(id: string, versionNumber: number): Promise<DocumentVersion> {
  const { data } = await api.get<{ data: DocumentVersion }>(`/documents/${id}/versions/${versionNumber}`);
  return data.data;
}

// ── Khôi phục version (Editor+) ───────────────────────────────────────────────
export async function restoreDocumentVersion(id: string, versionNumber: number): Promise<Document> {
  const { data } = await api.post<{ message: string; data: Document }>(
    `/documents/${id}/versions/${versionNumber}/restore`,
  );
  return data.data;
}
