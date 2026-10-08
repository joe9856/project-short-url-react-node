import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, openSync } from "node:fs";
import path from "node:path";
const root = process.cwd();
if (!root.toLowerCase().endsWith("short-url-react-node"))
  throw new Error("Run in the new project directory");
const base = path.join(root, ".runtime/mysql/mysql-8.4.11-winx64");
const data = path.join(root, ".runtime/mysql-data");
const local = path.join(root, ".local");
mkdirSync(local, { recursive: true });
if (existsSync(path.join(root, "backend/.env")))
  throw new Error("backend/.env exists; refusing to overwrite it");
const finish = process.argv.includes("--finish");
if (existsSync(data) && !finish)
  throw new Error("Data directory exists; refusing to reinitialize it");
const server = path.join(base, "bin/mysqld.exe");
const client = path.join(base, "bin/mysql.exe");
if (!existsSync(server))
  throw new Error(
    "Install MySQL 8.4 binary distribution under .runtime/mysql first",
  );
if (!finish) {
  const init = spawnSync(
    server,
    [
      "--no-defaults",
      "--initialize-insecure",
      `--basedir=${base}`,
      `--datadir=${data}`,
      `--log-error=${path.join(local, "mysql-init.log")}`,
    ],
    { windowsHide: true },
  );
  if (init.status !== 0)
    throw new Error(
      "MySQL initialization failed; inspect .local/mysql-init.log",
    );
  const output = openSync(path.join(local, "mysql-server.log"), "a");
  const processHandle = spawn(
    server,
    [
      "--no-defaults",
      `--basedir=${base}`,
      `--datadir=${data}`,
      "--bind-address=127.0.0.1",
      "--port=3308",
      "--mysqlx=0",
      "--default-time-zone=+00:00",
      "--skip-log-bin",
      "--console",
      `--log-error=${path.join(local, "mysql-error.log")}`,
    ],
    { detached: true, windowsHide: true, stdio: ["ignore", output, output] },
  );
  processHandle.unref();
  writeFileSync(path.join(local, "mysql.pid"), String(processHandle.pid));
}
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  const check = spawnSync(
    client,
    ["--no-defaults", "-h", "127.0.0.1", "-P", "3308", "-u", "root", "--batch"],
    { input: "SELECT 1;", windowsHide: true },
  );
  if (check.status === 0) {
    ready = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready)
  throw new Error("MySQL failed to start; inspect .local/mysql-error.log");
const password = randomBytes(24).toString("hex");
const rootPassword = randomBytes(24).toString("hex");
const sql = `CREATE DATABASE short_url_react_node CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE short_url_react_node_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'short_url'@'127.0.0.1' IDENTIFIED BY '${password}';
GRANT ALL PRIVILEGES ON short_url_react_node.* TO 'short_url'@'127.0.0.1';
GRANT ALL PRIVILEGES ON short_url_react_node_test.* TO 'short_url'@'127.0.0.1';
ALTER USER 'root'@'localhost' IDENTIFIED BY '${rootPassword}';`;
const result = spawnSync(
  client,
  ["--no-defaults", "-h", "127.0.0.1", "-P", "3308", "-u", "root", "--batch"],
  { input: sql, windowsHide: true },
);
if (result.status !== 0)
  throw new Error("Creating the isolated databases failed");
writeFileSync(
  path.join(local, "mysql-admin.json"),
  JSON.stringify({ password: rootPassword }),
);
writeFileSync(
  path.join(root, "backend/.env"),
  `DATABASE_URL="mysql://short_url:${password}@127.0.0.1:3308/short_url_react_node"\nAPP_URL="http://localhost:5173"\nPORT=3001\nRATE_LIMIT_SECRET="${randomBytes(32).toString("hex")}"\nNODE_ENV=development\n`,
);
console.log(
  "Independent MySQL running on 127.0.0.1:3308; backend/.env created with new credentials.",
);
