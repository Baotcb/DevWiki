import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getDocumentBySlug,
  getDocumentVersions,
  getDocumentVersion,
  deleteDocument,
  markOutdated,
  restoreDocumentVersion,
  deleteDocumentAttachment,
  downloadDocumentAttachment,
} from '../api/documents.api';
import { useAuthStore } from '../store/auth.store';
import type { Document, DocumentVersionSummary, DocumentVersion } from '../types/document.types';
import MarkdownPreview from '../components/MarkdownPreview';
import DiffViewer from '../components/DiffViewer';
import './DocumentDetailPage.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Version History Panel (Phase 4) ──────────────────────────────────────────
function VersionHistoryPanel({
  docId,
  currentVersion,
  userRole,
  onClose,
  onRestored,
}: {
  docId: string;
  currentVersion: number;
  userRole?: string;
  onClose: () => void;
  onRestored: (doc: Document) => void;
}) {
  const [versions, setVersions] = useState<DocumentVersionSummary[]>([]);
  const [selected, setSelected] = useState<DocumentVersion | null>(null);
  const [prevVersion, setPrevVersion] = useState<DocumentVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'diff'>('preview');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');

  const canRestore = userRole === 'EDITOR' || userRole === 'ADMIN';

  useEffect(() => {
    getDocumentVersions(docId)
      .then(setVersions)
      .finally(() => setLoading(false));
  }, [docId]);

  async function handleSelectVersion(vNum: number) {
    if (selected?.versionNumber === vNum) {
      setSelected(null);
      setPrevVersion(null);
      return;
    }
    setLoadingVersion(true);
    try {
      const [v, prev] = await Promise.all([
        getDocumentVersion(docId, vNum),
        vNum > 1
          ? getDocumentVersion(docId, vNum - 1).catch(() => null)
          : Promise.resolve(null),
      ]);
      setSelected(v);
      setPrevVersion(prev);
      setActiveTab('preview');
    } finally {
      setLoadingVersion(false);
    }
  }

  async function handleRestore(vNum: number) {
    if (!window.confirm(
      `Khôi phục về phiên bản v${vNum}?\n\nHành động này sẽ tạo phiên bản mới với nội dung từ v${vNum}.\nLịch sử hiện tại sẽ được giữ nguyên.`
    )) return;

    setIsRestoring(true);
    setRestoreMsg('');
    try {
      const updated = await restoreDocumentVersion(docId, vNum);
      onRestored(updated);
      setRestoreMsg(`✓ Đã khôi phục thành v${updated.currentVersion}`);
      const newVersions = await getDocumentVersions(docId);
      setVersions(newVersions);
      setSelected(null);
    } catch {
      setRestoreMsg('⚠ Không thể khôi phục. Bạn cần quyền Editor trở lên.');
    } finally {
      setIsRestoring(false);
    }
  }

  const diffOld = prevVersion?.content ?? '';
  const diffNew = selected?.content ?? '';

  return (
    <div className="version-panel" role="dialog" aria-label="Lịch sử phiên bản">
      <div className="version-panel__header">
        <h3>Lịch sử phiên bản</h3>
        <button className="version-panel__close" onClick={onClose} aria-label="Đóng">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {restoreMsg && (
        <div className={`version-panel__msg ${restoreMsg.startsWith('✓') ? 'version-panel__msg--ok' : 'version-panel__msg--err'}`}>
          {restoreMsg}
        </div>
      )}

      <div className="version-panel__body">
        {loading ? (
          <div className="version-panel__loading">Đang tải...</div>
        ) : versions.length === 0 ? (
          <div className="version-panel__loading">Chưa có phiên bản nào.</div>
        ) : (
          <div className="version-timeline">
            {versions.map((v) => {
              const isCurrent = v.versionNumber === currentVersion;
              const isSelected = selected?.versionNumber === v.versionNumber;
              const author = typeof v.createdBy === 'object' ? v.createdBy : null;

              return (
                <div
                  key={v._id}
                  className={`version-item ${isCurrent ? 'version-item--current' : ''} ${isSelected ? 'version-item--selected' : ''}`}
                >
                  <div className="version-item__dot" />
                  <div className="version-item__content">
                    {/* Header row */}
                    <div className="version-item__header">
                      <div className="version-item__info">
                        <span className="version-item__num">v{v.versionNumber}</span>
                        {isCurrent && <span className="version-item__current-badge">Hiện tại</span>}
                        {v.changeSummary && (
                          <span className="version-item__summary" title={v.changeSummary}>
                            {v.changeSummary}
                          </span>
                        )}
                      </div>
                      <div className="version-item__actions">
                        <button
                          className="version-item__btn"
                          onClick={() => handleSelectVersion(v.versionNumber)}
                          id={`version-view-btn-${v.versionNumber}`}
                        >
                          {isSelected ? 'Ẩn' : 'Xem'}
                        </button>
                        {!isCurrent && canRestore && (
                          <button
                            className="version-item__btn version-item__btn--restore"
                            onClick={() => handleRestore(v.versionNumber)}
                            disabled={isRestoring}
                            id={`version-restore-btn-${v.versionNumber}`}
                            title="Khôi phục về phiên bản này"
                          >
                            {isRestoring ? '...' : '↩'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="version-item__meta">
                      <span>{author?.fullName ?? 'Ẩn danh'}</span>
                      <span>·</span>
                      <span title={formatDate(v.createdAt)}>{relativeTime(v.createdAt)}</span>
                    </div>

                    {/* Expanded: Preview / Diff tabs */}
                    {isSelected && (
                      <div className="version-item__expanded">
                        {loadingVersion ? (
                          <div className="version-panel__loading">Đang tải...</div>
                        ) : (
                          <>
                            <div className="version-tabs">
                              <button
                                className={`version-tab ${activeTab === 'preview' ? 'version-tab--active' : ''}`}
                                onClick={() => setActiveTab('preview')}
                                id={`tab-preview-v${v.versionNumber}`}
                              >
                                Nội dung
                              </button>
                              <button
                                className={`version-tab ${activeTab === 'diff' ? 'version-tab--active' : ''}`}
                                onClick={() => setActiveTab('diff')}
                                id={`tab-diff-v${v.versionNumber}`}
                              >
                                {v.versionNumber > 1
                                  ? `Diff v${v.versionNumber - 1}→v${v.versionNumber}`
                                  : 'Diff (khởi tạo)'}
                              </button>
                            </div>

                            {activeTab === 'preview' ? (
                              <div className="version-item__preview">
                                <MarkdownPreview content={selected?.content ?? ''} compact />
                              </div>
                            ) : (
                              <div className="version-item__diff">
                                <DiffViewer
                                  oldContent={diffOld}
                                  newContent={diffNew}
                                  oldLabel={v.versionNumber > 1 ? `v${v.versionNumber - 1}` : '(rỗng)'}
                                  newLabel={`v${v.versionNumber}`}
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DocumentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [doc, setDoc] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    getDocumentBySlug(slug)
      .then(setDoc)
      .catch(() => setError('Không tìm thấy tài liệu hoặc bạn không có quyền truy cập.'))
      .finally(() => setIsLoading(false));
  }, [slug]);

  const canEdit = user && doc && (
    user.id === (typeof doc.authorId === 'object' ? (doc.authorId as { id: string }).id : doc.authorId)
    || user.role === 'EDITOR'
    || user.role === 'ADMIN'
  );

  async function handleMarkOutdated() {
    if (!doc) return;
    try { const updated = await markOutdated(doc._id); setDoc(updated); } catch { /* ignore */ }
  }

  async function handleDelete() {
    if (!doc) return;
    if (!window.confirm(`Xóa tài liệu "${doc.title}"? Hành động này không thể hoàn tác.`)) return;
    setIsDeleting(true);
    try {
      await deleteDocument(doc._id);
      navigate('/documents', { replace: true });
    } catch { setIsDeleting(false); }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!doc) return;
    if (!window.confirm('Xóa file đính kèm này?')) return;
    try {
      const updated = await deleteDocumentAttachment(doc._id, attachmentId);
      setDoc(updated);
    } catch { /* ignore */ }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="detail-page detail-page--loading">
        <div className="detail-skeleton">
          <div className="sk sk--title" style={{ height: 48, borderRadius: 8, marginBottom: 12 }} />
          <div className="sk sk--author" style={{ height: 18, width: '40%', marginBottom: 24 }} />
          <div className="sk sk--body" style={{ height: 400, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !doc) {
    return (
      <div className="detail-page detail-page--error">
        <div className="detail-error">
          <span>⚠️</span>
          <h2>{error || 'Không tìm thấy tài liệu'}</h2>
          <Link to="/documents" className="btn btn--ghost">← Quay lại danh sách</Link>
        </div>
      </div>
    );
  }

  const author = typeof doc.authorId === 'object' ? doc.authorId : null;

  return (
    <div className="detail-page">
      {/* ── Topbar ────────────────────────────────────────────── */}
      <div className="detail-topbar">
        <Link to="/documents" className="detail-topbar__back" id="back-to-list-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Danh sách
        </Link>

        <div className="detail-topbar__actions">
          {!doc.isOutdated && (
            <button className="btn btn--ghost btn--sm" onClick={handleMarkOutdated}
              id="mark-outdated-btn" title="Đánh dấu tài liệu này đã lỗi thời">
              ⚠ Outdated
            </button>
          )}

          <button
            className={`btn btn--ghost btn--sm ${showVersions ? 'btn--active' : ''}`}
            onClick={() => setShowVersions((v) => !v)}
            id="show-versions-btn"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            v{doc.currentVersion} · Lịch sử
          </button>

          {canEdit && (
            <>
              <Link to={`/documents/${doc._id}/edit`} className="btn btn--ghost btn--sm" id="edit-doc-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Chỉnh sửa
              </Link>
              <button className="btn btn--danger btn--sm" onClick={handleDelete}
                disabled={isDeleting} id="delete-doc-btn">
                {isDeleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`detail-content ${showVersions ? 'detail-content--with-panel' : ''}`}>
        {/* ── Article ──────────────────────────────────────────── */}
        <article className="detail-article">
          {doc.isOutdated && (
            <div className="outdated-banner" role="alert">
              <span>⚠️</span>
              <div>
                <strong>Tài liệu này có thể đã lỗi thời.</strong>
                {' '}Nội dung chưa được cập nhật. Kiểm tra và xác nhận trước khi áp dụng.
              </div>
            </div>
          )}

          <header className="detail-header">
            <div className="detail-header__top">
              <div className="detail-header__tags">
                {doc.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
              <div className={`status-dot status-dot--${doc.status.toLowerCase()}`}
                title={doc.status === 'PUBLISHED' ? 'Đã đăng' : doc.status === 'DRAFT' ? 'Nháp' : doc.status === 'IN_REVIEW' ? 'Chờ duyệt' : 'Lưu trữ'} />
            </div>

            <h1 className="detail-header__title">{doc.title}</h1>

            <div className="detail-header__meta">
              <div className="detail-header__author">
                <div className="avatar avatar--sm">
                  {(author as { fullName?: string } | null)?.fullName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <span className="detail-header__author-name">
                    {(author as { fullName?: string } | null)?.fullName ?? 'Ẩn danh'}
                  </span>
                  <span className="detail-header__date">
                    &nbsp;· Tạo {relativeTime(doc.createdAt)}
                    {doc.updatedAt !== doc.createdAt && ` · Cập nhật ${relativeTime(doc.updatedAt)}`}
                  </span>
                </div>
              </div>
              <div className="detail-header__stats">
                <span className="stat-chip">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {doc.viewCount} lượt xem
                </span>
              </div>
            </div>
          </header>

          <hr className="detail-divider" />

          <div className="detail-body">
            {doc.content ? (
              <MarkdownPreview content={doc.content} />
            ) : (
              <div className="detail-empty-content">
                <p>Tài liệu này chưa có nội dung.</p>
                {canEdit && (
                  <Link to={`/documents/${doc._id}/edit`} className="btn btn--primary btn--sm">
                    Bắt đầu viết →
                  </Link>
                )}
              </div>
            )}
          </div>

          {doc.attachments?.length > 0 && (
            <section className="attachments-section" aria-label="File đính kèm">
              <h2 className="attachments-section__title">File đính kèm</h2>
              <div className="attachments-list">
                {doc.attachments.map((attachment) => (
                  <div key={attachment._id} className="attachment-row">
                    <span className="attachment-row__name" title={attachment.originalName}>{attachment.originalName}</span>
                    <span className="attachment-row__size">{Math.ceil(attachment.size / 1024)} KB</span>
                    <button className="btn btn--ghost btn--sm" onClick={() => downloadDocumentAttachment(doc._id, attachment)}>Tải xuống</button>
                    {canEdit && (
                      <button className="btn btn--danger btn--sm" onClick={() => handleDeleteAttachment(attachment._id)}>Xóa</button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* ── Version History Panel ─────────────────────────── */}
        {showVersions && (
          <VersionHistoryPanel
            docId={doc._id}
            currentVersion={doc.currentVersion}
            userRole={user?.role}
            onClose={() => setShowVersions(false)}
            onRestored={(updated) => setDoc(updated)}
          />
        )}
      </div>
    </div>
  );
}
