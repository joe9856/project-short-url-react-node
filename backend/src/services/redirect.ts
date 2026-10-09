import UAParser from "ua-parser-js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { linkStatus } from "./links.js";
export function referrerHost(referrer?: string): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (["http:", "https:"].includes(url.protocol))
      return url.hostname.slice(0, 253);
  } catch {
    return null;
  }
  return null;
}
export function deviceCategory(agent?: string): string {
  if (!agent) return "unknown";
  const device = new UAParser(agent.slice(0, 2048)).getDevice().type;
  if (device === "mobile" || device === "tablet") return device;
  if (!device) return "desktop";
  return "unknown";
}
export async function resolveRedirect(
  code: string,
  countClick: boolean,
  referrer?: string,
  agent?: string,
) {
  if (!/^[a-z0-9-]{3,32}$/.test(code))
    throw new AppError(404, "LINK_NOT_FOUND", "ไม่พบลิงก์");
  const link = await prisma.link.findUnique({ where: { code } });
  if (!link) throw new AppError(404, "LINK_NOT_FOUND", "ไม่พบลิงก์");
  if (linkStatus(link) !== "active")
    throw new AppError(410, "LINK_UNAVAILABLE", "ลิงก์ถูกปิดหรือหมดอายุแล้ว");
  // URL/code แก้ไม่ได้และไม่มี hard delete จึงไม่ต้องถือ connection ใน interactive transaction
  // แต่ละ GET await event ที่ commit แล้วก่อน 302; หาก insert ล้มเหลวจะไม่ส่งต่อ
  if (countClick)
    await prisma.clickEvent.create({
      data: {
        linkId: link.id,
        referrerHost: referrerHost(referrer),
        deviceType: deviceCategory(agent),
      },
    });
  return link.originalUrl;
}
