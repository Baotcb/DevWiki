/**
 * Payload được mã hóa bên trong JWT access token.
 * Dùng để định danh user trong mỗi request.
 */
export interface JwtPayload {
  /** MongoDB ObjectId của user (dạng string) */
  sub: string;
  /** Email của user */
  email: string;
  /** Role: MEMBER | EDITOR | ADMIN */
  role: 'MEMBER' | 'EDITOR' | 'ADMIN';
}
