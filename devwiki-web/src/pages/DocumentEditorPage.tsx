import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import { createDocument, getDocumentById, updateDocument } from '../api/documents.api';
import { useAutoSave } from '../hooks/useAutoSave';
import type { Document } from '../types/document.types';
import './DocumentEditorPage.css';

// ── Tag Input component ───────────────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  function removeTag(t: string) {
    onChange(tags.filter((x) => x !== t));
  }

  return (
    <div className="tag-input" onClick={() => document.getElementById('tag-input-field')?.focus()}>
      {tags.map((t) => (
        <span key={t} className="tag-input__chip">
          {t}
          <button
            type="button"
            onClick={() => removeTag(t)}
            aria-label={`Xóa tag ${t}`}
          >×</button>
        </span>
      ))}
      <input
        id="tag-input-field"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input) addTag(input); }}
        placeholder={tags.length === 0 ? 'Thêm tag (Enter hoặc dấu phẩy)...' : ''}
        className="tag-input__field"
      />
    </div>
  );
}

// ── Auto-save status badge ────────────────────────────────────────────────────
function SaveStatusBadge({
  status,
  lastSavedAt,
  version,
}: {
  status: string;
  lastSavedAt: Date | null;
  version: number;
}) {
  function formatTime(d: Date) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className={`save-badge save-badge--${status}`} aria-live="polite">
      {status === 'saving' && (
        <>
          <span className="save-badge__spinner" />
          Đang lưu...
        </>
      )}
      {status === 'saved' && lastSavedAt && (
        <>✓ Đã lưu v{version} lúc {formatTime(lastSavedAt)}</>
      )}
      {status === 'error' && <>⚠ Lỗi lưu</>}
      {status === 'idle' && lastSavedAt && (
        <>v{version} · Đã lưu {formatTime(lastSavedAt)}</>
      )}
      {status === 'idle' && !lastSavedAt && <>Nháp chưa lưu</>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>(); // có id → edit mode; không → create mode
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // ── State ────────────────────────────────────────────────────────────────
  const [doc, setDoc]           = useState<Document | null>(null);
  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [tags, setTags]         = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]       = useState('');

  // docId chỉ có sau khi tạo lần đầu
  const docIdRef = useRef<string | null>(id ?? null);

  // ── Load document khi edit mode ──────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode || !id) return;
    getDocumentById(id)
      .then((d) => {
        setDoc(d);
        setTitle(d.title);
        setContent(d.content ?? '');
        setTags(d.tags ?? []);
        docIdRef.current = d._id;
      })
      .catch(() => setError('Không tìm thấy tài liệu hoặc bạn không có quyền chỉnh sửa.'))
      .finally(() => setIsLoading(false));
  }, [id, isEditMode]);

  // ── Auto-save logic ──────────────────────────────────────────────────────
  const handleAutoSave = useCallback(async () => {
    if (!title.trim()) return; // không save khi chưa có tiêu đề

    if (!docIdRef.current) {
      // Lần đầu save → CREATE
      const created = await createDocument({ title, content, tags });
      docIdRef.current = created._id;
      setDoc(created);
      // Cập nhật URL mà không reload page
      window.history.replaceState({}, '', `/documents/${created._id}/edit`);
    } else {
      // Các lần sau → UPDATE
      const updated = await updateDocument(docIdRef.current, {
        title,
        content,
        tags,
        changeSummary: 'Auto-save',
      });
      setDoc(updated);
    }
  }, [title, content, tags]);

  const { status: saveStatus, lastSavedAt, saveNow } = useAutoSave(
    { title, content, tags },
    {
      onSave: handleAutoSave,
      delay: 30_000,                   // auto-save mỗi 30s
      enabled: Boolean(title.trim()),  // chỉ auto-save khi có tiêu đề
    },
  );

  // ── Manual Save ──────────────────────────────────────────────────────────
  async function handleManualSave() {
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề trước khi lưu.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      if (!docIdRef.current) {
        const created = await createDocument({ title, content, tags, changeSummary: 'Tạo tài liệu' });
        docIdRef.current = created._id;
        setDoc(created);
        window.history.replaceState({}, '', `/documents/${created._id}/edit`);
      } else {
        const updated = await updateDocument(docIdRef.current, { title, content, tags });
        setDoc(updated);
      }
      saveNow(); // reset auto-save timer
    } catch {
      setError('Không thể lưu tài liệu. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── View document sau khi lưu ────────────────────────────────────────────
  function handleViewDoc() {
    if (doc?.slug) navigate(`/documents/${doc.slug}`);
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="editor-page editor-page--loading">
        <div className="editor-loading">
          <div className="editor-loading__spinner" />
          <p>Đang tải tài liệu...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && isEditMode && !doc) {
    return (
      <div className="editor-page editor-page--error">
        <div className="editor-error">
          <span>⚠️</span>
          <h2>{error}</h2>
          <Link to="/documents" className="btn btn--ghost">← Quay lại</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-page" data-color-mode="dark">
      {/* ── TOPBAR ────────────────────────────────────────────── */}
      <div className="editor-topbar">
        <div className="editor-topbar__left">
          <Link
            to={doc?.slug ? `/documents/${doc.slug}` : '/documents'}
            className="editor-topbar__back"
            id="editor-back-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {isEditMode ? 'Xem tài liệu' : 'Danh sách'}
          </Link>

          <SaveStatusBadge
            status={saveStatus}
            lastSavedAt={lastSavedAt}
            version={doc?.currentVersion ?? 1}
          />
        </div>

        <div className="editor-topbar__actions">
          {error && !isEditMode && (
            <span className="editor-topbar__error">{error}</span>
          )}

          <button
            id="save-doc-btn"
            className="btn btn--ghost btn--sm"
            onClick={handleManualSave}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? (
              <><span className="save-badge__spinner" /> Đang lưu...</>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Lưu
              </>
            )}
          </button>

          {doc?.slug && (
            <button
              id="view-doc-btn"
              className="btn btn--primary btn--sm"
              onClick={handleViewDoc}
            >
              Xem tài liệu →
            </button>
          )}
        </div>
      </div>

      {/* ── METADATA BAR ──────────────────────────────────────── */}
      <div className="editor-meta-bar">
        <input
          id="doc-title-input"
          className="editor-title-input"
          type="text"
          placeholder="Tiêu đề tài liệu..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
        <div className="editor-meta-bar__fields">
          <div className="editor-meta-field">
            <label className="editor-meta-label">Tags</label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
        </div>
      </div>

      {/* ── EDITOR SPLIT-VIEW ─────────────────────────────────── */}
      <div className="editor-body">
        <MDEditor
          id="md-editor"
          value={content}
          onChange={(v) => setContent(v ?? '')}
          height="100%"
          preview="live"
          visibleDragbar={false}
          data-color-mode="dark"
          textareaProps={{
            placeholder: `# Bắt đầu viết tài liệu của bạn...\n\nHỗ trợ đầy đủ Markdown:\n- **In đậm**, *in nghiêng*\n- \`code inline\`\n- Bảng, danh sách, blockquote\n\n\`\`\`bash\n# Ví dụ code block\ndocker compose up -d\n\`\`\``,
            id: 'md-textarea',
          }}
        />
      </div>
    </div>
  );
}
