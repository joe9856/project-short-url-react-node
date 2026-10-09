import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { PNG } from "pngjs";
import jsQR from "jsqr";

// ใช้บัญชีสาธิตเฉพาะ: สร้างลิงก์ทดสอบและบันทึกคลิกจริง ไม่ลบข้อมูลเดิม
const origin = new URL(
  process.env.ONLINE_URL || "https://project-short-url-react-node.vercel.app",
).origin;
assert.ok(origin.startsWith("https://"), "ONLINE_URL must use HTTPS");
assert.ok(
  process.env.ONLINE_EMAIL && process.env.ONLINE_PASSWORD,
  "Set ONLINE_EMAIL and ONLINE_PASSWORD for a dedicated test account",
);
const results = [];
let cookie = "";
let testLink;
async function call(
  path,
  method = "GET",
  body,
  authenticated = true,
  requestOrigin = origin,
  additionalHeaders = {},
) {
  const headers = { ...additionalHeaders };
  if (authenticated && cookie) headers.Cookie = cookie;
  if (method !== "GET" && method !== "HEAD" && requestOrigin)
    headers.Origin = requestOrigin;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(origin + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
}
function passed(name, detail = "") {
  results.push({ name, status: "passed", detail });
  console.log(`PASS: ${name}${detail ? " — " + detail : ""}`);
}
async function login() {
  const response = await call("/api/auth/login", "POST", {
    email: process.env.ONLINE_EMAIL,
    password: process.env.ONLINE_PASSWORD,
  });
  assert.equal(response.status, 200, "Test account login failed");
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie?.includes("HttpOnly"));
  assert.ok(setCookie.includes("Secure"));
  assert.ok(setCookie.includes("SameSite=Lax"));
  assert.ok(!/;\s*Domain=/i.test(setCookie));
  cookie = setCookie.split(";")[0];
}
try {
  let response = await call("/healthz");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "ok");
  passed("HTTPS frontend proxy connects to database");
  for (const path of ["/", "/dashboard", "/history", "/login"]) {
    response = await call(path);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes('<div id="root"></div>'));
  }
  passed("SPA HTML served on root and deep links");
  await login();
  assert.equal((await call("/api/auth/me")).status, 200);
  passed("Login/session through proxy; HttpOnly/Secure/Lax host-only cookie");
  const destination = "https://www.synerry.com/?source=short-url-demo#demo";
  response = await call("/api/links", "POST", { originalUrl: destination });
  assert.equal(response.status, 201);
  testLink = (await response.json()).link;
  assert.match(testLink.code, /^[a-z0-9]{8}$/);
  assert.equal(testLink.shortUrl, `${origin}/s/${testLink.code}`);
  passed("Random short URL uses public frontend domain", testLink.shortUrl);
  response = await call(`/links/${testLink.id}`);
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes('<div id="root"></div>'));
  response = await call(`/s/${testLink.code}`, "HEAD", undefined, false);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), destination);
  assert.equal(response.headers.get("cache-control"), "no-store");
  response = await call(`/api/links/${testLink.id}`);
  assert.equal((await response.json()).link.clicks, 0);
  passed("HEAD redirects without counting a click");
  response = await call(`/api/links/${testLink.id}/qr?format=png&download=1`);
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("content-type").includes("image/png"));
  assert.ok(response.headers.get("content-disposition").includes(".png"));
  const png = PNG.sync.read(Buffer.from(await response.arrayBuffer()));
  const decoded = jsQR(
    new Uint8ClampedArray(png.data),
    png.width,
    png.height,
  )?.data;
  assert.equal(decoded, testLink.shortUrl);
  response = await call(`/api/links/${testLink.id}/qr?format=svg&download=1`);
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("content-type").includes("image/svg+xml"));
  assert.ok((await response.text()).includes("<svg"));
  passed("PNG QR decodes to public short URL; PNG/SVG downloads work");
  const redirects = await Promise.all(
    Array.from({ length: 20 }, () =>
      call(`/s/${testLink.code}`, "GET", undefined, false, origin, {
        Referer: "https://source.example/private?q=discarded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      }),
    ),
  );
  for (const redirect of redirects) {
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get("location"), destination);
    assert.equal(redirect.headers.get("cache-control"), "no-store");
  }
  response = await call(
    `/api/links?q=${testLink.code}&status=active&limit=1&page=1`,
  );
  const history = await response.json();
  assert.equal(response.status, 200);
  assert.equal(history.pagination.total, 1);
  assert.equal(history.links[0].originalUrl, destination);
  assert.equal(history.links[0].shortUrl, decoded);
  assert.equal(history.links[0].clicks, 20);
  response = await call(`/api/links/${testLink.id}/stats`);
  const stats = await response.json();
  assert.equal(response.status, 200);
  assert.equal(stats.summary.totalClicks, 20);
  assert.equal(stats.periodClicks, 20);
  assert.equal(stats.timezone, "Asia/Bangkok");
  assert.ok(
    stats.sources.some(
      (source) => source.name === "source.example" && source.clicks === 20,
    ),
  );
  assert.ok(
    stats.devices.some(
      (device) => device.name === "desktop" && device.clicks === 20,
    ),
  );
  passed(
    "20 concurrent redirects produce exactly 20 clicks",
    "History, Bangkok daily, source hostname and device agree; HEAD/QR do not count",
  );
  const alias = `verify-${randomUUID().slice(0, 8)}`;
  response = await call("/api/links", "POST", {
    originalUrl: destination,
    alias,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(response.status, 201);
  const aliasLink = (await response.json()).link;
  assert.equal(aliasLink.code, alias);
  response = await call("/api/links", "POST", {
    originalUrl: destination,
    alias,
  });
  assert.equal(response.status, 409);
  passed("Custom alias, future expiry and duplicate conflict");
  response = await call(`/api/links/${aliasLink.id}`, "PATCH", {
    isActive: false,
  });
  assert.equal(response.status, 200);
  assert.equal(
    (await call(`/s/${alias}`, "GET", undefined, false)).status,
    410,
  );
  response = await call(`/api/links/${aliasLink.id}`, "PATCH", {
    isActive: true,
    expiresAt: new Date(Date.now() + 10000).toISOString(),
  });
  assert.equal(response.status, 200);
  await new Promise((resolve) => setTimeout(resolve, 11000));
  assert.equal(
    (await call(`/s/${alias}`, "GET", undefined, false)).status,
    410,
  );
  response = await call(`/api/links/${aliasLink.id}`, "PATCH", {
    expiresAt: null,
  });
  assert.equal(response.status, 200);
  assert.equal(
    (await call(`/s/${alias}`, "HEAD", undefined, false)).status,
    302,
  );
  passed("Disable/enable, real expiry and clearing expiry");
  assert.equal(
    (await call("/s/verify-no-such-link-20261009", "GET", undefined, false))
      .status,
    404,
  );
  assert.equal(
    (await call(`/api/links/${testLink.id}/qr`, "GET", undefined, false))
      .status,
    401,
  );
  assert.equal(
    (
      await call(
        "/api/auth/logout",
        "POST",
        undefined,
        true,
        "https://invalid.example",
      )
    ).status,
    403,
  );
  assert.equal(
    (await call("/api/auth/logout", "POST", undefined, true, "")).status,
    403,
  );
  passed("Unknown link, protected QR and wrong/missing Origin");
  assert.equal((await call("/api/auth/logout", "POST")).status, 204);
  assert.equal((await call("/api/auth/me")).status, 401);
  passed("Logout revokes the session");
  cookie = "";
  await login();
  response = await call(`/api/links/${testLink.id}`);
  assert.equal((await response.json()).link.clicks, 20);
  passed("Login again preserves link and click history");
} catch (error) {
  results.push({
    name: "Online acceptance",
    status: "failed",
    detail: error.message,
  });
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (cookie) {
    try {
      assert.equal((await call("/api/auth/logout", "POST")).status, 204);
    } catch {
      results.push({
        name: "Final logout",
        status: "failed",
        detail: "Could not revoke test session",
      });
      process.exitCode = 1;
    }
  }
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  writeFileSync(
    "docs/evidence/production.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        commit,
        origin,
        database: "TiDB Cloud (confirmed by project owner; not introspected)",
        testLink: testLink
          ? {
              id: testLink.id,
              code: testLink.code,
              shortUrl: testLink.shortUrl,
              originalUrl: testLink.originalUrl,
            }
          : null,
        results,
        limitations: [
          "API/HTTP checks; physical phone scan and manual production browser interaction not performed",
          "Internal database TLS configuration not inspected",
          "Persistence after redeploy recorded separately",
        ],
      },
      null,
      2,
    ) + "\n",
  );
}
