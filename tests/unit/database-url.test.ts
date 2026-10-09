import { describe, expect, it } from "vitest";
import { databaseUrlForRuntime } from "../../backend/src/lib/database-url";

describe("serverless database connection settings", () => {
  it("leaves local settings untouched", () => {
    const value =
      "mysql://test:password@localhost:3308/test?connection_limit=8";
    expect(databaseUrlForRuntime(value, false)).toBe(value);
  });
  it("bounds Vercel pools while preserving TLS and encoded credentials", () => {
    const value =
      "mysql://test:encoded%40password@db.example:4000/test?sslaccept=strict";
    const url = new URL(databaseUrlForRuntime(value, true));
    expect(url.searchParams.get("connection_limit")).toBe("3");
    expect(url.searchParams.get("pool_timeout")).toBe("30");
    expect(url.searchParams.get("sslaccept")).toBe("strict");
    expect(url.password).toBe("encoded%40password");
  });
  it("honors pool values explicitly configured by the provider", () => {
    const value =
      "mysql://test:password@db.example/test?connection_limit=2&pool_timeout=40&sslaccept=strict";
    const url = new URL(databaseUrlForRuntime(value, true));
    expect(url.searchParams.get("connection_limit")).toBe("2");
    expect(url.searchParams.get("pool_timeout")).toBe("40");
    expect(url.searchParams.get("sslaccept")).toBe("strict");
  });
});
