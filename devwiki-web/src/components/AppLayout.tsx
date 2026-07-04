import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import './AppLayout.css';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  EDITOR: 'Biên tập viên',
  MEMBER: 'Thành viên',
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: '#f59e0b',
  EDITOR: '#22c55e',
  MEMBER: '#7c3aed',
};

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const initial = user?.fullName?.[0]?.toUpperCase() ?? '?';
  const role = user?.role ?? 'MEMBER';

  return (
    <div className="app-layout">
      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <NavLink to="/" className="sidebar__brand-link">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="url(#layout-grad)" />
              <path d="M10 28L16 12L22 24L26 18L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="layout-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7c3aed" />
                  <stop offset="1" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
            <span>DevWiki</span>
          </NavLink>
        </div>

        <nav className="sidebar__nav">
          <div className="sidebar__nav-section">
            <span className="sidebar__nav-label">Tổng quan</span>
            <NavLink to="/" end className="sidebar__nav-item" id="nav-home">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
              </svg>
              Trang chủ
            </NavLink>
          </div>

          <div className="sidebar__nav-section">
            <span className="sidebar__nav-label">Tài liệu</span>
            <NavLink to="/documents" className="sidebar__nav-item" id="nav-all-docs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Tất cả tài liệu
            </NavLink>
            <NavLink to="/documents?authorId=me" className="sidebar__nav-item" id="nav-my-docs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="7" r="4" />
                <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
              </svg>
              Của tôi
            </NavLink>
            <NavLink to="/documents/new" className="sidebar__nav-item sidebar__nav-item--create" id="nav-new-doc">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tạo mới
            </NavLink>
          </div>
        </nav>

        {/* ── User info + logout ─────────────────────────────── */}
        <div className="sidebar__user">
          <div
            className="user-avatar"
            style={{ '--avatar-color': ROLE_COLOR[role] } as React.CSSProperties}
          >
            {initial}
          </div>
          <div className="user-info">
            <span className="user-info__name">{user?.fullName}</span>
            <span className="user-info__role" style={{ color: ROLE_COLOR[role] }}>
              {ROLE_LABEL[role]}
            </span>
          </div>
          <button
            id="logout-btn"
            className="logout-btn"
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT (children inject here) ─────────────── */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
