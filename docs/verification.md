# ผลตรวจจริง

ตรวจวันที่ **9 ตุลาคม 2026 (Asia/Bangkok)** แยกหลักฐาน local, GitHub Actions และ production HTTPS เพื่อไม่ใช้ผลชุดหนึ่งอ้างแทนอีกชุดหนึ่ง Production ใช้ **TiDB Cloud** ตามข้อมูลผู้ดูแลที่ยืนยัน ไม่ใช่ MySQL แท้ ส่วน local/CI ใช้ **MySQL 8.4**

## ผลออนไลน์และ CI ล่าสุด

- Frontend: https://project-short-url-react-node.vercel.app
- Backend: https://project-short-url-react-node-osq6.vercel.app
- Public GitHub: https://github.com/joe9856/project-short-url-react-node
- Application commit ที่ตรวจหลังแก้: `818575739598e8bbc25b0522195d4c476d7ee7dd`
- [GitHub Actions ที่ผ่านหลังแก้](https://github.com/joe9856/project-short-url-react-node/actions/runs/37946667118): typecheck/lint/unit/build/MySQL integration/Playwright Chromium ทุกขั้นสำเร็จบน Linux
- [สถานะ CI ของ main ล่าสุด](https://github.com/joe9856/project-short-url-react-node/actions/workflows/ci.yml) และ badge ใน README อัปเดตตาม push ถัดไป ส่วน run URL ด้านบนเป็นหลักฐานของ application commit ที่ระบุ
- ตรวจซ้ำหลังแก้ serverless redirect: **33/33 tests** รวม regression ของ event insert failure, HEAD และการรักษา TLS/pool parameters
- TypeScript/lint/build ผ่าน; MySQL integration **13/13** และ Playwright Edge **6/6** ที่ 390/768/1440px ผ่านหลังแก้; actual DB outage GET/HEAD ยังคง 503/no-store/no Location
- ตรวจ production ผ่าน HTTPS: health, สมัครสมาชิก, login/me/logout/revoked session, Secure/HttpOnly/SameSite=Lax cookie, create, 302/query/fragment/no-store, HEAD non-count, QR PNG decode/SVG, history/click stats และ enable/disable ผ่าน
- API ออนไลน์หลัง deploy โค้ดแก้: **20 concurrent GET = 20 persisted clicks**, source/device/daily Bangkok ตรงกัน, alias ซ้ำ 409, ปิด/หมดอายุจริง 410, ล้าง expiry แล้ว HEAD กลับเป็น 302 และ wrong/missing Origin ถูกบล็อก
- เปิดหน้า Frontend production ผ่าน in-app browser ได้จริง ฟอร์มและ navigation แสดงหลังโหลดข้อมูล ส่วน flow ที่ล็อกอินตรวจผ่าน API ออนไลน์และ browser E2E ใน CI

หลักฐาน API ออนไลน์ที่เก็บซ้ำด้วย `npm run verify:online` อยู่ [production.json](evidence/production.json) ไม่มี credentials และเป็นการตรวจ API/HTTP ไม่ใช่การสแกนจากโทรศัพท์หรือ manual browser audit

## Persistence หลัง redeploy

เก็บ snapshot ของลิงก์และ session ระหว่าง deployed commit `8185757` แล้วตรวจหลังทั้ง Frontend/Backend deploy commit `e055234` สำเร็จ โดยใช้ cookie เดิม ไม่ได้ล็อกอินใหม่ก่อนตรวจ session:

- Session ที่ออกก่อน deploy ยังอ่าน `/api/auth/me` ได้และเป็น user เดิม
- ID/code/Original URL/Short URL ของลิงก์เดิมตรงกัน และยอดคลิก **20 ก่อน / 20 หลัง**
- HEAD ของ Short URL เดิมยังตอบ 302 โดยไม่เพิ่มคลิก และ revoke test session หลังตรวจ

หลักฐานไม่มี cookie/credentials: [persistence.json](evidence/persistence.json)

## ผล local เดิม

ผล local ด้านล่างมาจาก Windows ใช้ Node.js **22.23.3** ใน `.runtime/`, MySQL Community 8.4.11 บน loopback port 3308 และ Microsoft Edge headless ชุดทดสอบใช้ `short_url_react_node_test` แยกจาก development และโปรเจกต์อื่น

## ผลสำเร็จ

| สิ่งที่รันจริง | ผล |
|---|---|
| Prisma Client generate 6.19.3 | ผ่าน รวมหลัง override dependency |
| Initial migration บน development และ test DB ใหม่ | ผ่าน |
| migrate deploy ซ้ำ | ไม่มี pending migration ไม่ลบข้อมูล |
| TypeScript strict frontend/backend | ผ่านทั้งสองแอป |
| ESLint source/scripts/tests | ผ่านหลังแก้ globals ของ browser rendering helper |
| Vitest/Supertest/React forms `npm test` | **29/29** ใน 5 files ผ่าน |
| MySQL integration `npm run test:mysql` | **13/13** ผ่าน |
| Playwright Edge `npm run test:e2e` | **6/6** ผ่าน: 2 scenarios × 390/768/1440px |
| Frontend production build | ผ่าน มี chunks แยก React/Charts ไม่มี large-chunk warning ใน final build |
| Backend production build | Prisma generate + TypeScript compile ผ่าน |
| Actual connection outage `npm run test:outage` | health GET, short GET และ HEAD เป็น 503/no-store/no Location และไม่เผย credentials |
| Production dependency audit | **0 known advisories** ณ วันที่ตรวจ หลัง update Router และ override deepmerge-ts |
| Mermaid render | DFD/ER/Architecture สร้าง SVG/PNG สำเร็จ และตรวจภาพที่ render แล้ว |
| Local demo seed | สร้างบัญชีใหม่, รันซ้ำไม่เปลี่ยน credentials และตรวจ Login/Me/Logout/revoked session ผ่าน |

หลักฐาน machine-readable: [unit/React/API](evidence/unit.json), [MySQL](evidence/mysql.json), [browser](evidence/e2e.json), [production audit](evidence/audit-production.json), [source inventory](evidence/source-inventory.json)

รายละเอียดเวอร์ชันอยู่ [environment.json](evidence/environment.json) และรายการไฟล์ที่สร้างอยู่ [files-created.json](evidence/files-created.json)

ไฟล์ `unit.json`, `mysql.json`, `e2e.json` และ screenshots เป็นหลักฐาน local จากช่วงพัฒนา ไม่ใช่ผล TiDB production ผล CI มี run URL/commit และผล API production มี `production.json` แยกไว้ด้านบน

## Backend ที่ตรวจ

- รับ HTTP/HTTPS เท่านั้น ปฏิเสธ embedded credentials/schemes ผิด; query/fragment เดิมยังอยู่
- ยอมรับ URL ภาษาไทยเต็ม 8192 ตัวและ serialize Unicode Location ถูกต้อง
- crypto code 8 ตัว, mock DB collision retry/stop 5 ครั้ง และ alias race จริง 20 requests สำเร็จ 1/409 อีก 19
- Argon2id password, session token hash, HttpOnly/SameSite cookie, invalid credentials/fake/forged/expired/revoked sessions
- owner อื่นอ่านรายละเอียด/QR/stats/PATCH ไม่ได้ ประวัติและสถิติรวมไม่เห็นข้อมูลคนอื่น
- **20 concurrent GET redirects = 20 committed click events** ไม่มี lost count
- HEAD/QR preview/download ไม่เพิ่มคลิก; PNG decode เป็น short URL จริง; SVG content-type และ filename
- search/filter/pagination, enable/disable/expiry, 404/410/no-store และ immutable URL/code
- Bangkok midnight ที่ 16:59:59Z และ 17:00:00Z อยู่คนละวัน เติมวันว่าง 0
- referrer hostname ไม่เก็บ query/path, device category ไม่เก็บ full UA/IP ใน ClickEvent
- Origin ผิด/ไม่มี Origin 403, malformed JSON 400, oversized body 413, structured errors
- atomic rate-limit 20 requests ยอมรับ 5, expiry reset และ HTTP login request ที่ 21 เป็น 429 พร้อม Retry-After
- database connection failure จริงทำให้ health/GET/HEAD เป็น 503; unit failure path ไม่ตอบ 302 เมื่อ event insert ล้มเหลว

## Browser ที่ตรวจ

สมัคร → dashboard empty state → create พร้อม alias/expiry → copy และอ่าน clipboard → QR โหลดจริง → download PNG/SVG → public redirect ไป local destination ที่มี query/fragment/URL ยาว → history 1 click → details/analytics → disable 410 → enable/clear expiry → refresh persistence → dashboard → logout → protected route ไป login → login กลับได้

ทำทั้ง 390×844, 768×1024, 1440×1000 ตรวจ document overflow ของ details/dashboard ด้วย URL ยาว ไม่พบ JavaScript page errors ใน final run ทดสอบ skip-link keyboard focus และ login error ที่รักษาค่าช่องกรอกไว้

Screenshots มาจากข้อมูลทดสอบ localhost จริง ไม่ใช่ production/customer data:

- [Home 1440](screenshots/home-1440.png)
- [Dashboard 1440](screenshots/dashboard-1440.png)
- [Dashboard 390](screenshots/dashboard-390.png)
- [Details 768](screenshots/details-768.png)
- [Details 390](screenshots/details-390.png)

## ข้อผิดพลาดที่พบและแก้

1. Vite proxy `/s` จับ `/src/main.tsx` ด้วย ทำให้หน้าเปล่า แก้เป็น `/s/` ตาม path boundary
2. Logout เปลี่ยน state/navigate พร้อม route guard จนบางครั้งไป login แก้เป็น revoke + clear cookie แล้ว full navigation กลับ `/` เพื่อล้าง private state
3. Unicode ใน HTTP Location ต้อง serialize URL ก่อนตั้ง header; เพิ่ม MySQL test และปรับ body limit เป็น 40 KiB เพื่อรองรับ URL ภาษาไทยตาม character limit
4. Prisma tooling มี deepmerge-ts advisory และ Router version แรกมี advisories อัปเดต React Router เป็น 7.18.4 และ override/pin deepmerge-ts 8.0.2 คง Prisma 6.19.3 แล้ว generate/build/migrate/integration/browser ซ้ำ
5. C: เต็มและบางรอบมี memory pressure จัด npm cache/temp ลง D: และรัน browser tests แยกจาก checks อื่น รอบที่ล้มเหลวไม่นับว่าผ่าน Final isolated browser run ผ่าน 6/6; final lint รันหลัง browser ปิด
6. Production batch 20 GET บน application commit `a667969` มีบางคำขอตอบ 503 และเก็บได้ 16 clicks: เก็บผลก่อนแก้ใน `evidence/production-before-fix.json` ปรับ redirect ให้ await single event insert โดยไม่ถือ interactive transaction และตั้ง Vercel pool defaults เป็น 3 connections / wait 30 seconds หาก connection string ไม่ได้ระบุค่าเอง หลัง deploy `8185757` ตรวจซ้ำผ่าน **20/20 redirects และ 20 clicks** ตาม `production.json` โดยไม่มี 503 ใน batch นี้ ไม่ได้อ้างผล unit/MySQL แทน production
7. [CI รอบเอกสาร `e055234`](https://github.com/joe9856/project-short-url-react-node/actions/runs/37947482756) ล้มเหลวที่ alias concurrency ด้วย `read ECONNRESET` แม้ unit/build/redirect concurrency ผ่าน: Supertest agent ที่ผูก app กับ ephemeral server อาจปิด listener เมื่อ request แรกจบ แก้ให้ MySQL suite เปิด HTTP server เดียวก่อน tests และปิดหลัง suite ยังยิงพร้อมกัน 20 requests จริงและตรวจ 1 success / 19 conflicts ตามเดิม ผลหลังแก้ในเครื่องผ่าน **13/13** ไม่ใช้ retry เพื่อกลบผลล้มเหลว ดู CI ของ main ล่าสุดผ่านลิงก์ด้านบน

## ยังไม่ตรวจ / สิ่งที่ต้องมีเพิ่ม

- ค่า database TLS options/DDL ภายใน Vercel/TiDB: ไม่ได้เข้าถึงบัญชีผู้ให้บริการหรือ production connection string การระบุชนิด DB อ้างข้อมูลที่ผู้ดูแลยืนยัน ส่วน DB operations ยืนยันด้วย API ออนไลน์ ค่า pool ใน code มี default แต่ให้ค่าของผู้ดูแลใน connection string มาก่อน
- การยอมรับ TiDB Cloud แทน MySQL ตามโจทย์: ต้องยืนยันกับบริษัท
- Manual production browser audit: รอบนี้ตรวจ HTTP/HTML/API; browser E2E ใน CI ใช้ test MySQL ไม่ใช่ production
- สแกน QR จากโทรศัพท์จริง ภาพ decode ด้วยโปรแกรมและ browser download ผ่านแล้ว
- Manual screen-reader audit, user research, load test ระยะยาว และ cost benchmark ยังไม่ได้ทำ

ระบบออนไลน์ผ่านการตรวจ API จริงแล้ว และ CI ของ application commit ผ่านตามลิงก์ด้านบน งานที่ยังไม่ตรวจระบุแยกไว้ ไม่ใช้ QR decode อ้างแทนการสแกนโทรศัพท์หรือใช้ผล API อ้างแทนการตรวจค่า TLS ภายใน provider
