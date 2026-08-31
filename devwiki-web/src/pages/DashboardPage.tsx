import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import './DashboardPage.css';

const ROLE_COLOR: Record<string, string> = {
  ADMIN: '#f59e0b',
  EDITOR: '#22c55e',
  MEMBER: '#7c3aed',
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'MEMBER';

  return (
    <div className="dashboard-home">
      <div className="dashboard-home__header">
        <h1>Chào mừng, {user?.fullName?.split(' ').pop()}! 👋</h1>
        <p>Hệ thống tri thức nội bộ của team đang chờ bạn khám phá</p>
      </div>

      {/* Quick actions */}
      <div className="dashboard-actions">
        <Link to="/documents" className="action-card" id="action-view-docs">
          <div className="action-card__icon">📄</div>
          <div className="action-card__body">
            <h3>Tất cả tài liệu</h3>
            <p>Duyệt qua toàn bộ kho tri thức của team</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        <Link to="/documents/new" className="action-card action-card--primary" id="action-create-doc">
          <div className="action-card__icon">✍️</div>
          <div className="action-card__body">
            <h3>Tạo tài liệu mới</h3>
            <p>Đóng góp kiến thức cho team ngay hôm nay</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      {/* Auth info card */}
      <div className="auth-success-card">
        <div className="auth-success-card__badge">✅ Đã đăng nhập</div>
        <div className="auth-success-card__info">
          <div className="info-row">
            <span className="info-row__label">User ID</span>
            <code className="info-row__value">{user?.id}</code>
          </div>
          <div className="info-row">
            <span className="info-row__label">Email</span>
            <code className="info-row__value">{user?.email}</code>
          </div>
          <div className="info-row">
            <span className="info-row__label">Role</span>
            <code className="info-row__value" style={{ color: ROLE_COLOR[role] }}>{role}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
