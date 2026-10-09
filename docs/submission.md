# รายการส่งงาน Developer — Short URL

## ลิงก์ส่งให้ผู้ตรวจ

- Repository: https://github.com/joe9856/project-short-url-react-node
- เว็บออนไลน์: https://project-short-url-react-node.vercel.app
- วิธีติดตั้ง: [README](../README.md) และ [setup.md](setup.md)
- DFD Level 0, ER Diagram และ Architecture: [diagrams.md](diagrams.md) มี Mermaid, SVG และ PNG
- ผลทดสอบ local/CI/production: [verification.md](verification.md)

ผู้ตรวจสมัครบัญชีของตนเองผ่านหน้าเว็บได้ หากต้องการใช้บัญชีสาธิต ให้ผู้ส่งนำข้อมูลจาก `.local/production-demo-account.md` ส่งทางช่องทางส่วนตัว ไฟล์นี้ถูก ignore และไม่ได้อยู่บน GitHub บัญชีไม่มีสิทธิ์ผู้ดูแลและแสดงเฉพาะข้อมูลสาธิต

## เทียบโจทย์

| เกณฑ์ | หลักฐาน |
|---|---|
| React / Node.js | `frontend` React/Vite และ `backend` Express/TypeScript |
| Source Code ใน Git | Public GitHub ด้านบน |
| Database | MySQL 8.4 ใน local/CI; Production ใช้ TiDB Cloud (MySQL-compatible) ต้องยืนยันการยอมรับจากบริษัท |
| Online URL | Frontend HTTPS พร้อม Backend proxy และฐานข้อมูล |
| DFD Level 0 | `docs/diagrams/dfd-level-0.mmd/.svg/.png` |
| ER Diagram | `docs/diagrams/er.mmd/.svg/.png` และ Prisma schema/migration |
| สร้าง Short URL / เปิด URL เดิม | ผลตรวจ public HTTP 302 พร้อม query/fragment |
| QR Code | PNG/SVG และ PNG decode เป็น public Short URL; มือถือจริงต้องตรวจแยก |
| ประวัติ / สถิติคลิก | Original URL, Short URL, วันที่, click count, Bangkok daily/source/device |
| ฟังก์ชันเสริม | Auth/ownership, alias, expiry, เปิด–ปิด, ค้นหา/กรอง/แบ่งหน้า, copy/download, rate limit |
| Microservices (คะแนนพิเศษ) | มี Architecture Diagram; Backend เป็น Modular Monolith ไม่อ้างว่าเป็น Microservices |

## ตรวจขั้นสุดท้ายก่อนยืนยันส่ง

- [x] Repository เปิดสาธารณะและมีวิธีติดตั้ง
- [x] Frontend URL และ Backend ออนไลน์
- [x] เอกสารระบุ TiDB Cloud ตามข้อมูลผู้ดูแล
- [x] มีแผนภาพ DFD / ER / Architecture
- [x] มีผล API ออนไลน์และ CI แยกจากผล local
- [x] เตรียมบัญชีสาธิตเฉพาะ เก็บ credentials นอก Git
- [ ] ยืนยันกับบริษัทว่า TiDB Cloud ใช้แทน MySQL ตามโจทย์ได้
- [ ] สแกน QR ด้วยโทรศัพท์จริง ตรวจว่าเปิดเว็บไซต์ต้นฉบับ และยอดคลิกเพิ่ม
- [x] ตรวจข้อมูลลิงก์/ยอดคลิกและ session ที่ออกก่อน redeploy ตาม `verification.md` และ `evidence/persistence.json`
- [ ] ระบุวันที่ได้รับโจทย์เพื่อเช็คกำหนดส่งภายใน 3 วัน
- [ ] ส่ง Repository/Frontend URL และ credentials (หากใช้บัญชีสาธิต) ให้ผู้ตรวจ แล้วนัด Video Call

## สาธิตภายใน 30 นาที

1. 3 นาที: อธิบาย React → Frontend proxy → Express → Prisma → TiDB Cloud และเปิด DFD/ER/Architecture
2. 5 นาที: ล็อกอิน → สร้างลิงก์ → alias/expiry → copy → เปิดลิงก์สั้น → สแกน QR
3. 4 นาที: ประวัติ/คลิก → รายละเอียด → ปิด/เปิดลิงก์ → กราฟรายวัน/source/device
4. 8 นาที: อ่าน CreateForm → Fetch → Router → Controller → Service → Prisma/schema
5. 5 นาที: อธิบาย session/ownership/Origin/unique collision/atomic click events
6. 3 นาที: แสดงผล local, CI และ API ออนไลน์ พร้อมข้อจำกัดที่ยังไม่ได้ตรวจ
7. 2 นาที: ตอบคำถามและสรุปฟังก์ชันเสริมที่มีประโยชน์

ไม่แสดง `.env`, cookies, session tokens หรือ root/production credentials ระหว่างสาธิต
