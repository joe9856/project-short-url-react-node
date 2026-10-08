# REST API

Browser เรียก relative `/api` ผ่าน frontend same-origin proxy ส่วน backend รับ path เดิม ใช้ JSON UTF-8; body สูงสุด 40 KiB เพื่อรองรับ URL ภาษาไทย 8192 ตัว ทุก API/redirect ใช้ `Cache-Control: no-store`

คำขอ POST/PATCH ต้องมี `Origin` ตรง `APP_URL`; `Content-Type: application/json` เมื่อส่ง body ใช้ cookie `short_session` ที่ HttpOnly, SameSite=Lax, host-only, path `/`, TTL 7 วัน และ Secure ใน production ไม่ส่ง userId จาก client

## Endpoints

| Method | Path | Input/Query | ผลสำเร็จ | สิทธิ์ |
|---|---|---|---|---|
| POST | /api/auth/register | name, email, password | 201 `{ user }` + Set-Cookie | public, 10/15 นาที ต่อ IP |
| POST | /api/auth/login | email, password | 200 `{ user }` + Set-Cookie | public, 20/15 นาที ต่อ IP |
| POST | /api/auth/logout | ไม่มี body | 204 + clear cookie | revoke token หากมี |
| GET | /api/auth/me | — | 200 `{ user }` | session |
| POST | /api/links | originalUrl, alias?, expiresAt? | 201 `{ link }` | session, 60/นาที ต่อ user |
| GET | /api/links | q?, status?, page?, limit? | 200 `{ links, pagination }` | owner |
| GET | /api/links/:id | UUID | 200 `{ link }` | owner |
| PATCH | /api/links/:id | isActive?, expiresAt? | 200 `{ link }` | owner |
| GET | /api/links/:id/qr | format=png\|svg, download=0\|1 | image/png หรือ image/svg+xml | owner |
| GET | /api/links/:id/stats | from?, to? | 200 StatsInfo | owner |
| GET | /api/stats | from?, to? | 200 StatsInfo | owner |
| GET | /s/:code | code | 302 Location | public, บันทึก 1 event |
| HEAD | /s/:code | code | 302 Location ไม่มี body | public, ไม่บันทึก event |
| GET | /healthz | — | 200 `{ status: "ok" }` | public, SELECT 1 จริง |

`id` ต้องเป็น UUID, `code` ตัวเล็ก/ตัวเลข/ขีดกลาง 3–32 ตัว URL รับเฉพาะ http/https ไม่มี username/password, ยาวไม่เกิน 8192 ตัว เก็บ query/fragment และข้อความเดิม; Location serialize ด้วย URL API เพื่อ encode Unicode ใน HTTP header

Email normalize เป็นตัวเล็ก ชื่อ 1–100 ตัว email สูงสุด 254 password 10–128 ตัว Unknown body fields ถูกปฏิเสธ PATCH ต้องมีอย่างน้อย 1 field และแก้ originalUrl/code ไม่ได้ วันหมดอายุเป็น ISO datetime ที่มี timezone ในอนาคต หรือ `null` เพื่อยกเลิก expiration

List: q สูงสุด 200 ตัว, status=`all|active|disabled|expired`, page เริ่ม 1 สูงสุด 100000, limit default 10 สูงสุด 100 หากปิดและหมดอายุพร้อมกันแสดง `disabled` ก่อน รายการ expired จึงหมายถึง enabled แต่ถึง expiry แล้ว

## ตัวอย่าง

สร้างลิงก์:

```json
{"originalUrl":"https://example.com/path?campaign=thai#cta","alias":"my-campaign","expiresAt":null}
```

ผลสำเร็จ (ค่าตัวอย่าง):

```json
{
  "link": {
    "id": "6f3692b3-31b2-4ff5-8f86-8721d070b611",
    "originalUrl": "https://example.com/path?campaign=thai#cta",
    "code": "my-campaign",
    "shortUrl": "http://localhost:5173/s/my-campaign",
    "isActive": true,
    "expiresAt": null,
    "createdAt": "2026-10-08T19:00:00.000Z",
    "clicks": 0,
    "status": "active"
  }
}
```

List ใช้ `{ "links": [...], "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 } }` Owner คนอื่นและ id ที่ไม่มีอยู่ตอบ 404 เหมือนกัน ไม่เปิดเผยว่ามีข้อมูลของคนอื่น

StatsInfo มี `summary: { totalLinks, activeLinks, totalClicks }` ตลอดอายุข้อมูลที่ผู้ใช้เป็นเจ้าของ และ `periodClicks`, `daily`, `sources`, `devices` เฉพาะช่วงที่เลือก `from/to` เป็น `YYYY-MM-DD` รวมวันต้นและวันปลาย ตาม `Asia/Bangkok` default 30 วัน สูงสุด 366 วัน เติมวันไม่มีคลิกเป็น 0 แหล่งที่มา top 20 hostname; direct หมายถึงไม่มี referrer หรือ referrer ไม่ถูกต้อง device=`desktop|mobile|tablet|unknown`

```json
{
  "summary": {"totalLinks":1,"activeLinks":1,"totalClicks":3},
  "from":"2026-10-08","to":"2026-10-09","timezone":"Asia/Bangkok",
  "periodClicks":3,
  "daily":[{"date":"2026-10-08","clicks":0},{"date":"2026-10-09","clicks":3}],
  "sources":[{"name":"direct","clicks":3}],
  "devices":[{"name":"mobile","clicks":3}]
}
```

## Errors

```json
{"error":{"code":"VALIDATION_ERROR","message":"กรุณาตรวจสอบข้อมูล","fields":{"alias":"ชื่อลิงก์ไม่ถูกต้อง"}}}
```

| Status | ตัวอย่าง code/ความหมาย |
|---|---|
| 400 | VALIDATION_ERROR, INVALID_JSON, INVALID_DATE |
| 401 | AUTH_REQUIRED, INVALID_CREDENTIALS |
| 403 | INVALID_ORIGIN |
| 404 | LINK_NOT_FOUND, NOT_FOUND |
| 409 | ALIAS_EXISTS, EMAIL_EXISTS |
| 410 | LINK_UNAVAILABLE ปิดหรือหมดอายุ |
| 413 | BODY_TOO_LARGE |
| 429 | RATE_LIMITED พร้อม Retry-After วินาที |
| 503 | DATABASE_UNAVAILABLE หรือ CODE_EXHAUSTED |
| 500 | INTERNAL_ERROR ข้อความทั่วไป ไม่มี SQL/stack/credentials |

GET redirect บันทึก event สำเร็จก่อนตอบ 302 หากฐานข้อมูลล้มเหลวตอบ 503 ไม่ส่งต่อโดยแอบทำ event หาย QR ใช้ short URL เพื่อให้การสแกนผ่านระบบนี้ HEAD/preview/download QR ไม่เพิ่มยอด No-store ป้องกันการ cache 302 จนข้ามการนับคลิกหรือตรวจ expiration
