# PLAN — Short URL Management System (React + Node.js / Express)

> **Standalone comparison plan** — ดัดแปลงแนวทางจาก `PLAN.md` ของ `D:\Projects\short-url-demo` เพื่อสร้าง **โปรเจกต์ใหม่** เท่านั้น ห้ามแก้ไข ย้าย ลบ หรือเขียนทับโปรเจกต์ Next.js เดิม รวมถึงฐานข้อมูล Production เดิม
>
> **สถานะ:** ไฟล์นี้กำหนดขอบเขตงาน; implementation ถูก push และ deploy แล้ว สถานะและหลักฐานปัจจุบันอยู่ใน `README.md`, `docs/verification.md` และ `docs/submission.md` ห้ามใช้ข้อความในแผนแทนผลทดสอบจริง

## 1. วัตถุประสงค์และ Technology Stack

พัฒนา Short URL ที่สามารถสร้างลิงก์, เปิด Redirect, สแกน QR Code และเก็บประวัติ/คลิกได้จริง พร้อมฟังก์ชันเสริมทั้งหมดของแผนเดิม เพื่อเปรียบเทียบความง่ายในการพัฒนาและอธิบายโค้ดระหว่าง Next.js กับ React + Express ตามเกณฑ์ Synerry

| ส่วน | เทคโนโลยี |
|---|---|
| Frontend | React + Vite + TypeScript (TSX) + React Router + Tailwind CSS |
| Backend | Node.js 22 LTS + Express.js + TypeScript |
| Architecture | React SPA แยกจาก Express API; Backend เป็น Modular Monolith |
| Data access | Prisma ORM 6.19.x (`provider = "mysql"`), ตรวจ patch/compatibility ก่อนติดตั้ง |
| Database | Production ใช้ TiDB Cloud (ผู้ดูแลยืนยัน); local/CI ใช้ MySQL 8.4 จริง ต้องยืนยัน HR ว่า TiDB ได้รับอนุญาต หากไม่อนุญาตให้ใช้ Hosted MySQL จริง |
| Auth / Validation | Argon2id, database-backed session token + HttpOnly cookie, Zod |
| QR / Analytics | qrcode (PNG/SVG), Recharts |
| Quality | Vitest, Supertest, Playwright, TypeScript strict, ESLint |
| Source | GitHub **1 Repository** แบบ Monorepo (`frontend/` + `backend/`) |
| Hosting | Vercel **2 Projects** (React static + Express Backend) / Cloud database |

**ต้องยืนยันกับบริษัท:** แม้ React และ Node.js อยู่ในโจทย์ แต่ข้อความ “อย่างใดอย่างหนึ่ง” อาจจำกัดการใช้ร่วมกัน; TiDB เป็น MySQL-compatible แต่ไม่ใช่ MySQL โดยตรง ระบุฐานข้อมูลจริงใน README ห้ามอ้างว่าเป็น MySQL แท้

## 2. Architecture และ Data Flow

- **Frontend:** React SPA ทำฟอร์ม, routes, Dashboard, ตาราง, QR preview, chart, login/logout ด้วย React Functional Components และ Fetch API
- **Backend:** Express Router รับ HTTP → Controller จัด request/response → Service จัด Business Logic → Prisma → MySQL/TiDB
- **Database:** Backend ติดต่อ DB เท่านั้น ห้าม Browser รู้ `DATABASE_URL` หรือ secrets
- **Redirect:** Browser `GET /s/:code` → Express → DB ตรวจ Link/Expiry/Status → insert ClickEvent → HTTP 302 + `Cache-Control: no-store` → Original URL
- **HEAD:** ตรวจลิงก์และตอบสถานะ/Location โดย **ไม่เพิ่มคลิก**
- **QR:** ต้องเก็บ **Short URL** ไม่ใช่ Original URL เพื่อให้การสแกนผ่านระบบ Redirect และนับคลิก
- **ประเภทระบบ:** เป็นแอปสองส่วน Frontend/Backend แต่ Backend ยังคง Modular Monolith **ไม่ใช่ Microservices**

### 2.1 แนวทางโดเมนและ Cookies ที่แนะนำ

เพื่อไม่ให้ระบบ Login ซับซ้อนจาก Cross-Origin Cookies ให้ Frontend public domain เช่น `https://short-demo.example` เป็น `APP_URL` และกำหนด Vercel Rewrites ส่ง `/api/*`, `/s/*`, `/healthz` ไปยัง Backend Express Production Domain โดยคง path และ query เดิม ตรวจว่ากฎ rewrite ไม่ถูก React SPA fallback กลืนก่อน

Browser จึงใช้ `fetch('/api/links')` กับ Same-Origin และ Cookie แบบ Host-only HttpOnly Secure SameSite=Lax ได้ โดยต้องทดสอบ Set-Cookie, Logout, CSRF/Origin, 302, QR และ Cache Header จริงผ่าน Production URL ไม่ใช่สมมติว่า Proxy ทำงานได้โดยอัตโนมัติ

Local: React/Vite `localhost:5173`, Express `localhost:3001`; Vite dev proxy สำหรับ `/api`, `/s`, `/healthz` ไป Express เพื่อให้ API calls และ cookies ทำงานใกล้เคียง Production

## 3. Folder Structure (โปรเจกต์ใหม่เท่านั้น)

```text
short-url-react-node/
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                  # React Router
│   │   ├── pages/                   # Home, Login, Register, Dashboard, LinkDetails
│   │   ├── components/              # CreateForm, History, Analytics, QR, Navigation
│   │   ├── services/api.ts          # fetch helper
│   │   ├── types/api.ts
│   │   └── styles/global.css
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts              # local /api + /s proxy
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── app.ts                  # Express app export for tests/deploy
│   │   ├── server.ts               # local listen only
│   │   ├── routes/                 # auth, links, stats, redirect
│   │   ├── controllers/            # request/response functions
│   │   ├── services/               # auth, links, redirect, qr, stats, rate-limit
│   │   ├── middlewares/            # auth, origin, validation, errors
│   │   ├── lib/                    # prisma, date, config, errors
│   │   └── types/
│   ├── prisma/schema.prisma
│   ├── prisma/migrations/
│   └── package.json
├── docs/diagrams/
├── tests/e2e/
├── .github/workflows/
├── compose.yaml                   # local MySQL only
├── .env.example                   # placeholders only
├── README.md
└── PLAN.md
```

ใช้ชื่อไฟล์ชัดเจนและจำนวนไฟล์ตามความจำเป็น ไม่สร้าง Repository/Service Layer ซ้ำซ้อน หากใช้ root npm workspaces เพื่อสั่งรันสองแอปพร้อมกัน ต้องอธิบายใน README

## 4. Beginner-Friendly JavaScript, React และ TypeScript

### 4.1 JavaScript

ใช้ `const`, `let`, `if/else`, `for`, `function`, arrays/objects, `map/filter/find`, `async/await`, `try/catch`, `fetch`, `import/export` ตามพื้นฐาน ไม่ย่อ Logic หลายขั้นตอนลงบรรทัดเดียว ใช้ชื่อตัวแปรที่สื่อความหมายและคอมเมนต์ภาษาไทยเฉพาะ Business Logic สำคัญ

### 4.2 React

ใช้ Functional Components, Props, `useState`, `useEffect`, Form Handling, Event Handling, Conditional Rendering และ Lists (`key` คงที่) ใช้ React Router สำหรับหน้าต่าง ๆ; ไม่มี Server Components หรือ `"use client"`; ข้อมูลจาก API เก็บ State ใน Components; เมื่อเปลี่ยนตัวกรองเร็วใช้ AbortController หรือกลไกป้องกัน stale response; ไม่ใช้ Redux/Zustand หรือ Custom Hooks/Abstractions ซับซ้อนโดยไม่มีเหตุผล

### 4.3 TypeScript

ใช้ `string`, `number`, `boolean`, `interface`, `type`, optional properties, union types, array/function types และ generic พื้นฐานเช่น `useState<string>()`; เปิด `strict`; ไม่ใช้ `any` ปิด errors; หลีกเลี่ยง advanced generics, conditional types และ meta-programming; ข้อมูล request ต้อง runtime validate (เช่น Zod) ก่อนใช้

### 4.4 Express

ให้เห็น Flow ชัด: `router.post(...)` → Controller → Service → Prisma → JSON; Controller ทำ HTTP ไม่ทำ Query ยาว; middleware ตรวจ session, Origin, rate limit และ validation; Express error middleware กลางตอบ error เหมือนกันทุก API; ใช้ library ด้าน Security ไม่เขียน hashing/crypto/session encryption เอง

## 5. Feature Requirements — เทียบความครบกับ Next.js เดิม

### 5.1 Core (ต้องผ่านก่อน)

1. รับ Original URL เต็มแบบ HTTP/HTTPS และตรวจ Validation
2. สร้าง Short Code แบบสุ่มปลอดภัย 8 ตัว; Unique constraint และ retry หากชน
3. เปิด Short URL `/s/:code` แล้ว HTTP 302 ไปยัง URL ปลายทางจริง
4. สร้าง QR Code ของ Short URL, Preview และดาวน์โหลด PNG/SVG
5. แสดง Original URL + Short URL + วันที่สร้างในประวัติ
6. เก็บ Click Event และจำนวนคลิก/เปิดลิงก์จริง
7. Dashboard ภาษาไทย, Loading/Empty/Error/Success States
8. Responsive 390, 768, 1440px และคีย์บอร์ดใช้งานได้

### 5.2 Additional (ต้องคง scope เพื่อเทียบให้ยุติธรรม)

1. Register / Login / Logout และ Session Management
2. แยกข้อมูลของเจ้าของลิงก์ (Ownership)
3. Custom Alias (ตัวอังกฤษเล็ก ตัวเลข ขีดกลาง 3–32 ตัว; ซ้ำตอบ 409)
4. ตั้ง/แก้วันหมดอายุ, เปิด–ปิดลิงก์
5. ค้นหา Filter และ Pagination
6. Link Details และกราฟคลิกรายวัน (เลือกช่วงวันที่ได้)
7. Sources/referrer hostname และ Device type (desktop/mobile/tablet/unknown)
8. Copy Short URL และสถิติภาพรวม
9. Rate Limiting, Error Handling และ API/Database Security

อย่าตัด Feature เพื่อให้ React + Express ดูง่ายกว่า Next.js หากทำไม่ทันให้รายงาน Remaining Work ตามจริง

## 6. Database / ER Design

คง **5 ตาราง** เหมือนแผนเดิม เพื่อให้เทียบ Architecture ได้อย่างเป็นธรรม

| Table | ฟิลด์หลัก | Relationship / Index |
|---|---|---|
| `users` | uuid, name, email unique, password_hash, created_at | User 1:N Links/Sessions |
| `sessions` | token_hash PK, user_id, expires_at | FK user, expiry index |
| `links` | uuid, user_id, original_url TEXT, code UNIQUE, is_active, expires_at, created_at | FK user, index user_id+created_at |
| `click_events` | uuid, link_id, clicked_at, referrer_host, device_type | FK link, index link_id+clicked_at |
| `rate_limits` | hashed key PK, count, expires_at | index expires_at |

Prisma `provider="mysql"`. ใช้เวลา UTC ใน DB; Analytics แสดงและแบ่งวันตาม Asia/Bangkok; ID เป็น UUID; รัน Migration บน MySQL Development ก่อน แล้วตรวจ DDL/CRUD/Transaction ซ้ำบน TiDB Development; ไม่มีการเปลี่ยน schema ของโปรเจกต์ Next.js เดิม

## 7. Business Logic และ Security

- URL: รับ `http:`/`https:` เท่านั้น จำกัด 8192 characters; รักษา query/fragment; ไม่ฝัง username/password; reject invalid schemes; validate ทั้ง Browser/Backend
- Code: สุ่มด้วย `node:crypto.randomInt` จาก alphabet ปลอดภัย; UNIQUE ของ Database เป็นตัวป้องกัน race จริง; collision code สุ่มใหม่สูงสุด 5 ครั้ง; Alias ชนตอบ 409
- Link: URL เดิมและ Code คงที่หลังสร้าง; เจ้าของแก้เฉพาะสถานะ/วันหมดอายุ; ไม่มี hard delete ในรุ่นแรก
- Redirect: 404 ไม่พบ, 410 ปิด/หมดอายุ, 503 DB ไม่พร้อม; GET บันทึก ClickEvent ก่อน 302; HEAD ไม่เพิ่มยอด; no-store; ไม่ใช้ React Router navigation สำหรับ Short URL
- Analytics: COUNT ClickEvents จริง รวม repeat/bot ไม่ใช่ unique visitors; ลงวันตาม Bangkok และเติมวันไม่มี event เป็น 0; sources จาก referrer hostname เท่านั้น ไม่เก็บ IP หรือ UA เต็มใน ClickEvent
- Auth: Argon2id password hash; session opaque random token โดย hash token ใน DB; cookie HttpOnly Secure (Production HTTPS), SameSite=Lax สำหรับ Proxy Same-origin, TTL 7 วัน; Logout revoke DB row + clear cookie; ไม่ใช้ LocalStorage token
- Security: ตรวจ Origin เทียบ `APP_URL` จาก trusted configuration; validate fields, ownership, max body size, rate limit Login/Register/Create ด้วย DB-backed atomic counters และ HMAC key; no secrets ใน Client/VITE env; production HTTPS/TLS certificate verification
- Concurrency: บันทึก event แต่ละครั้งแทน read-modify-write counter; Redirect await single event insert ก่อน 302 โดยไม่เปิด interactive transaction เพราะ URL/code คงที่และไม่มี hard delete; Auth/rate limits ใช้ transaction สั้น และทดสอบ GET 20 requests พร้อมกัน

## 8. API Contract (Express Router + Controller)

| Method | Path | หน้าที่ / สิทธิ์ |
|---|---|---|
| POST | `/api/auth/register` | สมัครสมาชิก public, validate + rate limit |
| POST | `/api/auth/login` | Login + session cookie public |
| POST | `/api/auth/logout` | Revoke session + clear cookie |
| GET | `/api/auth/me` | ข้อมูลผู้ใช้จาก session |
| POST | `/api/links` | สร้าง Short URL (Login) |
| GET | `/api/links` | ประวัติ/ค้นหา/กรอง/แบ่งหน้าเฉพาะเจ้าของ |
| GET | `/api/links/:id` | Link Details ของเจ้าของ |
| PATCH | `/api/links/:id` | เปลี่ยนสถานะ/expiry; owner + Origin |
| GET | `/api/links/:id/qr?format=png` | QR PNG/SVG, owner |
| GET | `/api/stats` | สถิติรวมพร้อมช่วงวันที่, owner |
| GET | `/api/links/:id/stats` | สถิติรายลิงก์, owner |
| GET | `/s/:code` | Public Redirect 302 |
| HEAD | `/s/:code` | Public headers/status, ไม่เพิ่มคลิก |
| GET | `/healthz` | Health check ไม่เผย secrets |

ใช้ response structure ของแผนเดิม `{ link }`, `{ links, pagination }`, `{ error: { code, message, fields? } }`, 201/200/204/400/401/403/404/409/410/429/503 ให้สอดคล้องกับ Next.js; อย่าเชื่อ `userId` จาก Browser

## 9. UI/UX — Synerry-Inspired Design System

รักษาธีมและองค์ประกอบ UI เดิม ไม่คัดลอก Assets/Logo จริงของ Synerry และไม่ทำให้เข้าใจว่าเป็นผลิตภัณฑ์ทางการ

**Proposed color tokens (ไม่ได้อ้างว่าเป็นสีแบรนด์ทางการทั้งหมด):**

| Token | Hex | Use |
|---|---|---|
| Primary | `#C92720` | Primary CTA / link / graph |
| Primary hover | `#A61F19` | Hover |
| Accent | `#EC2C23` | Small graphic accent, ไม่ใช้เป็นข้อความสีอ่อนบนขาว |
| Text | `#202124` | Body / headings |
| Muted text | `#4B5563` | Secondary text |
| Background | `#F6F7F9` | Page |
| Surface | `#FFFFFF` | Cards/forms |
| Border | `#E5E7EB` | Panels |
| Success / Warning / Danger | `#166534` / `#92400E` / `#B42318` | Semantic states |

Typography: Noto Sans Thai สำหรับ UI ภาษาไทย, Poppins เฉพาะหัวข้อ/ตัวเลขที่เหมาะสม; 16px body/input, 14px labels, 24–28px page titles, panel radius 12px, control radius 8px, control touch target ≥44px; พื้นสว่าง Card ขอบบาง Shadow น้อย; WCAG AA color contrast และ visible keyboard focus

**Pages:**
- Home: Navigation, Hero สั้น, URL Form, Alias/Expiry เพิ่มเติม, Result Copy + QR
- Login/Register: Simple accessible forms, field errors, password manager
- Dashboard: Sidebar/Header, summary 3 Cards, Create Form, History Search/Filter/Pagination, Analytics
- Link Details: Full URL + Short URL, QR PNG/SVG, status, expiry, settings, daily chart, source/device

Mobile 390px: Header compact, cards 1 column, History เปลี่ยนเป็น List; Tablet 768px: Responsive 2/3 columns ตามพื้นที่; Desktop 1440px: Sidebar 224px + content max 1200px; ไม่ให้ URL ยาวล้น viewport; มี Loading/Empty/Success/Error states, copy feedback, Download state, QR สแกนง่าย ขาวดำ quiet-zone ถูกต้อง

ใช้ Tailwind CSS ใน Vite ตามเวอร์ชันที่เลือก, CSS semantic tokens กลาง; Icons เช่น Lucide; Recharts โดยไม่เพิ่ม global state library, headless UI library หรือ animation ที่ไม่จำเป็น

## 10. Testing Strategy

ต้องทดสอบเส้นทางเดียวกับ Next.js เพื่อให้เปรียบเทียบตรงกัน

- Unit: URL/code/date/status/validation/rate-limit rules
- Express + Supertest: Routes, status, validation/auth/origin, fake/expired/forged sessions, ownership
- Integration MySQL/TiDB: Schema/migration, collision concurrency, redirect concurrent 20 GET และ QR/HEAD non-count
- E2E Playwright: Register/Login → Create → Copy → QR PNG/SVG → GET Redirect → History click count → logout; 390/768/1440px
- Production: HTTPS public domain, Vite/Frontend Rewrites, SPA deep-link refresh, cookies session roundtrip, QR บนมือถือ, 302, persistence after redeploy
- CI: typecheck/lint/tests/build **ทั้ง Frontend และ Backend**, Prisma generate; ห้ามรายงานผ่านถ้ายังไม่ได้รันจริง
- เก็บรายงาน env/date/version/commit, passed/failed/skipped/blocked ไม่ใส่ credentials

## 11. Deploy / Environment / README

1. สร้าง GitHub Public Repository **ใหม่** เช่น `short-url-react-node`; อย่าเปลี่ยน Git remote เดิม
2. Deploy Express Backend เป็น Vercel Project Root Directory `backend/`; ตรวจ Express entry/export ตามเอกสารปัจจุบันและว่า serverless function ไม่ใช่ long-running listener
3. Deploy React Vite Static อีก Vercel Project Root Directory `frontend/`; build output `dist`
4. ทำ Rewrites Proxy `/api/*`, `/s/*`, `/healthz` → Backend และ SPA fallback สำหรับ React Router ต้องไม่กลืน public redirect
5. กำหนด Backend `APP_URL` = Frontend Production URL; Database URL, TLS, secrets, cookie/session/rate-limit ต้องเป็น server-only
6. ทดสอบการสร้าง, QR, Redirect, Cookie, Ownership, Analytics บน Public URL; หาก Proxy/Cookie ผิดห้ามอ้างว่าระบบพร้อม Deploy
7. README ภาษาไทยระบุ versions, install, env placeholders, MySQL Docker, TiDB/MySQL, migration, seed, run scripts ทั้งสองแอป, testing, diagrams และ deploy ทีละขั้น
8. ใช้ฐานข้อมูล Development/Preview/Production แยก; ห้าม migrate destructive บน DB ของ Next.js เดิม

### Environment Variables (ตัวอย่างชื่อ; ปรับตามโค้ดจริง)

**Backend server-only**: `DATABASE_URL`, `APP_URL`, `RATE_LIMIT_SECRET`, `SESSION_SECRET` เฉพาะกรณีที่ session library ต้องใช้, `DEMO_EMAIL`, `DEMO_PASSWORD`, DB certificate configuration เมื่อจำเป็น

**Frontend public**: โดย baseline ไม่ต้องมี API secret; ใช้ relative `/api` ผ่าน Proxy เท่านั้น; หากจำเป็นต้องมี `VITE_*` ต้องเป็น public config ที่เปิดเผยได้

## 12. Timeline 3 Days

| วัน | งาน | Acceptance |
|---|---|---|
| Day 1 | React/Vite + Express/TS + Prisma + local proxy; Create URL, Redirect, initial deploy of both projects | สร้างและเปิด Short URL ได้ |
| Day 2 | QR, History/ClickCount, Register/Login/Session/Ownership, Alias, Expiry, Enable/Disable, Responsive | Core Requirements ครบ |
| Day 3 | Analytics, Search/Filter/Pagination, Security and concurrency tests, Production/phone QR, README, Diagrams, Demo | ส่ง Repo + URL + เอกสารพร้อม |

จัดเวลาทดสอบ/เอกสารก่อน UI polish; ถ้าฟีเจอร์เสริมไม่ทัน ให้รายงาน Remaining Work ไม่อ้างว่าเสร็จ

## 13. Deliverables / Developer Learning / Comparison

**Deliverables:** Public Repo ใหม่ (1 repo/2 apps); Online Frontend URL; Demo credentials ช่องทางปลอดภัย; README; Prisma migrations; DFD Level 0; ER Diagram; Architecture Diagram (Frontend Vercel + Backend Vercel + DB); tests/evidence; Demo ≤30 นาที

**AI ต้องอธิบายหลังแต่ละฟังก์ชัน:**
1. ไฟล์ที่สร้างและหน้าที่
2. Input/Output และ React `useState`/event/`fetch`
3. Express Router → Controller → Service → Prisma → DB ทำงานอย่างไร
4. JavaScript/TypeScript Concepts ที่ใช้จริง
5. Error Handling, Auth, Validation, Transactions/Concurrency สำคัญอย่างไร
6. วิธีทดสอบและผลจริง
7. คำถามสัมภาษณ์ 2–3 ข้อและแนวตอบ

**Comparison Checklist กับ Next.js ที่ต้องใช้หลังพัฒนาครบ:** ทั้งสองโปรเจกต์มีฟีเจอร์และ Acceptance Tests เหมือนกันหรือไม่; จำนวนไฟล์/บรรทัดที่ต้องดูแล; ความง่ายในการอธิบายแต่ละ flow; เวลาแก้ error; การตั้งค่า/Deploy/Hosting; Session/Cookies; ค่าใช้จ่าย; ความปลอดภัย; ผล tests จริง; ความพร้อมนำเสนอภายใน 30 นาที

## 14. กติกาการเริ่มสร้างโปรเจกต์จากไฟล์นี้

- ก่อนลงมือ ให้สร้างโฟลเดอร์ใหม่ `D:\Projects-Short-URL\short-url-react-node` และนำเอกสารนี้ไปไว้ที่ `PLAN.md` ในโฟลเดอร์ใหม่นั้น
- ตรวจ `pwd`/Active Workspace ให้ตรงโฟลเดอร์ใหม่; ไม่ใช้ `D:\Projects\short-url-demo` เป็น cwd และห้ามแก้ `PLAN.md` เดิมหรือไฟล์ Next.js เดิม
- ให้ AI พัฒนาตามแผนทีละ Phase ต่อเนื่อง; เริ่ม Core → QR/History → Auth/Extras → Test/Docs/Deploy
- ไม่ย้าย `.env` หรือคัดลอก secrets ของ Next.js; ใช้ฐานข้อมูลแยกหรืออย่างน้อย database schema/namespace ที่แยกจริง พร้อม credentials ตามสิทธิ์
- ถ้าติดข้อจำกัดต้องใช้ user action/credential ให้รายงาน blocker โดยทำส่วนที่ทำได้ต่อและไม่เดาผลทดสอบ
- ไม่มีการ Commit/Push/Deploy จนกว่าจะมีคำสั่งให้เริ่ม Implementation และสิทธิ์เข้าถึงที่เหมาะสม

**End goal:** React + Node.js/Express Short URL ที่ฟังก์ชันและ UI เทียบเท่าระบบ Next.js ปัจจุบัน แต่เขียนแบบ Beginner-Friendly TypeScript เพื่อให้ผู้พัฒนาอ่าน เข้าใจ และอธิบายเองได้ พร้อมแยกโปรเจกต์เดิมอย่างปลอดภัย
