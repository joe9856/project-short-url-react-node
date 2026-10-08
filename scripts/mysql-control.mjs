import { spawn, spawnSync } from "node:child_process";
import { readFileSync, openSync } from "node:fs";
import path from "node:path";
const root = process.cwd();
if (!root.toLowerCase().endsWith("short-url-react-node"))
  throw new Error("Run in the new project directory");
const base = path.join(root, ".runtime/mysql/mysql-8.4.11-winx64");
const data = path.join(root, ".runtime/mysql-data");
if (process.argv[2] === "start") {
  const output = openSync(".local/mysql-server.log", "a");
  const child = spawn(
    path.join(base, "bin/mysqld.exe"),
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
    ],
    { detached: true, windowsHide: true, stdio: ["ignore", output, output] },
  );
  child.unref();
  console.log(
    "MySQL start requested; inspect .local/mysql-server.log and /healthz",
  );
} else if (process.argv[2] === "stop") {
  const admin = JSON.parse(readFileSync(".local/mysql-admin.json", "utf8"));
  const result = spawnSync(
    path.join(base, "bin/mysqladmin.exe"),
    [
      "--no-defaults",
      "--protocol=tcp",
      "-h",
      "127.0.0.1",
      "-P",
      "3308",
      "-u",
      "root",
      "shutdown",
    ],
    {
      env: { ...process.env, MYSQL_PWD: admin.password },
      stdio: "inherit",
      windowsHide: true,
    },
  );
  process.exit(result.status ?? 1);
} else throw new Error("Use start or stop");
