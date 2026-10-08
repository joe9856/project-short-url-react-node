import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { originProtection } from "./middlewares/security.js";
import { errorHandler } from "./middlewares/errors.js";
import { authRouter } from "./routes/auth.js";
import { linksRouter } from "./routes/links.js";
import { statsRouter } from "./routes/stats.js";
import { redirectRouter } from "./routes/redirect.js";
import { prisma } from "./lib/prisma.js";
import { AppError } from "./lib/errors.js";
export const app = express();
app.disable("x-powered-by");
// Vercel ยืนยัน IP ผ่าน proxy ชั้นเดียว; local ไม่เชื่อ X-Forwarded-For จาก client
if (process.env.VERCEL === "1") app.set("trust proxy", 1);
app.use(helmet());
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", originProtection);
app.use(express.json({ limit: "40kb" }));
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use("/api/links", linksRouter);
app.use("/api/stats", statsRouter);
app.use("/s", redirectRouter);
app.get("/healthz", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});
app.use(() => {
  throw new AppError(404, "NOT_FOUND", "ไม่พบเส้นทางนี้");
});
app.use(errorHandler);
export default app;
