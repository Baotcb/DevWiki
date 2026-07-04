import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import './AuthPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr.response?.data?.message;
      if (Array.isArray(msg)) setError(msg[0]);
      else setError(msg ?? 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  }

  return (
    <div className="auth-layout">
      {/* Left Panel — Branding */}
      <div className="auth-brand" aria-hidden="true">
        <div className="auth-brand__glow" />
        <div className="auth-brand__content">
          <div className="auth-brand__logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="url(#brand-grad)" />
              <path d="M10 28L16 12L22 24L26 18L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="brand-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7c3aed" />
                  <stop offset="1" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
            <span>DevWiki</span>
          </div>
          <h1 className="auth-brand__headline">
            Kiến thức team,<br />
            <span className="auth-brand__highlight">một nơi duy nhất.</span>
          </h1>
          <p className="auth-brand__sub">
            Ghi lại, tìm kiếm và chia sẻ mọi kiến thức kỹ thuật — từ cấu hình Docker đến quyết định kiến trúc — không để mất bất kỳ điều gì.
          </p>
          <div className="auth-brand__stats">
            <div className="stat">
              <span className="stat__number">∞</span>
              <span className="stat__label">Tài liệu</span>
            </div>
            <div className="stat__divider" />
            <div className="stat">
              <span className="stat__number">7+</span>
              <span className="stat__label">Thành viên</span>
            </div>
            <div className="stat__divider" />
            <div className="stat">
              <span className="stat__number">0</span>
              <span className="stat__label">Kiến thức mất</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card__header">
            <h2>Chào mừng trở lại</h2>
            <p>Đăng nhập để tiếp tục với DevWiki</p>
          </div>

          {error && (
            <div className="auth-alert auth-alert--error" role="alert">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5zM8 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
              </svg>
              {error}
            </div>
          )}

          <form id="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">Email</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="login-password" className="form-label">Mật khẩu</label>
              </div>
              <div className="form-input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input form-input--has-suffix"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="form-input__suffix-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn--primary btn--full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="btn__spinner" aria-hidden="true" />
                  Đang đăng nhập...
                </>
              ) : 'Đăng nhập'}
            </button>
          </form>

          <p className="auth-card__footer">
            Chưa có tài khoản?{' '}
            <Link to="/register" id="go-to-register-link">Đăng ký ngay</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
