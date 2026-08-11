// Cookie names
export const CSRF_COOKIE = "csrf_token";
export const SESSION_COOKIE = "session_id";
export const REFRESH_COOKIE = "refresh_token";
export const ACCESS_COOKIE = "access_token";

// Token expiry
export const ACCESS_TOKEN_EXPIRY = "15m";
export const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes in seconds
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// Rate limiting
export const RATE_LIMIT_LOGIN_MAX = 5; // Max login attempts
export const RATE_LIMIT_MAX = 100; // Max requests per window
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Messages
export const MESSAGES = {
  UNAUTHORIZED: "Vui lòng đăng nhập",
  FORBIDDEN: "Bạn không có quyền truy cập",
  NOT_FOUND: "Không tìm thấy",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng",
  RATE_LIMIT_EXCEEDED: "Quá nhiều yêu cầu, vui lòng thử lại sau",
  SERVER_ERROR: "Lỗi hệ thống",
  rateLimited: "Quá nhiều yêu cầu, vui lòng thử lại sau",
  loginFailed: "Email hoặc mật khẩu không đúng",
  csrfInvalid: "Token CSRF không hợp lệ",
};
