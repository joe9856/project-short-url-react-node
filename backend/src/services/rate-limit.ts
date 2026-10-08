import { createHmac } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { config } from "../lib/config.js";
export async function consumeLimit(
  scope: string,
  identity: string,
  maximum: number,
  windowSeconds: number,
) {
  const key = createHmac("sha256", config.RATE_LIMIT_SECRET)
    .update(`${scope}:${identity}`)
    .digest("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + windowSeconds * 1000);
  // UPSERT + row lock ใน transaction ทำให้หลาย request ไม่อ่านและเขียนทับยอดกัน
  const row = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`INSERT INTO rate_limits (\`key\`, count, expires_at) VALUES (${key}, 1, ${expires})
      ON DUPLICATE KEY UPDATE count = IF(expires_at <= ${now}, 1, count + 1), expires_at = IF(expires_at <= ${now}, ${expires}, expires_at)`;
      return tx.rateLimit.findUniqueOrThrow({ where: { key } });
    },
    { maxWait: 10000, timeout: 10000 },
  );
  return {
    allowed: row.count <= maximum,
    retryAfter: Math.max(
      1,
      Math.ceil((row.expiresAt.getTime() - now.getTime()) / 1000),
    ),
  };
}
