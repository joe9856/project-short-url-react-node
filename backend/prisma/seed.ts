import { prisma } from "../src/lib/prisma.js";
import { registerSchema } from "../src/lib/validation.js";
import { register } from "../src/services/auth.js";
try {
  const input = registerSchema.parse({
    name: "ผู้ใช้สาธิต",
    email: process.env.DEMO_EMAIL,
    password: process.env.DEMO_PASSWORD,
  });
  if (!(await prisma.user.findUnique({ where: { email: input.email } })))
    await register(input);
  console.log("Demo user ready");
} finally {
  await prisma.$disconnect();
}
