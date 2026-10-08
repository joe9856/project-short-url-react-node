import type { Request, Response, NextFunction } from "express";
import { config } from "../lib/config.js";
import { AppError } from "../lib/errors.js";
import { consumeLimit } from "../services/rate-limit.js";
export function originProtection(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  // ไม่เชื่อ Host หรือ X-Forwarded-Host ที่ผู้โจมตีส่งมา ใช้ APP_URL ที่ตั้งไว้เท่านั้น
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("origin") !== config.APP_URL
  ) {
    throw new AppError(403, "INVALID_ORIGIN", "ไม่อนุญาตคำขอจากเว็บไซต์นี้");
  }
  next();
}
export function rateLimit(scope: string, maximum: number, seconds: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identity = req.user?.id || req.ip || "unknown";
    const result = await consumeLimit(scope, identity, maximum, seconds);
    if (!result.allowed) {
      res.setHeader("Retry-After", result.retryAfter);
      throw new AppError(
        429,
        "RATE_LIMITED",
        "ส่งคำขอมากเกินไป กรุณารอสักครู่",
      );
    }
    next();
  };
}
