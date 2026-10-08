import { it, expect, vi, afterEach } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "../../backend/src/lib/prisma";
import { createLink } from "../../backend/src/services/links";
afterEach(() => vi.restoreAllMocks());
const collision = new Prisma.PrismaClientKnownRequestError("collision", {
  code: "P2002",
  clientVersion: "6.19.3",
});
it("retries generated codes after a database collision", async () => {
  const spy = vi
    .spyOn(prisma.link, "create")
    .mockRejectedValueOnce(collision)
    .mockResolvedValue({
      id: "id",
      userId: "user",
      originalUrl: "https://example.com",
      code: "abcdefgh",
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
    });
  expect(
    (await createLink("user", { originalUrl: "https://example.com" })).code,
  ).toBe("abcdefgh");
  expect(spy).toHaveBeenCalledTimes(2);
});
it("stops after five generated-code collisions", async () => {
  const spy = vi.spyOn(prisma.link, "create").mockRejectedValue(collision);
  await expect(
    createLink("user", { originalUrl: "https://example.com" }),
  ).rejects.toMatchObject({ status: 503 });
  expect(spy).toHaveBeenCalledTimes(5);
});
