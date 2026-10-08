import { z } from "zod";
const environment = z
  .object({
    DATABASE_URL: z.string().startsWith("mysql://"),
    APP_URL: z.url(),
    RATE_LIMIT_SECRET: z.string().min(32),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .parse(process.env);
const appUrl = new URL(environment.APP_URL);
if (
  !["http:", "https:"].includes(appUrl.protocol) ||
  appUrl.pathname !== "/" ||
  appUrl.search ||
  appUrl.hash ||
  appUrl.username ||
  appUrl.password
) {
  throw new Error(
    "APP_URL must be an HTTP(S) origin without a path or credentials",
  );
}
if (environment.NODE_ENV === "production" && appUrl.protocol !== "https:") {
  throw new Error("Production APP_URL must use HTTPS");
}
export const config = { ...environment, APP_URL: appUrl.origin };
