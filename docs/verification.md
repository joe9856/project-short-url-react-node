# ผลตรวจจริง

ตรวจวันที่ **9 ตุลาคม 2026 (Asia/Bangkok)** บน Windows ใช้ Node.js **22.23.3** ที่ติดตั้งแยกใน `.runtime/`, MySQL Community 8.4.11 ใหม่บน loopback port 3308 และ Microsoft Edge headless ชุดทดสอบใช้ฐานข้อมูล `short_url_react_node_test` แยกจาก development และ Next.js เดิม

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

เป็นผลจาก local working files ไม่มี commit SHA เพราะยังไม่ได้ commit ตามเงื่อนไขผู้ใช้ ไม่ใช่ผลจาก GitHub Actions, Vercel หรือ TiDB ของโปรเจกต์ใหม่

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
- database connection failure จริงทำให้ health/GET/HEAD เป็น 503; unit failure path ไม่ตอบ 302 เมื่อ transaction ล้มเหลว

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

## ยังไม่ตรวจ / สิ่งที่ต้องมีเพิ่ม

- Cloud DB ใหม่ของโปรเจกต์นี้: ยังไม่มี credentials จึงยังไม่ได้ทดสอบ TiDB/hosted MySQL TLS/DDL/transactions จริง
- GitHub Actions บน Linux: เตรียม workflow แล้ว ยังไม่มี repository ใหม่ให้รัน
- Vercel 2 projects: มี entry/config/rewrites แต่ placeholder backend hostname ต้องยืนยันและแก้ก่อน deploy
- HTTPS production cookie/proxy roundtrip, redirects/cache headers, SPA deep link refresh และ persistence หลัง redeploy
- สแกน QR จากโทรศัพท์จริง ภาพ decode ด้วยโปรแกรมและ browser download ผ่านแล้ว
- Manual screen-reader audit, user research, load test ระยะยาว และ cost benchmark ยังไม่ได้ทำ

ไม่ควรนำผล local หรือ configuration มาอ้างว่า production deploy ผ่าน สามารถเริ่มใช้งาน local และอ่านโค้ด/สาธิตระบบได้แล้ว
