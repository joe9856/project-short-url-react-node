import { it, expect, vi, afterEach } from "vitest";
import { Prisma } from "@prisma/client";
import request from "supertest";
import { app } from "../../backend/src/app";
import { prisma } from "../../backend/src/lib/prisma";
afterEach(() => vi.restoreAllMocks());
const outage = new Prisma.PrismaClientInitializationError(
  "Cannot connect",
  "6.19.3",
  "P1001",
);
it("health database outage returns 503 without credentials", async () => {
  vi.spyOn(prisma, "$queryRaw").mockRejectedValue(outage);
  const result = await request(app).get("/healthz");
  expect(result.status).toBe(503);
  expect(result.body.error.code).toBe("DATABASE_UNAVAILABLE");
  expect(JSON.stringify(result.body)).not.toContain("mysql://");
});
it("redirect cannot return 302 when recording fails", async () => {
  vi.spyOn(prisma.link, "findUnique").mockResolvedValue({
    id: "test-link",
    userId: "test-user",
    code: "abcdefgh",
    originalUrl: "https://example.com",
    isActive: true,
    expiresAt: null,
    createdAt: new Date(),
  });
  vi.spyOn(prisma.clickEvent, "create").mockRejectedValue(outage);
  const result = await request(app).get("/s/abcdefgh");
  expect(result.status).toBe(503);
  expect(result.headers.location).toBeUndefined();
  expect(result.headers["cache-control"]).toBe("no-store");
});
it("HEAD needs no event insert even when the insert would fail", async () => {
  vi.spyOn(prisma.link, "findUnique").mockResolvedValue({
    id: "test-link",
    userId: "test-user",
    code: "abcdefgh",
    originalUrl: "https://example.com",
    isActive: true,
    expiresAt: null,
    createdAt: new Date(),
  });
  const insert = vi
    .spyOn(prisma.clickEvent, "create")
    .mockRejectedValue(outage);
  const result = await request(app).head("/s/abcdefgh");
  expect(result.status).toBe(302);
  expect(result.headers.location).toBe("https://example.com/");
  expect(insert).not.toHaveBeenCalled();
});
