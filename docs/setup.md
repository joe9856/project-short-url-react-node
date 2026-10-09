# ตั้งค่า Environment และฐานข้อมูล

## ขอบเขตและข้อกำหนด

รันคำสั่งจากโฟลเดอร์ repository ที่มี root `package.json` หลัง clone ใช้ `cd project-short-url-react-node` ส่วน workspace บนเครื่องนี้อยู่ที่ `D:\Projects-Short-URL\short-url-react-node` ใช้ Node 22.12+ สาย LTS 22 และ MySQL 8.4 แยกจากโปรเจกต์อื่นทั้ง port, data directory, user, password และ database ห้ามนำ credentials หรือ `.env` ของโปรเจกต์อื่นมาใช้

## Backend environment

คัดลอก root `.env.example` ไป `backend/.env` ครั้งแรกเท่านั้น:

| ชื่อ | ตัวอย่าง/หน้าที่ |
|---|---|
| DATABASE_URL | `mysql://short_url:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:3308/short_url_react_node` |
| APP_URL | `http://localhost:5173` ใน local; public frontend origin แบบ HTTPS ใน production |
| RATE_LIMIT_SECRET | random อย่างน้อย 32 ตัว ใช้ HMAC ของ rate-limit identity |
| PORT | `3001` |
| NODE_ENV | `development`, `test`, `production` |
| DEMO_EMAIL / DEMO_PASSWORD | ไม่บังคับ ใช้เฉพาะ seed บัญชีที่กำหนดเอง |

สร้าง random ด้วย `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` แล้วเก็บเฉพาะใน server environment ไม่ต้องมี `SESSION_SECRET` เพราะ session เป็น opaque random token; DB เก็บ SHA-256 ของ token การ hash password ใช้ Argon2id ห้ามเก็บ secret ใน `VITE_*` หรือ LocalStorage

## Docker MySQL สำหรับเครื่องทั่วไป

กำหนด MYSQL_PASSWORD และ MYSQL_ROOT_PASSWORD ใหม่ใน environment ของ terminal แล้ว:

```powershell
docker compose up -d
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate
```

Compose bind เฉพาะ loopback port 3308 และใช้ volume ชื่อเฉพาะ compose project นี้ สร้าง test database ด้วย admin ผ่าน MySQL client:

```sql
CREATE DATABASE short_url_react_node_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON short_url_react_node_test.* TO 'short_url'@'%';
```

Docker สร้าง user ที่ host `%`; portable Windows ใช้ host `127.0.0.1` ให้ GRANT ตรงกับ user ที่สร้าง อย่าให้ test runner เข้าฐานข้อมูล production

## Portable MySQL บน Windows เครื่องนี้

Docker daemon ไม่พร้อมในช่วงพัฒนา จึงใช้ MySQL Community 8.4.11 binary distribution สำเนาอิสระใน `.runtime/mysql/mysql-8.4.11-winx64` กับข้อมูลใหม่ใน `.runtime/mysql-data` ไม่ได้คัดลอกข้อมูลเดิม ใช้ UTC, loopback 3308 และปิด MySQL X port เพื่อไม่ชนกับ server อื่น

Setup ทำครั้งแรกแล้ว: ฐานข้อมูล `short_url_react_node` และ `short_url_react_node_test`, user ใหม่, root password ใหม่ และ `backend/.env` ใหม่ ไฟล์ root credential อยู่ `.local/mysql-admin.json` ที่ถูก ignore อย่ารัน initialization ซ้ำหรือเผยแพร่ runtime/data

หลังเปิดเครื่องใหม่:

```powershell
cd D:\Projects-Short-URL\short-url-react-node
node scripts/mysql-control.mjs start
node scripts/local.mjs run db:migrate
node scripts/local.mjs run dev
```

ปิดด้วย `node scripts/mysql-control.mjs stop` ตัว helper ใช้หน้าต่างซ่อนและ log ใน `.local/mysql-server.log` หาก start ไม่สำเร็จตรวจ port/log ก่อน ห้ามฆ่า MySQL ของโปรเจกต์เดิม

สำหรับ Windows ใหม่ที่ไม่มี Docker ให้ดาวน์โหลด binary distribution MySQL 8.4 จาก Oracle และวางตาม path นี้ จากนั้น `node scripts/setup-local-mysql.mjs` จะปฏิเสธการเขียนทับ `.env` และ data directory เดิม `--finish` เป็นตัวช่วยกู้การตั้งค่าครั้งแรกเมื่อ initialization สำเร็จแต่ start server ยังไม่สำเร็จ ไม่ใช่คำสั่งใช้งานประจำ

## TiDB Cloud หรือ Hosted MySQL

Production ของระบบนี้ใช้ **TiDB Cloud** ตามข้อมูลที่ผู้ดูแลยืนยันวันที่ 9 ตุลาคม 2026 ส่วน local และ GitHub Actions ใช้ **MySQL 8.4** Prisma ใช้ `provider = "mysql"` ทั้งสองกรณี แต่ TiDB เป็นฐานข้อมูล MySQL-compatible จึงต้องยืนยันกับบริษัทก่อนส่งว่าใช้แทน MySQL ตามโจทย์ได้

บน Vercel หาก `DATABASE_URL` ไม่ระบุ `connection_limit`/`pool_timeout` โค้ดตั้ง defaults เป็น 3 connections ต่อ instance และรอ pool 30 วินาที ค่าที่ผู้ดูแลระบุเองยังมีผล และ URL/TLS/credentials ไม่ถูกเปลี่ยน ช่วยควบคุมจำนวน connections และลดโอกาส pool timeout ระหว่าง batch requests ดู [Prisma ORM v6 connection pool](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections/connection-pool) ค่าที่เหมาะสมต้องสัมพันธ์กับ quota ของ DB และจำนวน Vercel instances

สร้าง service/database และ credentials ใหม่ของโปรเจกต์นี้ เลือก region ใกล้ backend และตั้ง IP/access policy ให้เหมาะสม ตามแผนต้องยืนยัน HR ว่า TiDB ใช้ได้ TiDB ใช้ connector `mysql` แต่ README ต้องเรียกฐานข้อมูลตามจริง

เก็บ connection string ใน backend เท่านั้น encode ตัวอักษรพิเศษใน user/password เพิ่ม `sslaccept=strict` และ CA parameters ตามผู้ให้บริการ ใช้ certificate verification จริง ห้ามตั้ง `rejectUnauthorized=false` หรือ `sslaccept=accept_invalid_certs` production แยก development/preview/production

ตัวอย่าง placeholder:

```text
mysql://NEW_USER:ENCODED_PASSWORD@NEW_HOST:4000/short_url_react_node?sslaccept=strict&connection_limit=5&pool_timeout=10
```

port และ CA แตกต่างตามผู้ให้บริการ ไม่ใช่ credentials ใช้จริง ดู [TiDB connection documentation](https://docs.pingcap.com/tidbcloud/connect-via-standard-connection/) และ [Prisma MySQL connector](https://www.prisma.io/docs/orm/overview/databases/mysql)

เว็บ production เชื่อมฐานข้อมูลและทำ auth/CRUD/redirect/analytics ผ่าน public HTTPS ได้จริง รายละเอียดอยู่ `verification.md` ไม่ได้ดาวน์โหลด production credentials หรือรัน migration บน cloud จากเครื่องนี้ ผล MySQL integration และผล API ออนไลน์จึงเป็นคนละชุดหลักฐาน การตรวจ connection string/TLS options ภายในผู้ให้บริการต้องทำจากบัญชี Vercel/TiDB ของผู้ดูแล

## Render diagrams ซ้ำ

Mermaid source อยู่ใน `docs/diagrams/` และไฟล์ SVG/PNG ที่ render แล้วอยู่ข้างกัน ไม่ต้องติดตั้งอะไรเพื่ออ่าน source หรือเปิดภาพ หากต้องการ render ใหม่บนเครื่องอื่น ติดตั้งเครื่องมือแยกจาก application:

```powershell
npm.cmd install --prefix .runtime/diagrams mermaid@11.17.2 --cache .cache/npm
npm.cmd run docs:diagrams
```

Windows ใช้ Edge ที่ติดตั้งอยู่; Linux ใช้ Chromium จาก Playwright (`npx playwright install chromium`) ตัว renderer ใช้ loopback server ชั่วคราวและปิดเมื่อเสร็จ ไม่เรียกบริการ render ภายนอก

## Database maintenance

มี 5 business tables และ `_prisma_migrations` ที่ Prisma จัดการ `ClickEvent` ไม่มี IP/UA เต็ม; rate-limit key เป็น HMAC ของ identity สามารถลบ sessions/rate_limits ที่หมดอายุเป็นครั้งคราวด้วยงานดูแลฐานข้อมูล ไม่ลบ click history โดยไม่มีนโยบาย retention และการอนุมัติที่เหมาะสม

## ปัญหาที่พบบ่อย

- POST 403: ตรวจ APP_URL กับ address bar ต้องเป็น origin เดียวกัน รวม port; เครื่องนี้ใช้ localhost ไม่ใช้ 127.0.0.1 ใน browser
- API 503: ตรวจ MySQL port 3308, credentials ใหม่, migration และ network policy
- `npm.ps1` ถูกบล็อก: ใช้ `npm.cmd`
- Node เครื่องเป็น 20: เครื่องนี้ใช้ `node scripts/local.mjs ...` เพื่อเลือก runtime 22 เฉพาะโปรเจกต์
- ENOSPC บน C:: ใช้ cache/temp ใน `.cache` และ `.runtime/tmp` ตาม local helper
- E2E แจ้ง port ใช้อยู่: ปิด dev server ก่อน Playwright จะเริ่ม server ใหม่กับ test DB เอง
- `prisma migrate dev` ต้องมีสิทธิ์สร้าง shadow database: ใช้ credential ของ local development ที่มีสิทธิ์นี้ หรือกำหนด shadow database ใหม่แยก ห้ามให้สิทธิ์สร้าง/ลบฐานข้อมูลแก่ production runtime เพื่อความสะดวก
