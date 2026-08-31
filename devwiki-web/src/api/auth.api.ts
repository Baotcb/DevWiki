import api from '../lib/api';
import type { AuthResponse, User } from '../types/auth.types';

// Đăng ký tài khoản mới
export async function register(payload: {
  email: string;
  fullName: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<{ message: string; data: AuthResponse }>('/auth/register', payload);
  return data.data;
}

// Đăng nhập
export async function login(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<{ message: string; data: AuthResponse }>('/auth/login', payload);
  return data.data;
}

// Đăng xuất (revoke refresh tokens)
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

// Lấy thông tin user hiện tại
export async function getMe(): Promise<User> {
  const { data } = await api.get<{ data: User }>('/auth/me');
  return data.data;
}
