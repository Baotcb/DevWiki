// Kiểu dữ liệu user trả về từ API
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'MEMBER' | 'EDITOR' | 'ADMIN';
  avatarUrl: string | null;
}

// Kiểu dữ liệu auth response (login / register)
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Kiểu lỗi từ API (NestJS format)
export interface ApiError {
  message: string | string[];
  statusCode?: number;
}
