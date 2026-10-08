import type { Request, Response } from "express";
import { resolveRedirect } from "../services/redirect.js";
export async function redirect(req: Request, res: Response) {
  const destination = await resolveRedirect(
    String(req.params.code),
    req.method === "GET",
    req.get("referer"),
    req.get("user-agent"),
  );
  res.setHeader("Cache-Control", "no-store");
  // Header ต้องเป็น ASCII; URL serializer encode ภาษาไทยโดยคงความหมาย query/fragment
  res.setHeader("Location", new URL(destination).href);
  res.status(302).end();
}
