import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { app } from "../../backend/src/app";
import { prisma } from "../../backend/src/lib/prisma";
import { consumeLimit } from "../../backend/src/services/rate-limit";
import { sessionCookie, tokenHash } from "../../backend/src/services/auth";
const origin = "http://localhost:5173";
const email = `integration-${randomUUID()}@example.com`;
const password = "IntegrationPassword123!";
const alice = request.agent(app);
const bob = request.agent(app);
let id = "";
let code = "";
let ownerId = "";
beforeAll(async () => {
  if (
    new URL(process.env.DATABASE_URL!).pathname !== "/short_url_react_node_test"
  )
    throw new Error("Refusing to modify a non-test database");
  await prisma.rateLimit.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});
describe("real MySQL API flow", () => {
  it("health and registration with hashed password and session", async () => {
    expect((await request(app).get("/healthz")).status).toBe(200);
    const result = await alice
      .post("/api/auth/register")
      .set("Origin", origin)
      .send({ name: "Alice", email, password });
    expect(result.status).toBe(201);
    ownerId = result.body.user.id;
    const cookie = result.headers["set-cookie"][0];
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(result.body.user.passwordHash).toBeUndefined();
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
    });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toBe(password);
    const token = cookie.split(";")[0].split("=")[1];
    expect(
      await prisma.session.findUnique({
        where: { tokenHash: tokenHash(token) },
      }),
    ).not.toBeNull();
    expect(
      await prisma.session.findUnique({ where: { tokenHash: token } }),
    ).toBeNull();
    expect((await alice.get("/api/auth/me")).body.user.email).toBe(email);
    expect(
      (
        await request(app)
          .post("/api/auth/register")
          .set("Origin", origin)
          .send({ name: "Again", email, password })
      ).status,
    ).toBe(409);
  });
  it("rejects invalid credentials and fake/forged sessions", async () => {
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .set("Origin", origin)
          .send({ email, password: "WrongPassword123" })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .get("/api/auth/me")
          .set("Cookie", `${sessionCookie}=fake`)
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .get("/api/auth/me")
          .set("Cookie", `${sessionCookie}=${"f".repeat(64)}`)
      ).status,
    ).toBe(401);
  });
  it("creates exact destination, alias and expiry; validates immutable data", async () => {
    const originalUrl =
      "https://example.com/path?q=%E0%B9%84%E0%B8%97%E0%B8%A2#section";
    const result = await alice
      .post("/api/links")
      .set("Origin", origin)
      .send({
        originalUrl,
        alias: `test-${randomUUID().slice(0, 8)}`,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
    expect(result.status).toBe(201);
    id = result.body.link.id;
    code = result.body.link.code;
    expect(result.body.link.originalUrl).toBe(originalUrl);
    expect(result.body.link.shortUrl).toBe(`${origin}/s/${code}`);
    expect(
      (
        await alice
          .patch(`/api/links/${id}`)
          .set("Origin", origin)
          .send({ originalUrl: "https://other.example" })
      ).status,
    ).toBe(400);
    for (const url of [
      "javascript:alert(1)",
      "https://user:pass@example.com",
      "invalid",
    ])
      expect(
        (
          await alice
            .post("/api/links")
            .set("Origin", origin)
            .send({ originalUrl: url })
        ).status,
      ).toBe(400);
  });
  it("redirects Unicode destinations and accepts the full character limit", async () => {
    const originalUrl = "https://example.com/ภาษาไทย?q=ทดสอบ#หัวข้อ";
    const result = await alice
      .post("/api/links")
      .set("Origin", origin)
      .send({ originalUrl });
    expect(result.status).toBe(201);
    expect(result.body.link.originalUrl).toBe(originalUrl);
    const redirected = await request(app).get(`/s/${result.body.link.code}`);
    expect(redirected.status).toBe(302);
    expect(redirected.headers.location).toBe(new URL(originalUrl).href);
    const longUrl =
      "https://example.com/" + "ก".repeat(8192 - "https://example.com/".length);
    const longResult = await alice
      .post("/api/links")
      .set("Origin", origin)
      .send({ originalUrl: longUrl });
    expect(longResult.status).toBe(201);
    expect(longResult.body.link.originalUrl).toBe(longUrl);
  });
  it("enforces ownership across details, QR, stats and updates", async () => {
    expect(
      (
        await bob
          .post("/api/auth/register")
          .set("Origin", origin)
          .send({
            name: "Bob",
            email: `bob-${randomUUID()}@example.com`,
            password,
          })
      ).status,
    ).toBe(201);
    for (const path of [
      `/api/links/${id}`,
      `/api/links/${id}/qr`,
      `/api/links/${id}/stats`,
    ])
      expect((await bob.get(path)).status).toBe(404);
    expect(
      (
        await bob
          .patch(`/api/links/${id}`)
          .set("Origin", origin)
          .send({ isActive: false })
      ).status,
    ).toBe(404);
    expect((await bob.get("/api/links")).body.pagination.total).toBe(0);
    expect((await bob.get("/api/stats")).body.summary.totalLinks).toBe(0);
    expect((await request(app).get(`/api/links/${id}/qr`)).status).toBe(401);
  });
  it("20 concurrent GETs insert exactly 20 events before redirect", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        request(app)
          .get(`/s/${code}`)
          .set("Referer", "https://source.example/private?q=secret")
          .set(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
          ),
      ),
    );
    for (const result of results) {
      expect(result.status).toBe(302);
      expect(result.headers.location).toBe(
        "https://example.com/path?q=%E0%B9%84%E0%B8%97%E0%B8%A2#section",
      );
      expect(result.headers["cache-control"]).toBe("no-store");
    }
    expect(await prisma.clickEvent.count({ where: { linkId: id } })).toBe(20);
    const event = await prisma.clickEvent.findFirstOrThrow({
      where: { linkId: id },
    });
    expect(event.referrerHost).toBe("source.example");
    expect(event.deviceType).toBe("desktop");
  });
  it("HEAD and QR do not count; QR decodes to short URL", async () => {
    const head = await request(app).head(`/s/${code}`);
    expect(head.status).toBe(302);
    expect(head.text).toBeUndefined();
    const png = await alice
      .get(`/api/links/${id}/qr?format=png&download=1`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    expect(png.status).toBe(200);
    expect(png.headers["content-disposition"]).toContain(".png");
    const image = PNG.sync.read(png.body);
    expect(
      jsQR(new Uint8ClampedArray(image.data), image.width, image.height)?.data,
    ).toBe(`${origin}/s/${code}`);
    const svg = await alice.get(`/api/links/${id}/qr?format=svg`);
    expect(svg.status).toBe(200);
    expect(svg.headers["content-type"]).toContain("image/svg+xml");
    expect(await prisma.clickEvent.count({ where: { linkId: id } })).toBe(20);
  });
  it("searches, filters, paginates and reports analytics", async () => {
    const list = await alice.get(
      `/api/links?q=${code}&status=active&limit=1&page=1`,
    );
    expect(list.body.links[0].id).toBe(id);
    expect(list.body.links[0].clicks).toBe(20);
    expect(list.body.pagination.total).toBe(1);
    expect((await alice.get("/api/links?page=0")).status).toBe(400);
    const stats = await alice.get(`/api/links/${id}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body.summary.totalClicks).toBe(20);
    expect(stats.body.daily).toHaveLength(30);
    expect(stats.body.sources[0]).toEqual({
      name: "source.example",
      clicks: 20,
    });
    expect(stats.body.devices[0].name).toBe("desktop");
    expect(
      (await alice.get("/api/stats?from=2026-02-30&to=2026-03-01")).status,
    ).toBe(400);
    await prisma.clickEvent.createMany({
      data: [
        {
          linkId: id,
          deviceType: "unknown",
          clickedAt: new Date("2026-01-01T16:59:59Z"),
        },
        {
          linkId: id,
          deviceType: "mobile",
          clickedAt: new Date("2026-01-01T17:00:00Z"),
        },
      ],
    });
    const boundary = await alice.get(
      `/api/links/${id}/stats?from=2026-01-01&to=2026-01-03`,
    );
    expect(boundary.body.daily).toEqual([
      { date: "2026-01-01", clicks: 1 },
      { date: "2026-01-02", clicks: 1 },
      { date: "2026-01-03", clicks: 0 },
    ]);
  });
  it("handles 20 simultaneous alias collisions using database uniqueness", async () => {
    const alias = `race-${randomUUID().slice(0, 8)}`;
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        alice
          .post("/api/links")
          .set("Origin", origin)
          .send({ originalUrl: "https://example.com", alias }),
      ),
    );
    expect(results.filter((result) => result.status === 201)).toHaveLength(1);
    expect(results.filter((result) => result.status === 409)).toHaveLength(19);
    expect(await prisma.link.count({ where: { code: alias } })).toBe(1);
  });
  it("disables, enables and expires links without changing destination", async () => {
    expect(
      (
        await alice
          .patch(`/api/links/${id}`)
          .set("Origin", origin)
          .send({ isActive: false })
      ).status,
    ).toBe(200);
    expect((await request(app).get(`/s/${code}`)).status).toBe(410);
    expect((await request(app).head(`/s/${code}`)).status).toBe(410);
    expect(
      (await alice.get("/api/links?status=disabled")).body.links.some(
        (link: { id: string }) => link.id === id,
      ),
    ).toBe(true);
    expect(
      (
        await alice
          .patch(`/api/links/${id}`)
          .set("Origin", origin)
          .send({ isActive: true, expiresAt: null })
      ).status,
    ).toBe(200);
    await prisma.link.update({
      where: { id },
      data: { expiresAt: new Date(0) },
    });
    expect((await request(app).get(`/s/${code}`)).status).toBe(410);
    expect((await request(app).get("/s/not-found-123")).status).toBe(404);
    expect(
      (await alice.get("/api/links?status=expired")).body.links[0].id,
    ).toBe(id);
  });
  it("atomic rate limits admit only five of twenty concurrent requests", async () => {
    const identity = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 20 }, () => consumeLimit("test", identity, 5, 60)),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    await prisma.rateLimit.updateMany({ data: { expiresAt: new Date(0) } });
    expect((await consumeLimit("test", identity, 5, 60)).allowed).toBe(true);
  });
  it("HTTP login throttling returns 429 and Retry-After", async () => {
    await prisma.rateLimit.deleteMany();
    let last;
    for (let i = 0; i < 21; i++)
      last = await request(app)
        .post("/api/auth/login")
        .set("Origin", origin)
        .send({ email, password: "WrongPassword123" });
    expect(last!.status).toBe(429);
    expect(Number(last!.headers["retry-after"])).toBeGreaterThan(0);
  });
  it("expired sessions fail and logout revokes tokens", async () => {
    await prisma.rateLimit.deleteMany();
    await prisma.session.updateMany({
      where: { userId: ownerId },
      data: { expiresAt: new Date(0) },
    });
    expect((await alice.get("/api/auth/me")).status).toBe(401);
    const login = await alice
      .post("/api/auth/login")
      .set("Origin", origin)
      .send({ email, password });
    expect(login.status).toBe(200);
    const cookie = login.headers["set-cookie"][0].split(";")[0];
    expect(
      (await alice.post("/api/auth/logout").set("Origin", origin)).status,
    ).toBe(204);
    expect(
      (await request(app).get("/api/auth/me").set("Cookie", cookie)).status,
    ).toBe(401);
    expect((await alice.get("/api/links")).status).toBe(401);
  });
});
