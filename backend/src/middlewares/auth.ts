import type { Request, Response, NextFunction } from "express";
import { currentUser, sessionCookie } from "../services/auth.js";
import { AppError } from "../lib/errors.js";
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = req.cookies[sessionCookie];
  const user = await currentUser(typeof token === "string" ? token : undefined);
  if (!user) throw new AppError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบ");
  req.user = user;
  next();
}
