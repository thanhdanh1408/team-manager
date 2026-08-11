/**
 * Lightweight error/event logger.
 * Console in all envs; optionally posts to Sentry if SENTRY_DSN is set.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

function format(entry: LogEntry): string {
  const meta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : "";
  return `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}${meta}`;
}

async function sendToSentry(entry: LogEntry) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || entry.level === "info") return;
  // Stub: real Sentry SDK can replace this. We log the intent without hard dependency.
  try {
    // No-op placeholder — install @sentry/nextjs and wire here for production
    if (process.env.NODE_ENV === "development") {
      // avoid noise
    }
  } catch {
    // ignore
  }
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: "info",
      message,
      meta,
      timestamp: new Date().toISOString(),
    };
    console.info(format(entry));
  },

  warn(message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: "warn",
      message,
      meta,
      timestamp: new Date().toISOString(),
    };
    console.warn(format(entry));
    void sendToSentry(entry);
  },

  error(message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: "error",
      message,
      meta,
      timestamp: new Date().toISOString(),
    };
    console.error(format(entry));
    void sendToSentry(entry);
  },
};
