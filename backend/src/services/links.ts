import { randomInt } from "node:crypto";
import { Prisma, type Link } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { config } from "../lib/config.js";
import { AppError } from "../lib/errors.js";
import {
  type CreateLinkInput,
  type UpdateLinkInput,
  listSchema,
} from "../lib/validation.js";
const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
export function generateCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += alphabet[randomInt(alphabet.length)];
  return code;
}
export function linkStatus(link: Pick<Link, "isActive" | "expiresAt">) {
  if (!link.isActive) return "disabled";
  if (link.expiresAt && link.expiresAt <= new Date()) return "expired";
  return "active";
}
export function linkInfo(link: Link & { _count?: { clickEvents: number } }) {
  return {
    id: link.id,
    originalUrl: link.originalUrl,
    code: link.code,
    shortUrl: `${config.APP_URL}/s/${link.code}`,
    isActive: link.isActive,
    expiresAt: link.expiresAt?.toISOString() || null,
    createdAt: link.createdAt.toISOString(),
    clicks: link._count?.clickEvents || 0,
    status: linkStatus(link),
  };
}
export async function createLink(userId: string, input: CreateLinkInput) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const link = await prisma.link.create({
        data: {
          userId,
          originalUrl: input.originalUrl,
          code: input.alias || generateCode(),
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        },
      });
      return linkInfo(link);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        if (input.alias)
          throw new AppError(409, "ALIAS_EXISTS", "ชื่อลิงก์นี้ถูกใช้แล้ว");
        continue;
      }
      throw error;
    }
  }
  throw new AppError(503, "CODE_EXHAUSTED", "สร้างรหัสไม่ได้ กรุณาลองใหม่");
}
export async function ownedLink(userId: string, id: string) {
  const link = await prisma.link.findFirst({
    where: { id, userId },
    include: { _count: { select: { clickEvents: true } } },
  });
  if (!link) throw new AppError(404, "LINK_NOT_FOUND", "ไม่พบลิงก์");
  return link;
}
export async function listLinks(userId: string, query: unknown) {
  const { q, status, page, limit } = listSchema.parse(query);
  const now = new Date();
  const where: Prisma.LinkWhereInput = { userId };
  if (q)
    where.OR = [{ code: { contains: q } }, { originalUrl: { contains: q } }];
  if (status === "disabled") where.isActive = false;
  if (status === "expired") {
    where.isActive = true;
    where.expiresAt = { lte: now };
  }
  if (status === "active") {
    where.isActive = true;
    where.AND = [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }];
  }
  const [total, links] = await prisma.$transaction([
    prisma.link.count({ where }),
    prisma.link.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { clickEvents: true } } },
    }),
  ]);
  return {
    links: links.map(linkInfo),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
export async function updateLink(
  userId: string,
  id: string,
  input: UpdateLinkInput,
) {
  await ownedLink(userId, id);
  await prisma.link.update({
    where: { id },
    data: {
      isActive: input.isActive,
      expiresAt:
        input.expiresAt === undefined
          ? undefined
          : input.expiresAt === null
            ? null
            : new Date(input.expiresAt),
    },
  });
  return linkInfo(await ownedLink(userId, id));
}
