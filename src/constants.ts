// ─── App Info ────────────────────────────────────────────────────────────────
export const APP_NAME = "Team Manager";
export const APP_VERSION = "0.1.0";

// ─── Cookie names ─────────────────────────────────────────────────────────────
export const CSRF_COOKIE = "tm_csrf";
export const ACCESS_COOKIE = "tm_token";
export const REFRESH_COOKIE = "tm_refresh";

// ─── Token expiry ─────────────────────────────────────────────────────────────
export const ACCESS_TOKEN_EXPIRY = "15m";
export const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes in seconds
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// ─── Rate limiting ────────────────────────────────────────────────────────────
export const RATE_LIMIT_LOGIN_MAX = 10; // Max login attempts per window
export const RATE_LIMIT_MAX = 300; // Max API requests per window
export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

// ─── UI / UX ─────────────────────────────────────────────────────────────────
/** Polling interval for silent data refresh (ms) */
export const POLL_INTERVAL_MS = 30_000; // 30 seconds

/** Debounce delay for search inputs (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Default page size for list views */
export const PAGE_SIZE = 8;

/** Max activity logs kept in UI */
export const MAX_LOGS_DISPLAY = 100;

/** Session idle timeout (ms) — 30 minutes */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Password requirements message */
export const PASSWORD_HINT =
  "Tối thiểu 8 ký tự, 1 chữ hoa, 1 số, 1 ký tự đặc biệt";

// ─── Messages ─────────────────────────────────────────────────────────────────
export const MESSAGES = {
  loginSuccess: "Đăng nhập thành công",
  loginFailed: "Email hoặc mật khẩu không đúng",
  logoutSuccess: "Đã đăng xuất",
  createSuccess: "Tạo thành công",
  updateSuccess: "Cập nhật thành công",
  deleteSuccess: "Xóa thành công",
  acceptTask: "Đã nhận task",
  rejectTask: "Đã gửi yêu cầu từ chối",
  progressUpdated: "Cập nhật tiến độ thành công",
  unauthorized: "Phiên đăng nhập hết hạn",
  forbidden: "Không có quyền thực hiện",
  rateLimited: "Quá nhiều yêu cầu, vui lòng thử lại sau",
  csrfInvalid: "Yêu cầu không hợp lệ (CSRF)",
  sessionExpired: "Phiên làm việc đã hết hạn do không hoạt động",
} as const;

