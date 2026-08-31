import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/auth.types';
import * as authApi from '../api/auth.api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, fullName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // ─── LOGIN ────────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const result = await authApi.login({ email, password });
          localStorage.setItem('access_token', result.accessToken);
          localStorage.setItem('refresh_token', result.refreshToken);
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isAuthenticated: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // ─── REGISTER ─────────────────────────────────────────────
      register: async (email, fullName, password) => {
        set({ isLoading: true });
        try {
          const result = await authApi.register({ email, fullName, password });
          localStorage.setItem('access_token', result.accessToken);
          localStorage.setItem('refresh_token', result.refreshToken);
          set({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isAuthenticated: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // ─── LOGOUT ───────────────────────────────────────────────
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Bỏ qua lỗi logout từ server, vẫn xóa local state
        } finally {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      },

      // ─── HYDRATE (khởi động app, check token còn hợp lệ) ─────
      hydrate: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const { user } = get();
        // Nếu đã có user trong persisted state thì không cần gọi lại
        if (user) {
          set({ isAuthenticated: true });
          return;
        }

        try {
          const me = await authApi.getMe();
          set({ user: me, isAuthenticated: true });
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'devwiki-auth', // key trong localStorage
      // Chỉ persist user và token, không persist isLoading
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
