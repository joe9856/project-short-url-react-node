import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
// ใช้ Node 22 ในโปรเจกต์ถ้ามี โดยไม่เปลี่ยน Node ของเครื่องหรือโปรเจกต์อื่น
const root = process.cwd();
const localBin = path.join(root, ".runtime/node_modules/node/bin");
const temp = path.join(root, ".runtime/tmp");
mkdirSync(temp, { recursive: true });
const env = {
  ...process.env,
  TEMP: temp,
  TMP: temp,
  npm_config_cache: path.join(root, ".cache/npm"),
};
const existingPath = process.env.PATH || process.env.Path || "";
for (const key of Object.keys(env)) {
  if (key.toLowerCase() === "path") delete env[key];
}
const isWindows = process.platform === "win32";
env[isWindows ? "Path" : "PATH"] = isWindows
  ? [localBin, path.join(process.env.APPDATA, "npm"), existingPath].join(
      path.delimiter,
    )
  : existingPath;
const args = process.argv.slice(2);
const npmCli = isWindows
  ? path.join(process.env.APPDATA, "npm/node_modules/npm/bin/npm-cli.js")
  : process.env.npm_execpath;
const node = existsSync(path.join(localBin, "node.exe"))
  ? path.join(localBin, "node.exe")
  : process.execPath;
const result = isWindows
  ? spawnSync(node, [npmCli, ...args], { cwd: root, env, stdio: "inherit" })
  : spawnSync("npm", args, { cwd: root, env, stdio: "inherit" });
process.exit(result.status ?? 1);
