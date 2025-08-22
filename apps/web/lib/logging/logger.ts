// lib/logging/logger.ts
export const logger = {
  info: (...a: any[]) => console.log("[INFO]", ...a),
  warn: (...a: any[]) => console.warn("[WARN]", ...a),
  error: (...a: any[]) => console.error("[ERROR]", ...a),
  debug: (...a: any[]) => process.env.NODE_ENV !== "production" && console.debug("[DEBUG]", ...a),
};
