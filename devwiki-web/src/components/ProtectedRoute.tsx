import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

/**
 * Bọc các route cần đăng nhập.
 * Nếu chưa đăng nhập → redirect về /login.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * Bọc các route chỉ dành cho người chưa đăng nhập (login, register).
 * Nếu đã đăng nhập → redirect về trang chủ.
 */
export function GuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
