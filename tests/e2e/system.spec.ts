import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("register, create, copy, download QR, redirect, history, settings, logout and login", async ({
  page,
  context,
}, testInfo) => {
  const email = `e2e-${randomUUID()}@example.com`;
  const alias = `e2e-${randomUUID().slice(0, 8)}`;
  const password = "BrowserPassword123!";
  const destination = `http://localhost:5173/?campaign=test&label=${"long-url-".repeat(24)}#cta`;
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "ย่อลิงก์ พร้อมแชร์ ด้วย QR Code" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "สมัครสมาชิก", exact: true })
    .first()
    .click();
  await page.getByLabel("ชื่อ", { exact: true }).fill("ผู้ใช้ทดสอบ");
  await page.getByLabel("อีเมล", { exact: true }).fill(email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(password);
  await page.getByRole("button", { name: "สมัครสมาชิก", exact: true }).click();
  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByText("ยังไม่มีลิงก์ที่ตรงกับรายการนี้")).toBeVisible();
  const session = (await context.cookies()).find(
    (cookie) => cookie.name === "short_session",
  );
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  await page.getByLabel("URL ต้นฉบับ", { exact: true }).fill(destination);
  await page.getByText("ตัวเลือกเพิ่มเติม · ชื่อลิงก์และวันหมดอายุ").click();
  await page
    .getByLabel("ชื่อลิงก์ที่ต้องการ (ไม่บังคับ)", { exact: true })
    .fill(alias);
  await page
    .getByLabel("วันหมดอายุ (เวลาไทย)", { exact: true })
    .fill(
      new Date(Date.now() + 86400000 + 7 * 3600000).toISOString().slice(0, 16),
    );
  await page.getByRole("button", { name: "สร้างลิงก์", exact: true }).click();
  await expect(page.getByText("สร้างลิงก์สำเร็จ พร้อมแชร์แล้ว")).toBeVisible();
  const result = page.getByRole("region", { name: "ลิงก์สั้น", exact: true });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await result
    .getByRole("button", { name: "คัดลอกลิงก์", exact: true })
    .click();
  await expect(result.getByText("คัดลอกลิงก์สั้นแล้ว")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `http://localhost:5173/s/${alias}`,
  );
  const image = result.getByRole("img", { name: /^QR Code ของ/ });
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  for (const format of ["PNG", "SVG"]) {
    const pending = page.waitForEvent("download");
    await result.getByRole("button", { name: format, exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(
      `qr-${alias}.${format.toLowerCase()}`,
    );
    await download.saveAs(testInfo.outputPath(download.suggestedFilename()));
  }
  const visitor = await context.newPage();
  await visitor.goto(`/s/${alias}`);
  await expect(visitor).toHaveURL(destination);
  await visitor.close();
  await page.goto("/history");
  await page.getByLabel("ค้นหาลิงก์", { exact: true }).fill(alias);
  await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
  const row = page.locator("article.history-row").filter({ hasText: alias });
  await expect(row.locator(".click-count")).toContainText("1");
  await row.getByRole("link", { name: alias, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "รายละเอียดลิงก์", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1 คลิกในช่วงที่เลือก")).toBeVisible();
  await page.getByLabel("เปิดใช้งานลิงก์", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "บันทึกการตั้งค่า", exact: true })
    .click();
  await expect(page.getByText("บันทึกการตั้งค่าแล้ว")).toBeVisible();
  expect(
    (await page.request.get(`/s/${alias}`, { maxRedirects: 0 })).status(),
  ).toBe(410);
  await page.getByLabel("เปิดใช้งานลิงก์", { exact: true }).check();
  await page.getByLabel("วันหมดอายุ (เวลาไทย)", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "บันทึกการตั้งค่า", exact: true })
    .click();
  await expect(page.getByText("บันทึกการตั้งค่าแล้ว")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "รายละเอียดลิงก์", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("details.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "แดชบอร์ด", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
  await page.getByLabel("อีเมล", { exact: true }).fill(email);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL("/dashboard");
  expect(failures).toEqual([]);
});
test("keyboard focus and error recovery stay usable", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "ยินดีต้อนรับกลับ" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.getByLabel("อีเมล", { exact: true }).fill("missing@example.com");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("WrongPassword123");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  );
  await expect(page.getByLabel("อีเมล", { exact: true })).toHaveValue(
    "missing@example.com",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
