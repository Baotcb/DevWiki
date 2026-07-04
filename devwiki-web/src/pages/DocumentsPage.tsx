import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getDocuments } from '../api/documents.api';
import { useAuthStore } from '../store/auth.store';
import type { DocumentSummary, DocumentStatus } from '../types/document.types';
import './DocumentsPage.css';

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
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

const STATUS_LABEL: Record<DocumentStatus, string> = {
  DRAFT: 'Nháp',
  IN_REVIEW: 'Chờ duyệt',
  PUBLISHED: 'Đã đăng',
  ARCHIVED: 'Lưu trữ',
};

// ── Document Card ─────────────────────────────────────────────────────────────
function DocumentCard({ doc }: { doc: DocumentSummary }) {
  const author = typeof doc.authorId === 'object' ? doc.authorId : null;

  return (
    <Link
      to={`/documents/${doc.slug}`}
      className={`doc-card ${doc.isOutdated ? 'doc-card--outdated' : ''}`}
      id={`doc-card-${doc._id}`}
    >
      {/* Top row: title + status badge */}
      <div className="doc-card__header">
        <h3 className="doc-card__title">{doc.title}</h3>
        <span className={`status-dot status-dot--${doc.status.toLowerCase()}`}
          title={STATUS_LABEL[doc.status]} />
      </div>

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div className="doc-card__tags">
          {doc.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
          {doc.tags.length > 4 && (
            <span className="tag tag--more">+{doc.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Bottom: author + stats */}
      <div className="doc-card__footer">
        <div className="doc-card__author">
          <div className="avatar avatar--xs">
            {author?.fullName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="doc-card__author-name">
            {author?.fullName ?? 'Ẩn danh'}
          </span>
        </div>

        <div className="doc-card__stats">
          {doc.isOutdated && (
            <span className="outdated-chip">⚠ outdated</span>
          )}
          <span className="stat-chip">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {doc.viewCount}
          </span>
          <span className="stat-chip">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {relativeTime(doc.updatedAt)}
          </span>
          <span className="stat-chip stat-chip--version">v{doc.currentVersion}</span>
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="doc-card doc-card--skeleton" aria-hidden="true">
      <div className="doc-card__header">
        <div className="sk sk--title" />
        <div className="sk sk--dot" />
      </div>
      <div className="doc-card__tags">
        <div className="sk sk--tag" />
        <div className="sk sk--tag" style={{ width: 52 }} />
      </div>
      <div className="doc-card__footer">
        <div className="sk sk--author" />
        <div className="sk sk--stats" />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const statusFilter = (searchParams.get('status') ?? '') as DocumentStatus | '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const isMyDocs = searchParams.get('filter') === 'mine';

  function setStatus(s: DocumentStatus | '') {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('page');
      if (s) next.set('status', s); else next.delete('status');
      return next;
    });
  }

  function setFilter(f: 'all' | 'mine') {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('page');
      if (f === 'mine') next.set('filter', 'mine'); else next.delete('filter');
      return next;
    });
  }

  function setPage(p: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    });
  }

  const loadDocs = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const query: Parameters<typeof getDocuments>[0] = {
        page,
        limit: 12,
        sort: 'updatedAt_desc',
      };
      if (statusFilter) query.status = statusFilter;
      if (isMyDocs && user) query.authorId = user.id;

      const result = await getDocuments(query);
      setDocs(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Không thể kết nối tới server. Kiểm tra API đang chạy.');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, isMyDocs, user]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // Client-side search filter
  const filtered = search.trim()
    ? docs.filter(
        (d) =>
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
      )
    : docs;

  return (
    <div className="docs-page">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="docs-page__header">
        <div className="docs-page__header-left">
          <h1 className="docs-page__title">Tài liệu</h1>
          <p className="docs-page__subtitle">
            {isLoading ? 'Đang tải...' : `${total} tài liệu`}
          </p>
        </div>
        <Link to="/documents/new" className="btn btn--primary" id="create-doc-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tạo tài liệu
        </Link>
      </div>

      {/* ── Toolbar: Search + Filters ─────────────────────────── */}
      <div className="docs-page__toolbar">
        {/* Search */}
        <div className="search-box">
          <svg className="search-box__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="docs-search-input"
            className="search-box__input"
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-box__clear" onClick={() => setSearch('')} aria-label="Xóa">×</button>
          )}
        </div>

        {/* Owner filter */}
        <div className="toggle-group">
          <button
            id="filter-all-btn"
            className={`toggle-btn ${!isMyDocs ? 'toggle-btn--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả
          </button>
          <button
            id="filter-mine-btn"
            className={`toggle-btn ${isMyDocs ? 'toggle-btn--active' : ''}`}
            onClick={() => setFilter('mine')}
          >
            Của tôi
          </button>
        </div>

        {/* Status filter */}
        <div className="status-pills">
          {([
            ['', 'Tất cả'],
            ['PUBLISHED', 'Đã đăng'],
            ['DRAFT', 'Nháp'],
            ['IN_REVIEW', 'Chờ duyệt'],
          ] as [DocumentStatus | '', string][]).map(([val, label]) => (
            <button
              key={val}
              id={`status-pill-${val || 'all'}`}
              className={`status-pill ${statusFilter === val ? 'status-pill--active' : ''}`}
              onClick={() => setStatus(val)}
            >
              {val && <span className={`status-dot status-dot--${val.toLowerCase()}`} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────── */}
      {error && (
        <div className="docs-page__error">
          <span>⚠ {error}</span>
          <button onClick={loadDocs}>Thử lại</button>
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="docs-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">{search ? '🔍' : '📄'}</div>
          <h3>{search ? `Không tìm thấy "${search}"` : 'Chưa có tài liệu nào'}</h3>
          <p>
            {search ? (
              <><button className="link-btn" onClick={() => setSearch('')}>Xóa tìm kiếm</button> hoặc </>
            ) : null}
            <Link to="/documents/new">Tạo tài liệu đầu tiên →</Link>
          </p>
        </div>
      ) : (
        <>
          {search && (
            <p className="docs-page__search-result">
              {filtered.length} kết quả cho "<strong>{search}</strong>"
            </p>
          )}
          <div className="docs-grid">
            {filtered.map((doc) => <DocumentCard key={doc._id} doc={doc} />)}
          </div>
        </>
      )}

      {/* ── Pagination ────────────────────────────────────────── */}
      {!isLoading && totalPages > 1 && !search && (
        <div className="pagination">
          <button
            className="pagination__btn"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            id="pagination-prev"
          >← Trước</button>
          <span className="pagination__info">Trang {page} / {totalPages}</span>
          <button
            className="pagination__btn"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            id="pagination-next"
          >Tiếp →</button>
        </div>
      )}
    </div>
  );
}
