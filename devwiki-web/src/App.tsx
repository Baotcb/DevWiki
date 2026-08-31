import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/auth.store';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import DocumentEditorPage from './pages/DocumentEditorPage';

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Guest routes (chưa login) ─────────────────────── */}
        <Route element={<GuestRoute />}>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* ── Protected routes (cần login) — dùng AppLayout ─── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Dashboard */}
            <Route path="/"           element={<DashboardPage />} />
            {/* Documents */}
            <Route path="/documents"           element={<DocumentsPage />} />
            <Route path="/documents/new"       element={<DocumentEditorPage />} />
            <Route path="/documents/:slug"     element={<DocumentDetailPage />} />
            <Route path="/documents/:id/edit"  element={<DocumentEditorPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
