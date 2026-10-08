import type { Request, Response } from "express";
import { config } from "../lib/config.js";
import { registerSchema, loginSchema } from "../lib/validation.js";
import * as auth from "../services/auth.js";
export const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
export async function register(req: Request, res: Response) {
  const result = await auth.register(registerSchema.parse(req.body));
  res.cookie(auth.sessionCookie, result.session.token, {
    ...cookieOptions,
    maxAge: auth.sessionTtl,
  });
  res.status(201).json({ user: result.user });
}
export async function login(req: Request, res: Response) {
  const result = await auth.login(loginSchema.parse(req.body));
  res.cookie(auth.sessionCookie, result.session.token, {
    ...cookieOptions,
    maxAge: auth.sessionTtl,
  });
  res.json({ user: result.user });
}
export async function logout(req: Request, res: Response) {
  await auth.logout(req.cookies[auth.sessionCookie]);
  res.clearCookie(auth.sessionCookie, cookieOptions);
  res.status(204).end();
}
export function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
