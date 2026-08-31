import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import './AuthPage.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Vui lòng nhập họ tên.';
    if (!email.trim()) errs.email = 'Vui lòng nhập email.';
    if (password.length < 6) errs.password = 'Mật khẩu tối thiểu 6 ký tự.';
    if (password !== confirmPassword) errs.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    try {
      await register(email, fullName, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr.response?.data?.message;
      if (Array.isArray(msg)) setError(msg[0]);
      else setError(msg ?? 'Đăng ký thất bại. Vui lòng thử lại.');
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
              <rect width="40" height="40" rx="10" fill="url(#brand-grad-reg)" />
              <path d="M10 28L16 12L22 24L26 18L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="brand-grad-reg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7c3aed" />
                  <stop offset="1" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
            <span>DevWiki</span>
          </div>
          <h1 className="auth-brand__headline">
            Tham gia cùng<br />
            <span className="auth-brand__highlight">team của bạn.</span>
          </h1>
          <p className="auth-brand__sub">
            Tạo tài khoản để bắt đầu đóng góp kiến thức cho team. Mọi tài liệu bạn viết đều trở thành di sản kỹ thuật của team.
          </p>
          <div className="auth-brand__features">
            {[
              { icon: '📝', text: 'Viết tài liệu Markdown với live preview' },
              { icon: '🔍', text: 'Tìm kiếm full-text siêu nhanh' },
              { icon: '🔄', text: 'Version history — không mất nội dung' },
              { icon: '🤝', text: 'Review & comment cùng team' },
            ].map((f) => (
              <div key={f.icon} className="feature-item">
                <span className="feature-item__icon">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card__header">
            <h2>Tạo tài khoản</h2>
            <p>Điền thông tin để bắt đầu sử dụng DevWiki</p>
          </div>

          {error && (
            <div className="auth-alert auth-alert--error" role="alert">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5zM8 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
              </svg>
              {error}
            </div>
          )}

          <form id="register-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="reg-fullname" className="form-label">Họ và tên</label>
              <input
                id="reg-fullname"
                type="text"
                className={`form-input ${fieldErrors.fullName ? 'form-input--error' : ''}`}
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, fullName: '' })); }}
                autoComplete="name"
                autoFocus
              />
              {fieldErrors.fullName && <span className="form-error">{fieldErrors.fullName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">Email</label>
              <input
                id="reg-email"
                type="email"
                className={`form-input ${fieldErrors.email ? 'form-input--error' : ''}`}
                placeholder="email@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })); }}
                autoComplete="email"
              />
              {fieldErrors.email && <span className="form-error">{fieldErrors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">Mật khẩu</label>
              <div className="form-input-wrapper">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input form-input--has-suffix ${fieldErrors.password ? 'form-input--error' : ''}`}
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })); }}
                  autoComplete="new-password"
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
              {fieldErrors.password && <span className="form-error">{fieldErrors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm-password" className="form-label">Xác nhận mật khẩu</label>
              <input
                id="reg-confirm-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${fieldErrors.confirmPassword ? 'form-input--error' : ''}`}
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirmPassword: '' })); }}
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword && <span className="form-error">{fieldErrors.confirmPassword}</span>}
            </div>

            <button
              id="register-submit-btn"
              type="submit"
              className="btn btn--primary btn--full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="btn__spinner" aria-hidden="true" />
                  Đang tạo tài khoản...
                </>
              ) : 'Tạo tài khoản'}
            </button>
          </form>

          <p className="auth-card__footer">
            Đã có tài khoản?{' '}
            <Link to="/login" id="go-to-login-link">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
