import { z } from "zod";
export function validUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
const futureDate = z.iso
  .datetime({ offset: true })
  .refine(
    (value) => new Date(value).getTime() > Date.now(),
    "วันหมดอายุต้องอยู่ในอนาคต",
  );
export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "กรุณาระบุชื่อ").max(100),
    email: z
      .email("รูปแบบอีเมลไม่ถูกต้อง")
      .max(254)
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(10, "รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร")
      .max(128),
  })
  .strict();
export const loginSchema = registerSchema.omit({ name: true });
export const createLinkSchema = z
  .object({
    originalUrl: z
      .string()
      .trim()
      .min(1)
      .max(8192)
      .refine(
        validUrl,
        "ใช้ URL แบบ http:// หรือ https:// โดยไม่มีชื่อผู้ใช้หรือรหัสผ่าน",
      ),
    alias: z
      .string()
      .regex(/^[a-z0-9-]{3,32}$/, "ชื่อสั้นใช้ a-z, 0-9 และขีดกลาง 3–32 ตัว")
      .optional(),
    expiresAt: futureDate.nullable().optional(),
  })
  .strict();
export const updateLinkSchema = z
  .object({
    isActive: z.boolean().optional(),
    expiresAt: futureDate.nullable().optional(),
  })
  .strict()
  .refine(
    (value) => value.isActive !== undefined || value.expiresAt !== undefined,
    "กรุณาระบุข้อมูลที่ต้องการแก้ไข",
  );
export const listSchema = z
  .object({
    q: z.string().trim().max(200).default(""),
    status: z.enum(["all", "active", "disabled", "expired"]).default("all"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();
export const idSchema = z.uuid();
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
