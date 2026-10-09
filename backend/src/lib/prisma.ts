import { PrismaClient } from "@prisma/client";
import { databaseUrlForRuntime } from "./database-url.js";
export const prisma = new PrismaClient({
  datasourceUrl: databaseUrlForRuntime(
    process.env.DATABASE_URL!,
    process.env.VERCEL === "1",
  ),
});
