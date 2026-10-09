# อ่านโค้ดและเตรียมสัมภาษณ์

ระบบนี้แยก React SPA กับ Express API; backend เป็น modular monolith ไม่ใช่ microservices มี database เดียวกับ 5 business tables แต่ละ service เป็น function ธรรมดา ไม่มี class controller, dependency injection หรือ repository layer

## 1. สมัครสมาชิกและ session

**ไฟล์:** frontend `pages/Auth.tsx`, backend `routes/auth.ts`, `controllers/auth.ts`, `services/auth.ts`, `middlewares/auth.ts`

Input คือ name/email/password; `useState` เก็บค่าช่องกรอก `onChange` ปรับ state และ `onSubmit` เรียก `preventDefault()` ก่อนส่ง JSON ด้วย Fetch เมื่อสำเร็จส่ง user กลับ App แล้วเปลี่ยน route ไป dashboard ไม่เก็บ token ใน state หรือ LocalStorage

Router ต่อ rate limiter ก่อน Controller ซึ่ง Zod parse body แล้วส่งให้ Service ทำ Argon2id hash จากนั้น Prisma transaction สร้าง user กับ session พร้อมกัน DB เก็บ hash ของ random token; Controller ส่ง raw token เฉพาะ HttpOnly cookie อายุ 7 วัน Login ตรวจ password, Me อ่าน session, Logout ลบแถวและ clear cookie ก่อน reload หน้าเพื่อทิ้ง private state

**แนวคิด:** object, async/await, try/catch, basic interface, React props/event/state, transaction และ middleware

**ผลตรวจ:** MySQL tests ตรวจ password hash, token hash, cookie flags, login ผิด, fake/expired/revoked session; browser ตรวจสมัคร/ออก/เข้าใหม่ครบ 3 viewports

**สัมภาษณ์:**

- ทำไมไม่ใช้ LocalStorage? JavaScript อ่านได้โดยตรง ขณะที่ HttpOnly ลดการเข้าถึง token จาก JS จึงยังต้องมี Origin/CSRF protection เพราะ browser ส่ง cookie อัตโนมัติ
- ทำไม hash token ทั้งที่สุ่มมาแล้ว? ลดผลกระทบหาก session table รั่ว ผู้โจมตีนำ hash ไปใช้เป็น cookie ไม่ได้
- สมัครแล้วสร้าง session ล้มเหลวทำอย่างไร? transaction rollback user/session พร้อมกัน ไม่ทิ้งบัญชีครึ่งขั้นตอน

## 2. สร้างลิงก์และ custom alias

**ไฟล์:** `components/CreateForm.tsx`, `services/api.ts`, backend `routes/links.ts`, `controllers/links.ts`, `services/links.ts`, `lib/validation.ts`

Input คือ originalUrl, alias optional และ expiry; output `{ link }` มี shortUrl/clicks/status UI แสดง loading/error/success ผ่าน state การเลือก datetime-local แปลเป็น `+07:00` ก่อนส่ง ISO UTC

Router ตรวจ session จึงได้ userId จาก server; Controller validate; Service สร้าง code จาก crypto.randomInt 8 ตัว และ Prisma insert ตาราง links UNIQUE ของ DB เป็นตัวตัดสิน race ถ้าสุ่มชน retry สูงสุด 5 ครั้ง ถ้า alias ชนตอบ 409 ไม่สุ่มเปลี่ยนชื่อที่ผู้ใช้เลือก

**แนวคิด:** for loop, if/else, object optional fields, async/await และ database constraint ไม่มีการตรวจ `findUnique` ก่อนสร้างแล้วถือว่าปลอด race

**ผลตรวจ:** unit ตรวจ schemes, credentials ใน URL, alias, expiry, length และ retry; MySQL ตรวจ 20 alias requests สำเร็จ 1/409 อีก 19

**สัมภาษณ์:**

- ทำไม crypto แทน Math.random? ต้องการ random ที่เหมาะกับรหัส public และไม่คาดเดาง่าย
- ตรวจว่ารหัสว่างก่อน insert พอไหม? ไม่พอ อีก request อาจ insert ระหว่างตรวจ ต้อง UNIQUE + catch/retry
- ทำไม validate backend ซ้ำ? client แก้หรือข้ามได้ validation ที่ browser ช่วย UX ส่วน server รักษากฎจริง

## 3. Public redirect และ click tracking

**ไฟล์:** backend `routes/redirect.ts`, `controllers/redirect.ts`, `services/redirect.ts`, `services/links.ts`

Input คือ code, method, Referer และ User-Agent; output 302 Location หรือ 404/410/503 Router → Controller → Service → Prisma อ่านลิงก์และตรวจสถานะ/expiry แล้ว GET await event insert ที่ commit แล้วก่อน 302 Controller serialize URL เพื่อใช้ Unicode ใน Location ได้และตอบ no-store; HEAD ตรวจเหมือนกันแต่ไม่ insert

Redirect ไม่เปิด interactive transaction ระหว่างอ่านและเขียน เพราะ URL/code แก้ไม่ได้ ไม่มี API hard delete และ FK ป้องกัน event ที่ไม่มีลิงก์ แต่ละ event เป็น write แยกที่ atomic จึงไม่เสียยอดจาก counter race ลดเวลาถือ connection บน serverless และยังไม่ตอบ 302 หาก event insert ล้มเหลว Auth และ rate limits ยังใช้ transaction ตามเดิม

จำนวนคลิกมาจาก COUNT event จริง ไม่มีฟิลด์ click counter แบบอ่านแล้วบวกแล้วเขียน จึงไม่เกิด lost updates ระหว่าง 20 requests ยอดรวมการเปิดซ้ำและบอตด้วย ไม่อ้างเป็น unique visitor Referer เก็บเฉพาะ hostname; UA ใช้จัด device category แล้วทิ้ง ไม่เก็บ IP/UA เต็มใน click_events

**ผลตรวจ:** 20 simultaneous GET ได้ event ครบ 20; HEAD/QR ไม่เพิ่ม; disabled/expired 410; unknown 404; unit failure path ไม่ส่ง Location เมื่อ DB ล้มเหลว

**สัมภาษณ์:**

- ทำไมบันทึกก่อน 302? ถ้าตอบก่อน serverless runtime อาจหยุดจน event หาย ต้องยืนยัน commit ก่อนตอบ
- ทำไม no-store? cache 302 อาจทำให้ browser ไม่ผ่านระบบครั้งถัดไป จึงไม่นับคลิกและไม่ตรวจสถานะใหม่
- 302 กับ 301 ต่างอย่างไรในกรณีนี้? ใช้ temporary redirect เพื่อไม่ให้ client จำ destination ถาวรเมื่อระบบต้องตรวจสถานะและบันทึกทุกครั้ง

## 4. QR และคัดลอก

**ไฟล์:** `components/LinkResult.tsx`, backend `controllers/links.ts`, `services/qr.ts`

Input คือ id, format png/svg และ download flag; owner ต้องผ่าน session และ ownedLink ก่อน qrcode encode shortUrl ไม่ encode originalUrl UI โหลด preview จาก authenticated same-origin image endpoint และดาวน์โหลดเป็น Blob/object URL แล้ว revoke หลังใช้เสร็จ คัดลอกใช้ Clipboard API พร้อม feedback และ error recovery

**ผลตรวจ:** test decode PNG ด้วย jsQR ได้ short URL จริง; browser โหลด QR/download ทั้ง PNG SVG และอ่าน clipboard จริง; ownership ของ QR ตรวจใน MySQL tests

**สัมภาษณ์:**

- ทำไม QR ใส่ original URL ไม่ได้? จะข้าม redirect/expiry/tracking ของระบบ
- ทำไมต้องมี quiet zone? เว้นพื้นที่ขาวรอบ QR เพื่อให้ตัวอ่านแยกขอบได้ ใช้ qrcode margin 4
- ดาวน์โหลดเพิ่มคลิกไหม? ไม่เพิ่ม การเปิด `/s/:code` ด้วย GET เท่านั้นเพิ่ม click event

## 5. ประวัติ ค้นหา และการตั้งค่า

**ไฟล์:** `components/History.tsx`, `pages/LinkDetails.tsx`, backend `services/links.ts`

Input คือ search/status/page หรือ isActive/expiresAt; output list/pagination หรือ link หลัง update `useEffect` เรียก Fetch ทุกครั้งเมื่อ filter/page/refresh เปลี่ยน cleanup ใช้ AbortController ยกเลิก request เก่าไม่ให้ response เก่าทับ state ใหม่ UI เปลี่ยน grid row เป็นรายการเมื่อจอแคบ URL ยาว wrap ได้

Service ใส่ userId ใน where เสมอ อ่าน count/list ใน transaction; details/QR/stats/update ที่ไม่ใช่ owner ตอบ 404 สถานะ disabled มาก่อน expired หากปิดและหมดอายุพร้อมกัน PATCH แก้เฉพาะสถานะ/expiry ไม่เปลี่ยน code/destination

**ผลตรวจ:** list/search/filter/page validation, cross-user details/QR/stats/PATCH, enable/disable/expired ผ่าน MySQL และ setting persistence ผ่าน browser refresh

**สัมภาษณ์:**

- ใช้ id จาก route แล้ว query ได้เลยไหม? ต้องตรวจ ownership ด้วย userId จาก session ไม่เชื่อ owner id ที่ client ส่งมา
- ทำไมยกเลิก Fetch เก่า? ผู้ใช้เปลี่ยน filter เร็ว request ที่เริ่มก่อนอาจเสร็จทีหลังและทำให้แสดงรายการผิด
- ทำไมไม่มี hard delete? scope รุ่นแรกเก็บประวัติและปิดลิงก์แทน จึงรักษา click history โดยไม่ต้องออกแบบ deletion/retention เพิ่ม

## 6. Analytics และ timezone

**ไฟล์:** `components/Analytics.tsx`, backend `controllers/stats.ts`, `services/stats.ts`, `lib/date.ts`

Input เป็น from/to `YYYY-MM-DD`; output summary/daily/sources/devices ค่ารวมตลอดอายุอยู่ summary ส่วน daily/periodClicks/source/device ใช้ช่วงเลือก UI แสดงด้วย Recharts และมีตารางรายวันสำหรับอ่านข้อมูลโดยไม่พึ่งกราฟ ปิด chart animation ให้รูปนิ่งและลด motion

Service แปลงเที่ยงคืนไทยเป็น UTC boundary ใช้ end exclusive ของวันถัดไป Group daily ใน MySQL โดย DATE_ADD 7 ชั่วโมงและ Prisma groupBy source/device แล้วใช้ for loop เติมวันว่าง 0 ไม่โหลด click_events ทุกแถวมา group ใน Node SQL parameters ใช้ Prisma tagged templates ไม่ต่อข้อความ input ลง SQL

**ผลตรวจ:** events ที่ 16:59:59Z กับ 17:00:00Z อยู่คนละวันไทย เติมวันที่ไม่มีคลิกเป็น 0; ตรวจ invalid date/range; browser แสดงผล 1 click หลังเปิดจริง

**สัมภาษณ์:**

- ทำไมเก็บ UTC แต่แสดง Bangkok? ลดความกำกวมของเวลา storage แล้วแปลงตามกติกาผู้ใช้ตอนสรุป
- ทำไมใช้ end exclusive? `[start, next day)` ไม่ต้องเดาวินาที/มิลลิวินาทีสุดท้ายของวัน
- ทำไม group ใน DB? จำกัดข้อมูลที่ส่งเข้าหน่วยความจำ backend และใช้ index ของ link_id/ clicked_at

## 7. Rate limits, error handling และ production

**ไฟล์:** `middlewares/security.ts`, `middlewares/errors.ts`, `services/rate-limit.ts`, `lib/config.ts`, frontend/backend `vercel.json`

ก่อน public auth ใช้ IP จาก trusted request handling; หลัง login ใช้ userId สร้าง HMAC key ด้วย secret ใหม่ เก็บ UPSERT count/expiry ใน transaction แล้วอ่านแถวที่ถูก lock จึงไม่มีหลาย requests อ่านค่าเดิมแล้วเขียนทับ Rate-limit expiry reset อย่าง atomic; 429 มี Retry-After

Origin เทียบ config APP_URL ไม่เชื่อ Host/X-Forwarded-Host; runtime environment validate ด้วย Zod Error handler แยก 400/401/403/404/409/410/413/429/503/500 ไม่ส่ง SQL/stack/credentials ส่วน same-origin production rewrites ช่วยให้ cookie ไม่ต้องเป็น cross-site

**ผลตรวจ:** 20 concurrent limit requests ยอมรับเพียง 5, reset expiry ได้, HTTP login request ที่ 21 เป็น 429; wrong/missing Origin ถูกบล็อก; malformed JSON และ body limit ผ่าน

**สัมภาษณ์:**

- ทำไมไม่ใช้ memory limiter? serverless มีหลาย instances จึงต้องมี store ที่ร่วมกันได้
- CORS แทน Origin check ได้ไหม? CORS ควบคุมการอ่าน response ของ browser ไม่ใช่การอนุญาต mutation ทุกกรณี ต้องตรวจ Origin ที่ server ด้วย
- Deploy เสร็จหรือยัง? Frontend และ Backend deploy บน Vercel แล้ว ใช้ TiDB Cloud ตามข้อมูลผู้ดูแล ตรวจ API ผ่าน public HTTPS จริงทั้ง session cookie, create, 302, QR และ analytics แยกหลักฐานออนไลน์จาก MySQL/CI และระบุการสแกนมือถือที่ยังต้องตรวจตาม `verification.md`

## Demo ภายใน 30 นาที

1. 3 นาที: สรุปปัญหาและ architecture 2 apps / 1 modular backend
2. 5 นาที: สมัคร → สร้าง custom alias → copy → QR → redirect
3. 4 นาที: history/click → details/status/expiry → sources/device/daily
4. 8 นาที: อ่าน CreateForm → Route → Controller → Service → Prisma/schema
5. 5 นาที: auth/ownership/Origin/atomic counters/collision/concurrent events
6. 3 นาที: เปิด testing evidence และข้อจำกัด production
7. 2 นาที: เปรียบเทียบ Next.js และตอบคำถาม

ใช้ข้อมูลสาธิตของโปรเจกต์นี้เองและอย่าแสดง `.env` หรือ root credentials บนจอ
