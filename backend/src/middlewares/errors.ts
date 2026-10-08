import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  res.setHeader("Cache-Control", "no-store");
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues)
      fields[issue.path.join(".") || "form"] = issue.message;
    res
      .status(400)
      .json({
        error: {
          code: "VALIDATION_ERROR",
          message: "กรุณาตรวจสอบข้อมูล",
          fields,
        },
      });
    return;
  }
  if (error instanceof AppError) {
    res
      .status(error.status)
      .json({
        error: {
          code: error.code,
          message: error.message,
          fields: error.fields,
        },
      });
    return;
  }
  if (error instanceof SyntaxError && "body" in error) {
    res
      .status(400)
      .json({
        error: { code: "INVALID_JSON", message: "รูปแบบ JSON ไม่ถูกต้อง" },
      });
    return;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.too.large"
  ) {
    res
      .status(413)
      .json({
        error: { code: "BODY_TOO_LARGE", message: "ข้อมูลมีขนาดใหญ่เกินไป" },
      });
    return;
  }
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P1001", "P1002", "P1017", "P2024", "P2028"].includes(error.code))
  ) {
    res
      .status(503)
      .json({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "ฐานข้อมูลไม่พร้อม กรุณาลองใหม่ภายหลัง",
        },
      });
    return;
  }
  // ไม่ส่ง stack trace, SQL หรือข้อมูลการเชื่อมต่อกลับไปยัง browser
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  res
    .status(500)
    .json({
      error: { code: "INTERNAL_ERROR", message: "ระบบขัดข้อง กรุณาลองใหม่" },
    });
}
