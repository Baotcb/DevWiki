import axios from 'axios';

// Tạo Axios instance với base URL trỏ tới NestJS API
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── REQUEST INTERCEPTOR ─────────────────────────────────────────────────────
// Tự động đính kèm access token vào mọi request (nếu có)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── RESPONSE INTERCEPTOR ────────────────────────────────────────────────────
// Xử lý 401: tự động thử refresh token, nếu fail thì logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu 401 và chưa thử refresh (tránh vòng lặp vô hạn)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post('http://localhost:3000/api/auth/refresh', {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken;
        const newRefreshToken = data.data.refreshToken;

        localStorage.setItem('access_token', newAccessToken);
        localStorage.setItem('refresh_token', newRefreshToken);

        // Retry request gốc với token mới
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh cũng fail → xóa token và redirect login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
