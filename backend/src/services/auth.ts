import { randomBytes, createHash } from "node:crypto";
import argon2 from "argon2";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
const hashOptions = {
  type: argon2.argon2id as 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};
const dummyHash = argon2.hash(randomBytes(32), hashOptions);
export const sessionCookie = "short_session";
export const sessionTtl = 7 * 86400000;
export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export async function newSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionTtl);
  // เก็บ hash เท่านั้น หากฐานข้อมูลรั่วจะใช้ token hash ล็อกอินไม่ได้
  await prisma.session.create({
    data: { tokenHash: tokenHash(token), userId, expiresAt },
  });
  return { token, expiresAt };
}
export async function register(input: {
  name: string;
  email: string;
  password: string;
}) {
  const passwordHash = await argon2.hash(input.password, hashOptions);
  try {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + sessionTtl);
    // สร้างผู้ใช้และ session พร้อมกัน หากขั้นตอนใดล้มเหลวให้ rollback ทั้งคู่
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: input.name, email: input.email, passwordHash },
        select: { id: true, name: true, email: true },
      });
      await tx.session.create({
        data: { tokenHash: tokenHash(token), userId: user.id, expiresAt },
      });
      return { user, session: { token, expiresAt } };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new AppError(409, "EMAIL_EXISTS", "อีเมลนี้มีบัญชีแล้ว");
    throw error;
  }
}
export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const matches = await argon2.verify(
    user?.passwordHash || (await dummyHash),
    input.password,
  );
  if (!user || !matches)
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    );
  return {
    user: { id: user.id, name: user.name, email: user.email },
    session: await newSession(user.id),
  };
}
export async function currentUser(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}
export async function logout(token?: string) {
  if (token && /^[a-f0-9]{64}$/.test(token))
    await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
}
