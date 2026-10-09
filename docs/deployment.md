# ระบบออนไลน์และวิธี Deploy

Source ถูก push แล้ว และ Frontend/Backend deploy สำเร็จบน Vercel:

1. Public Repository: https://github.com/joe9856/project-short-url-react-node
2. Frontend สำหรับผู้ตรวจ: https://project-short-url-react-node.vercel.app
3. Backend: https://project-short-url-react-node-osq6.vercel.app
4. Production database: **TiDB Cloud** ตามข้อมูลผู้ดูแลที่ยืนยันวันที่ 9 ตุลาคม 2026; local/CI ใช้ MySQL 8.4

TiDB เป็น MySQL-compatible ไม่ใช่ MySQL แท้ ต้องยืนยันกับบริษัทว่าใช้ได้ตามโจทย์ Backend เป็น Modular Monolith ไม่ใช่ Microservices ข้อความด้านล่างเป็นวิธีตั้งค่าระบบซ้ำ ผลตรวจ HTTPS/API และ CI อยู่ใน [verification.md](verification.md)

ห้ามนำ repository, Vercel projects, secrets หรือ production DB ของ Next.js มาใช้ ไม่ต้องส่ง secret ในแชตสาธารณะ ตั้งใน provider environment หรือ `backend/.env` ที่ถูก ignore

## Backend project

- Import repository ใหม่ ตั้ง Root Directory เป็น `backend`
- Node runtime สาย 22 และ framework Express
- `src/app.ts` export default Express application; `src/server.ts` ใช้ listen เฉพาะ local จึงไม่ต้องเปิด listener ถาวรใน serverless entry
- build command `npm run build` ใช้ Prisma generate + TypeScript; npm workspaces ต้องเข้าถึง root lockfile/dependencies เปิด include files outside root หาก provider จำเป็นต้องอ่าน root workspace
- ตั้ง DATABASE_URL, APP_URL (frontend origin), RATE_LIMIT_SECRET ใหม่, NODE_ENV=production
- Apply `prisma migrate deploy` จาก trusted terminal/CI ที่ชี้ DB ใหม่และผ่านการทบทวนก่อนปล่อย version ไม่รัน destructive migration อัตโนมัติในทุก preview
- เลือก pool limit ตามข้อจำกัด DB และ serverless concurrency ใช้ TLS strict; ไม่มี secret ใน frontend

โครงสร้าง entry ใช้รูปแบบที่ [Vercel รองรับ Express](https://vercel.com/docs/frameworks/backend/express) การทดสอบสมัคร/ล็อกอิน/สร้างลิงก์ออนไลน์ยืนยันว่า Argon2, Prisma และ DB requests ทำงานบน deployed backend ได้ ไม่ได้ตรวจค่า TLS ภายใน provider โดยตรง

## Frontend project

- Import repository เดียวกัน ตั้ง Root Directory `frontend`, framework Vite, Node 22
- Build `npm run build`, output `dist` ตาม [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite)
- `frontend/vercel.json` ตั้ง backend จริงแล้ว หากเปลี่ยน origin รัน `node scripts/configure-deployment.mjs https://project-short-url-react-node-osq6.vercel.app` โดยเปลี่ยน argument เป็น backend origin ใหม่
- Rewrite `/api/:path*`, `/s/:path*`, `/healthz` ไป backend ก่อน SPA fallback ซึ่ง exclude path เหล่านี้ชัดเจน
- `APP_URL` ของ backend ต้องเท่ากับ frontend origin จริง Cookie จึงเป็น host-only ผ่าน frontend proxy, HttpOnly/Secure/SameSite=Lax ไม่ต้อง CORS wildcard หรือ cross-site cookie
- Header config มี CSP, nosniff, frame denial, referrer policy และ no-store ของ API/redirect

เมื่อส่ง URL ให้ผู้ตรวจ ใช้ **Frontend** ด้านบน Backend root `/` ตอบ API 404 ตามปกติ ไม่ใช่หน้าเว็บสำหรับผู้ใช้

## Production acceptance ผ่าน public frontend URL

รายการต่อไปนี้เป็นเกณฑ์ตรวจ ดูผลที่รันแล้วและข้อจำกัดใน `verification.md`:

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

## ตรวจออนไลน์ซ้ำ

ใช้บัญชีทดสอบเฉพาะ เพราะคำสั่งนี้สร้างลิงก์/คลิกจริง และตรวจเปิด–ปิด/หมดอายุของลิงก์ที่สร้างใหม่ ไม่แก้หรือลบลิงก์เดิม:

```powershell
$env:ONLINE_URL = "https://project-short-url-react-node.vercel.app"
$env:ONLINE_EMAIL = "YOUR_DEDICATED_TEST_EMAIL"
$env:ONLINE_PASSWORD = "YOUR_TEST_ACCOUNT_PASSWORD"
npm.cmd run verify:online
```

รายงาน `docs/evidence/production.json` มีวันที่, commit, public URL และผลแต่ละรายการ ไม่มีรหัสผ่าน/cookie/token ตรวจ health, SPA HTML, login/logout/cookie, random code/alias, 302/query/fragment/no-store, HEAD, QR PNG decode/SVG, 20 concurrent clicks, history/analytics/source/device, duplicate 409, disable/expiry 410 และ wrong/missing Origin

บัญชีสาธิตเครื่องนี้อยู่ `.local/production-demo-account.md` และ environment อยู่ `.local/production-demo.env` ทั้งสองไฟล์ถูก ignore ส่งบัญชีให้ผู้ตรวจทางช่องทางส่วนตัว หรือให้ผู้ตรวจสมัครเอง สำหรับเครื่องนี้รันโดยไม่พิมพ์รหัสผ่านใน terminal:

```powershell
cd D:\Projects-Short-URL\short-url-react-node
.\.runtime\node_modules\node\bin\node.exe --env-file=.local/production-demo.env scripts/verify-online.mjs
```

## ก่อน push และหลัง deploy

รัน checks ที่เกี่ยวข้องและตรวจ diff/รายการไฟล์ที่จะ commit ห้ามเพิ่ม `.env`, `.local`, `.runtime`, database files, logs หรือรหัสผ่าน ใช้ remote ของโปรเจกต์นี้ หลัง deploy ตรวจ `/healthz` ผ่าน frontend, เปิด Short URL เดิม และล็อกอินบัญชีทดสอบเดิมเพื่อเทียบ ID/URL/จำนวนคลิกกับ snapshot ก่อน deploy โดยไม่รัน migration เพื่อทดสอบ persistence

CI บน GitHub Actions ของ application commit `a6679698e5c7d7ea0f8811ed11ab1a7e06274438` ผ่านจริงทั้ง MySQL service/migrate, typecheck, lint, unit/React/API, integration, build และ Playwright Chromium บน Linux: https://github.com/joe9856/project-short-url-react-node/actions/runs/37857572675

การสแกน QR ด้วยมือถือจริงและการตรวจ TLS options ภายในผู้ให้บริการต้องทำแยก ไม่อ้างว่าผ่านจาก QR decode หรือ HTTPS/API checks
