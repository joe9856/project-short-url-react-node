import { app } from "./app.js";
import { config } from "./lib/config.js";
import { prisma } from "./lib/prisma.js";
const server = app.listen(config.PORT, "127.0.0.1", () =>
  console.log(`API ready on http://localhost:${config.PORT}`),
);
function shutdown() {
  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
