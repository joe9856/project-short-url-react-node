import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { chromium } from "@playwright/test";
// Mermaid สำหรับเอกสารอยู่ใน runtime แยก ไม่เพิ่ม dependency ของ application
const root = path.resolve(".runtime/diagrams/node_modules/mermaid/dist");
const server = http.createServer(async (request, response) => {
  try {
    if (request.url === "/") {
      response.setHeader("Content-Type", "text/html");
      response.end("<!doctype html><html><body></body></html>");
      return;
    }
    const file = path.resolve(
      root,
      "." + new URL(request.url, "http://localhost").pathname,
    );
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    response.setHeader("Content-Type", "application/javascript");
    response.end(await fs.readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  channel: process.platform === "win32" ? "msedge" : undefined,
});
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const name of ["architecture", "dfd-level-0", "er"]) {
    const definition = await fs.readFile(`docs/diagrams/${name}.mmd`, "utf8");
    const svg = await page.evaluate(
      async ({ definition, name }) => {
        const { default: mermaid } = await import("/mermaid.esm.min.mjs");
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "strict",
          themeVariables: {
            primaryColor: "#fff1f0",
            primaryTextColor: "#202124",
            primaryBorderColor: "#c92720",
            lineColor: "#4b5563",
            fontFamily: "Tahoma, sans-serif",
            fontSize: "16px",
          },
        });
        const result = await mermaid.render(`diagram-${name}`, definition);
        const container = document.createElement("div");
        container.innerHTML = result.svg;
        return new XMLSerializer().serializeToString(
          container.firstElementChild,
        );
      },
      { definition, name },
    );
    const dimensions = svg
      .match(/viewBox="([^"]+)"/)[1]
      .split(" ")
      .map(Number);
    const exported = svg.replace(
      'width="100%"',
      `width="${Math.ceil(dimensions[2])}" height="${Math.ceil(dimensions[3])}"`,
    );
    await fs.writeFile(`docs/diagrams/${name}.svg`, exported);
    await page.setContent(exported);
    await page.locator("svg").screenshot({ path: `docs/diagrams/${name}.png` });
    console.log(`Rendered ${name} SVG and PNG`);
  }
} finally {
  await browser.close();
  server.close();
}
