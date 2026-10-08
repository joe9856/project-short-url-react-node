import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../backend/src/app";
describe("HTTP security before database access", () => {
  it("requires login", async () => {
    const result = await request(app).get("/api/links");
    expect(result.status).toBe(401);
    expect(result.headers["cache-control"]).toBe("no-store");
  });
  it.each([
    undefined,
    "https://attacker.example",
    "http://localhost:5173.attacker.example",
  ])("rejects unsafe Origin %s", async (origin) => {
    const call = request(app)
      .post("/api/links")
      .send({ originalUrl: "https://example.com" });
    if (origin) call.set("Origin", origin);
    expect((await call).status).toBe(403);
  });
  it("handles malformed JSON", async () => {
    const result = await request(app)
      .post("/api/auth/logout")
      .set("Origin", "http://localhost:5173")
      .set("Content-Type", "application/json")
      .send("{");
    expect(result.status).toBe(400);
  });
  it("rejects oversized body", async () => {
    const result = await request(app)
      .post("/api/auth/logout")
      .set("Origin", "http://localhost:5173")
      .send({ value: "x".repeat(45000) });
    expect(result.status).toBe(413);
  });
  it("returns structured 404", async () => {
    expect((await request(app).get("/unknown")).body.error.code).toBe(
      "NOT_FOUND",
    );
  });
});
