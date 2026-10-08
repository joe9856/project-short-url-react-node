# เตรียม GitHub และ Vercel

ยังไม่มีการ commit/push/deploy หรือสร้าง cloud resource โปรเจกต์ local สร้างเสร็จและมี test suite แล้ว การใช้งาน production ยังต้องยืนยัน destination และ environment ต่อไปนี้:

1. GitHub owner/repository ใหม่ 1 repository และสิทธิ์ push
2. Vercel team และ project ใหม่ 2 projects: frontend กับ backend
3. Frontend public HTTPS origin และ backend HTTPS origin
4. Database ใหม่สำหรับ development/preview/production พร้อม credentials/TLS และการยืนยันว่า assignment อนุญาต TiDB หรือ Hosted MySQL

ห้ามนำ repository, Vercel projects, secrets หรือ production DB ของ Next.js มาใช้ ไม่ต้องส่ง secret ในแชตสาธารณะ ตั้งใน provider environment หรือ `backend/.env` ที่ถูก ignore

## Backend project

- Import repository ใหม่ ตั้ง Root Directory เป็น `backend`
- Node runtime สาย 22 และ framework Express
- `src/app.ts` export default Express application; `src/server.ts` ใช้ listen เฉพาะ local จึงไม่ต้องเปิด listener ถาวรใน serverless entry
- build command `npm run build` ใช้ Prisma generate + TypeScript; npm workspaces ต้องเข้าถึง root lockfile/dependencies เปิด include files outside root หาก provider จำเป็นต้องอ่าน root workspace
- ตั้ง DATABASE_URL, APP_URL (frontend origin), RATE_LIMIT_SECRET ใหม่, NODE_ENV=production
- Apply `prisma migrate deploy` จาก trusted terminal/CI ที่ชี้ DB ใหม่และผ่านการทบทวนก่อนปล่อย version ไม่รัน destructive migration อัตโนมัติในทุก preview
- เลือก pool limit ตามข้อจำกัด DB และ serverless concurrency ใช้ TLS strict; ไม่มี secret ใน frontend

โครงสร้าง entry ใช้รูปแบบที่ [Vercel รองรับ Express](https://vercel.com/docs/frameworks/backend/express) การ deploy จริงยังไม่ได้ทดสอบ native Argon2, Prisma engine bundling และ network ไป cloud DB ของโปรเจกต์นี้

## Frontend project

- Import repository เดียวกัน ตั้ง Root Directory `frontend`, framework Vite, Node 22
- Build `npm run build`, output `dist` ตาม [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite)
- หลังยืนยัน backend origin รัน `node scripts/configure-deployment.mjs https://CONFIRMED-BACKEND-HOST` เพื่อแก้ destinations ใน frontend/vercel.json
- Rewrite `/api/:path*`, `/s/:path*`, `/healthz` ไป backend ก่อน SPA fallback ซึ่ง exclude path เหล่านี้ชัดเจน
- `APP_URL` ของ backend ต้องเท่ากับ frontend origin จริง Cookie จึงเป็น host-only ผ่าน frontend proxy, HttpOnly/Secure/SameSite=Lax ไม่ต้อง CORS wildcard หรือ cross-site cookie
- Header config มี CSP, nosniff, frame denial, referrer policy และ no-store ของ API/redirect

ไฟล์ปัจจุบันใช้ `.example.invalid` เป็น placeholder ตั้งใจไม่ใช้ปลายทางที่เดา ห้าม deploy โดยลืมแก้ hostname

## Production acceptance ที่ต้องรันผ่าน public frontend URL

- refresh `/dashboard`, `/history`, `/links/:id` แล้วได้ SPA ที่ถูกต้อง
- register → Set-Cookie → me → logout → revoked cookie ใช้ต่อไม่ได้
- Cookie มี HttpOnly/Secure/SameSite=Lax ไม่มี Domain ของ backend
- Origin ที่ผิด/ไม่มี Origin ส่ง POST ไม่ได้; Origin frontend ที่ถูกส่งได้
- สร้างลิงก์และ custom alias, duplicates 409, owner isolation 404
- GET `/s/:code` 302 ไป URL เดิม มี no-store; HEAD ไม่เพิ่ม event
- คลิก 20 requests เก็บครบ, expired/disabled 410, unknown 404
- QR PNG/SVG decode ได้ short URL ของ public frontend; สแกนด้วยมือถือจริง
- กราฟ Bangkok, sources/devices, query/fragment/ภาษาไทยถูกต้อง
- redeploy แล้วข้อมูล/การล็อกอินที่ยังไม่หมดอายุยังอ่านจาก database ได้
- certificate verification/TLS และ error response ไม่เผย secret
- Vercel proxy รักษา query, Location, Set-Cookie และ Cache-Control จริง การอ่านเอกสาร/config อย่างเดียวไม่ใช่ผลทดสอบ

## ก่อน commit/push

รัน typecheck, lint, Vitest, MySQL integration, Playwright, build ให้ผ่าน ตรวจ diff และรายการไฟล์ที่จะ commit ห้ามเพิ่ม `.env`, `.local`, `.runtime`, database files, logs หรือรหัสผ่าน ยืนยัน Git remote ใหม่กับผู้ใช้ก่อน commit/push/deploy ตามคำขอเดิม ขั้นตอนนี้ยังไม่ได้ดำเนินการ

CI ที่เตรียมไว้มี MySQL service, migrate, typecheck, lint, unit/React/API, integration, build และ Playwright Chromium บน Linux ยังไม่ได้รัน GitHub Actions จริง จึงไม่อ้างว่า CI cloud ผ่าน
