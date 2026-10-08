import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const database = new URL(process.env.DATABASE_URL);
database.hostname = "127.0.0.1";
database.port = "3399";
database.searchParams.set("connect_timeout", "1");
const child = spawn(process.execPath, ["backend/dist/server.js"], {
  env: { ...process.env, DATABASE_URL: database.toString(), PORT: "3002" },
  windowsHide: true,
  stdio: ["ignore", "pipe", "ignore"],
});
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Outage server failed to start")),
      15000,
    );
    child.stdout.once("data", () => {
      clearTimeout(timer);
      resolve();
    });
    child.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("Outage server exited"));
    });
  });
  for (const [method, path] of [
    ["GET", "/healthz"],
    ["GET", "/s/abcdefgh"],
    ["HEAD", "/s/abcdefgh"],
  ]) {
    const response = await fetch(`http://127.0.0.1:3002${path}`, {
      method,
      redirect: "manual",
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("location"), null);
    const body = await response.text();
    assert.equal(body.includes("mysql://"), false);
    if (method === "HEAD") assert.equal(body, "");
    console.log(
      `${method} ${path}: 503, no-store, no Location, no credentials`,
    );
  }
} finally {
  child.kill();
}
