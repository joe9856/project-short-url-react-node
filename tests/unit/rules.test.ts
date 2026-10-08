import { describe, it, expect } from "vitest";
import {
  validUrl,
  createLinkSchema,
  updateLinkSchema,
  listSchema,
  registerSchema,
} from "../../backend/src/lib/validation";
import { bangkokDay, dateRange } from "../../backend/src/lib/date";
import { generateCode, linkStatus } from "../../backend/src/services/links";
import {
  referrerHost,
  deviceCategory,
} from "../../backend/src/services/redirect";
describe("URL validation", () => {
  it.each([
    "javascript:alert(1)",
    "ftp://example.com",
    "not a url",
    "https://user:pass@example.com",
  ])("rejects unsafe input %s", (value) => expect(validUrl(value)).toBe(false));
  it("preserves query, fragment and international URL", () => {
    const originalUrl = "https://example.com/path?q=ไทย#section";
    expect(createLinkSchema.parse({ originalUrl }).originalUrl).toBe(
      originalUrl,
    );
  });
  it("enforces length, aliases and immutable fields", () => {
    expect(
      createLinkSchema.safeParse({
        originalUrl: `https://example.com/${"a".repeat(8192)}`,
      }).success,
    ).toBe(false);
    for (const alias of ["ABCD", "ab", "with space", "a".repeat(33)])
      expect(
        createLinkSchema.safeParse({
          originalUrl: "https://example.com",
          alias,
        }).success,
      ).toBe(false);
    expect(
      updateLinkSchema.safeParse({ originalUrl: "https://example.com" })
        .success,
    ).toBe(false);
    expect(updateLinkSchema.safeParse({}).success).toBe(false);
    expect(updateLinkSchema.safeParse({ isActive: false }).success).toBe(true);
  });
  it("validates expiry, pagination and passwords", () => {
    expect(
      createLinkSchema.safeParse({
        originalUrl: "https://example.com",
        expiresAt: "2000-01-01T00:00:00Z",
      }).success,
    ).toBe(false);
    expect(listSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Test",
        email: "bad",
        password: "short",
      }).success,
    ).toBe(false);
  });
});
describe("Bangkok dates and status", () => {
  it("changes day exactly at 17:00 UTC", () => {
    expect(bangkokDay(new Date("2026-01-01T16:59:59Z"))).toBe("2026-01-01");
    expect(bangkokDay(new Date("2026-01-01T17:00:00Z"))).toBe("2026-01-02");
    expect(dateRange("2026-01-02", "2026-01-02").start.toISOString()).toBe(
      "2026-01-01T17:00:00.000Z",
    );
  });
  it.each([
    ["2026-02-30", "2026-03-01"],
    ["2026-01-02", "2026-01-01"],
    ["2020-01-01", "2026-01-01"],
  ])("rejects invalid range %s %s", (from, to) =>
    expect(() => dateRange(from, to)).toThrow(),
  );
  it("resolves disabled and expired links", () => {
    expect(linkStatus({ isActive: false, expiresAt: null })).toBe("disabled");
    expect(linkStatus({ isActive: true, expiresAt: new Date(0) })).toBe(
      "expired",
    );
    expect(linkStatus({ isActive: true, expiresAt: null })).toBe("active");
  });
});
describe("codes and privacy", () => {
  it("generates eight-character codes with secure alphabet", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const code = generateCode();
      expect(code).toMatch(/^[a-z0-9]{8}$/);
      codes.add(code);
    }
    expect(codes.size).toBe(1000);
  });
  it("stores hostname without paths, credentials or query", () => {
    expect(
      referrerHost("https://user:secret@news.example/path?private=yes"),
    ).toBe("news.example");
    expect(referrerHost("bad url")).toBeNull();
    expect(referrerHost("ftp://example.com")).toBeNull();
  });
  it("classifies devices without storing user agents", () => {
    expect(deviceCategory()).toBe("unknown");
    expect(
      deviceCategory(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe("desktop");
    expect(
      deviceCategory(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("mobile");
  });
});
