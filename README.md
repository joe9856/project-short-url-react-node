# Short URL — React + Express

ระบบย่อลิงก์ภาษาไทยที่ทำงานจริง แยก React SPA และ Express REST API ใน repository เดียว พัฒนาตาม `PLAN.md` เพื่อเปรียบเทียบกับ Next.js โดยไม่ได้แก้ไขโปรเจกต์ `D:\Projects\short-url-demo` ไม่ใช้ `.env`, Git, session secret หรือฐานข้อมูลของโปรเจกต์เดิม

## สิ่งที่ทำได้

- สมัครสมาชิก เข้าสู่ระบบ และออกจากระบบด้วย Argon2id และ session ในฐานข้อมูล
- สร้างลิงก์ HTTP/HTTPS ด้วยรหัสสุ่ม 8 ตัว หรือ alias `a-z`, `0-9`, `-` ยาว 3–32 ตัว
- เปิดลิงก์สั้นด้วย public HTTP 302; HEAD ตรวจสถานะโดยไม่เพิ่มคลิก
- QR บรรจุลิงก์สั้น แสดงตัวอย่าง คัดลอกลิงก์ และดาวน์โหลด PNG/SVG
- ประวัติส่วนตัว ค้นหา กรองสถานะ แบ่งหน้า รายละเอียด เปิด–ปิด และตั้ง/แก้วันหมดอายุ
- คลิกสะสม กราฟรายวันตาม Asia/Bangkok เลือกช่วงวันที่ แหล่งที่มา และอุปกรณ์
- หน้าจอไทย สีขาว/เทา/แดง ฟอนต์ self-hosted และ layout สำหรับ desktop/tablet/mobile
- Validation, ownership, Origin protection, database rate limit, error handling และ no-store

ต้องเข้าสู่ระบบก่อนสร้างลิงก์ ส่วนผู้เปิด short URL ไม่ต้องเข้าสู่ระบบ จำนวนคลิกนับทุก GET รวมการเปิดซ้ำและบอต ไม่ใช่ unique visitors ไม่มี hard delete และแก้ URL/รหัสของลิงก์เดิมไม่ได้

## เริ่มใช้งาน

ใช้ **Node.js 22.12+ ในสาย 22 LTS** และ MySQL 8.4 แยกสำหรับโปรเจกต์นี้ ดู [คู่มือ environment และฐานข้อมูล](docs/setup.md)

```powershell
cd D:\Projects\short-url-react-node
node --version
npm.cmd ci
Copy-Item .env.example backend/.env
# แก้ DATABASE_URL, APP_URL และ RATE_LIMIT_SECRET ใน backend/.env
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run dev
```

เปิด **http://localhost:5173**; Express อยู่ที่ **http://localhost:3001** ต้องใช้ `localhost` ให้ตรงกับ `APP_URL` แม้ Vite จะแสดง `127.0.0.1` ใน terminal การใช้คนละ origin จะทำให้ POST ถูกปฏิเสธ

เครื่องที่ใช้พัฒนานี้มี `.runtime/` และ `backend/.env` ซึ่งสร้างใหม่พร้อม credentials เฉพาะโปรเจกต์แล้ว ไม่ต้องคัดลอก `.env.example` ทับไฟล์ที่มีอยู่ ใช้คำสั่งต่อไปนี้ได้เมื่อ MySQL รันอยู่:

```powershell
cd D:\Projects\short-url-react-node
node scripts/local.mjs run dev
```

บัญชีสาธิต local ที่สร้างใหม่อยู่ใน `.local/demo-account.md` ซึ่งถูก ignore หรือสมัครบัญชีของคุณเองผ่านหน้าเว็บ ไม่มีรหัสผ่านสาธิตในเอกสารสาธารณะ

`scripts/local.mjs` เลือก Node 22 ที่ติดตั้งใน `.runtime/` และวาง npm cache/temp บน D: เป็นตัวช่วย Windows เครื่องนี้; บนเครื่องทั่วไปที่มี Node 22 ใช้ `npm.cmd`/`npm` ได้ตามปกติ `.runtime`, `.local`, `.cache`, `.env` ถูก ignore

## คำสั่งหลัก

| คำสั่ง | หน้าที่ |
|---|---|
| `npm run dev` | รัน frontend/backend พร้อมกันด้วย npm workspaces |
| `npm run typecheck` | ตรวจ TypeScript strict ทั้งสองแอป |
| `npm run lint` | ESLint source, scripts และ tests |
| `npm test` | Vitest unit/Supertest/React forms โดยไม่ต้องมี DB |
| `npm run test:mysql` | migrate และทดสอบ MySQL จริงใน `short_url_react_node_test` |
| `npm run test:e2e` | Playwright บน test DB ที่ 390/768/1440px; ปิด dev server ก่อน |
| `npm run test:outage` | ตรวจ health/GET/HEAD 503 เมื่อ DB ติดต่อไม่ได้ หลัง build |
| `npm run audit:prod` | ตรวจ dependency production และบันทึก JSON evidence |
| `npm run docs:diagrams` | สร้าง Mermaid docs และ render SVG/PNG เมื่อมี Mermaid runtime |
| `npm run build` | build Vite และ generate Prisma/compile Express |
| `npm run db:migrate` | apply migration ที่มีอยู่ |
| `npm run db:dev` | สร้าง migration ใหม่เมื่อเปลี่ยน schema ใน development |
| `npm run db:seed` | สร้างบัญชีสาธิตจาก DEMO_EMAIL/DEMO_PASSWORD ที่ผู้ใช้กำหนด |

บน PowerShell ใช้ `npm.cmd` เมื่อ execution policy ไม่อนุญาต `npm.ps1` หากใช้ตัวช่วยเครื่องนี้แทนทุกคำสั่ง เช่น `node scripts/local.mjs run test:mysql`

E2E ใช้ Microsoft Edge ที่ติดตั้งอยู่บน Windows; CI ใช้ Chromium Playwright `test:mysql` ลบข้อมูลผู้ใช้ใน test DB เท่านั้น ต้องไม่ใช้ฐานข้อมูลนี้เก็บข้อมูลจริง อย่ารัน integration กับ E2E พร้อมกัน ดู [ผลตรวจจริง](docs/verification.md)

## โครงสร้างและเส้นทางเรียนรู้

```text
frontend/src/pages/       หน้า Home, Auth, Dashboard, History, LinkDetails
frontend/src/components/ ฟอร์ม, QR/result, history, analytics, navigation
frontend/src/services/   Fetch helper และการแสดงวันที่
frontend/src/types/      รูปร่างข้อมูล API แบบ interface
frontend/src/styles/     semantic tokens และ responsive CSS/Tailwind
backend/src/routes/      จับคู่ URL/method กับ controller
backend/src/controllers/ ตรวจ input และตอบ HTTP
backend/src/services/    business logic
backend/src/middlewares/ authentication, Origin, limiter, errors
backend/src/lib/         Prisma/config/validation/date
backend/prisma/          schema, migration และ seed
tests/                   unit, MySQL integration, browser E2E
docs/                    API, setup, deploy, diagrams, learning, comparison
```

เริ่มอ่าน `CreateForm.tsx` → `services/api.ts` → backend `routes/links.ts` → `controllers/links.ts` → `services/links.ts` → `schema.prisma` จะเห็น `useState`, event, `fetch`, `async/await` และ flow Router → Controller → Service → Prisma → DB โดยไม่มี repository pattern หรือ global state library

## เทคโนโลยีที่ติดตั้ง

React 19.3.0, Vite 7.3.7, React Router 7.18.4, Tailwind 4.3.3, Express 5.2.1, TypeScript 5.9.3, Prisma/Client 6.19.3, Argon2 0.45.1, Zod 4.6.5, qrcode 1.5.4, Recharts 3.10.1, Lucide 1.53.0, Vitest 4.1.11, Supertest 7.2.2, Playwright 1.64.0 ตรึง dependency ใน package-lock เพื่อให้ติดตั้งซ้ำได้ ตรวจ compatibility ด้วย package metadata, typecheck, build และ runtime tests ใช้ override deepmerge-ts 8.0.2 เพื่อแก้ advisory ของ dependency ใน Prisma tooling โดยคง Prisma 6.19.x ตามแผน

## เอกสาร

- [API และตัวอย่าง request/response](docs/api.md)
- [Environment, local MySQL, TiDB และการเริ่มระบบ](docs/setup.md)
- [เตรียม GitHub/Vercel และตรวจ production](docs/deployment.md)
- [ผลทดสอบจริงและข้อจำกัด](docs/verification.md)
- [รายการไฟล์ที่สร้าง](docs/evidence/files-created.json)
- [แผนภาพ DFD Level 0, ER และ Architecture](docs/diagrams.md) พร้อม Mermaid source ใน `docs/diagrams/`
- [อธิบายแต่ละฟังก์ชันและเตรียมสัมภาษณ์](docs/learning-and-interview.md)
- [เปรียบเทียบกับ Next.js](docs/comparison.md)

## สถานะการส่งงาน

ระบบ local และเอกสารอยู่ในโฟลเดอร์ใหม่ ยังไม่ได้ commit, push, สร้าง remote repository หรือ deploy ต้องยืนยัน GitHub destination, Vercel 2 projects, frontend/backend domains และ cloud DB ใหม่ก่อน `frontend/vercel.json` มี hostname `.invalid` เป็น placeholder ที่ตั้งใจให้ใช้ deploy จริงไม่ได้ ดูขั้นตอนใน deployment guide

TiDB เป็น MySQL-compatible ไม่ใช่ MySQL แท้ ต้องยืนยันกับบริษัทว่าใช้ได้ และทดสอบ migration/TLS/CRUD/concurrency บนฐานข้อมูล cloud ของโปรเจกต์นี้จริงก่อนกล่าวว่าพร้อม production QR ถูก decode ด้วยโปรแกรมใน tests; การสแกนจากโทรศัพท์จริงและ HTTPS proxy/cookie roundtrip ยังต้องตรวจหลังมี public URL
