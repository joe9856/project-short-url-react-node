# เปรียบเทียบ React + Express กับ Next.js

เปรียบเทียบจาก source ใน `D:\Projects-Short-URL\short-url-react-node` และการอ่าน source/เอกสารใน `D:\Projects\short-url-demo` แบบ read-only วันที่ 9 ตุลาคม 2026 ไม่มีการเปลี่ยนไฟล์หรือรัน build/migration ของ Next.js ในงานนี้

## ความครบของงาน

ทั้งสอง implementations มี auth/ownership, create/custom alias, public redirect, QR PNG/SVG, history/search/filter/pagination, status/expiry, daily Bangkok/source/device analytics, rate limiting และ no-store จึงใช้ flow เดียวกันเปรียบเทียบได้ ความต่างหลักคือ React Router + Fetch ไป Express แยกแอป เทียบกับ Next App Router/server components/route handlers

## เกณฑ์ทั้ง 9 ด้าน

| ด้าน | React + Express | Next.js เดิม |
|---|---|---|
| 1. React code complexity | Functional components, state/effect/event/Fetch เห็น lifecycle ฝั่ง browser ชัด ต้องเขียน loading/error และ fetch หลัง mount เอง | มี client/server component boundary และ navigation/refresh conventions ของ framework เพิ่ม แต่ server page อ่านข้อมูลได้โดยตรง |
| 2. Backend code complexity | Route → Controller → Service → Prisma ชัดเจน มี middleware กลาง ต้องดูแล routing/server entry/proxy เอง | HTTP อยู่ใน route.ts ตามโฟลเดอร์ มีบริการและ Prisma เหมือนกัน ลด Express wiring แต่ต้องเข้าใจ Next request/runtime |
| 3. TypeScript difficulty | ใช้ interface, union, optional fields, basic Fetch generic, Express Request/Response และ Zod parse | พื้นฐาน types ใกล้เคียงกัน เพิ่ม types ของ framework/server-client props; ไม่ควรเลือก stack เพียงเพื่อหลบ TypeScript |
| 4. Project structure | frontend/backend แยกชัด 2 package configs และ root workspace | แอปเดียว src/app + components/services/lib เข้าใจง่ายเมื่อคุ้น convention |
| 5. จำนวน application files | 41 ไฟล์: frontend/src 15 และ backend/src 26 ไม่นับ tests/generated/build; มี plumbing/config เพิ่มนอก source | 46 ไฟล์ใน src ตามวิธีนับเดียวกัน จำนวนไฟล์น้อยกว่าไม่ได้แปลว่า code ง่ายกว่า เพราะหน้าที่และ grouping ต่างกัน |
| 6. Deployment complexity | 1 repository, 2 Vercel projects, backend domain + frontend rewrite/APP_URL/cookie ต้องตั้งและทดสอบร่วมกัน | 1 Next application project กับฐานข้อมูล ลดจำนวน hosting settings ตามเอกสารเดิม |
| 7. Security/maintainability | Argon2id, opaque token/hash DB, Origin, ownership, DB limits/events ใช้ explicit middleware; ต้องดูแลสอง build/dependency sets | เอกสาร/source เดิมใช้ Argon2id, iron-session + DB revocation, ownership/Origin/DB limits/events เหมือนกัน framework ไม่ได้ทำ ownership ให้อัตโนมัติ |
| 8. Testing results | ผลที่รันจริงในงานนี้อยู่ verification.md และ JSON evidence มี unit/React/Supertest, MySQL integration, browser 3 viewports และ outage | เอกสารเดิมรายงาน 19 unit, 16 MySQL integration groups, 16 TiDB groups และ 1 complete E2E scenario ครอบคลุม 3 viewports; ไม่ได้ rerun ในงานนี้ |
| 9. อธิบายในสัมภาษณ์ | เหมาะกับผู้เรียนที่อยากเล่า React event → HTTP → Express → DB แต่ต้องอธิบาย proxy/serverless deployment เพิ่ม | อธิบาย full-stack ใน framework เดียวสั้นกว่าเมื่อเข้าใจ server/client, route handlers และ rendering conventions |

จำนวนบรรทัด/ไฟล์ที่วัดจริงและวิธีนับอยู่ `docs/evidence/source-inventory.json` ไม่นับ `.test.tsx` และนับเฉพาะ `.ts`, `.tsx`, `.css` ใน src รวม `.d.ts`; configuration/docs/runtime ไม่รวม จำนวน React/Express วัดใหม่หลังแก้ ส่วน Next.js เก็บผลวัดเดิมพร้อมวันที่ เพราะ source ไม่ได้อยู่ใน workspace ปัจจุบัน เปรียบเทียบจำนวน test cases ตรง ๆ เพื่อจัดอันดับไม่ได้ เพราะแต่ละ suite แบ่ง assertions เป็น groups ไม่เหมือนกัน

## ความเหมาะสมสำหรับผู้พัฒนามือใหม่

ถ้าเป้าหมายคือเรียน React และ HTTP/backend flow อย่างเป็นขั้นตอน แนะนำใช้เวอร์ชัน React + Express นี้เป็นหลัก แล้วเปิด flow เดียวกันใน Next.js เพื่อเห็นว่า framework ย้ายงานใดไปอยู่ฝั่ง server หลีกเลี่ยงการสรุปว่า stack ใดปลอดภัยกว่าโดยไม่มี implementation/test evidence

ถ้าเป้าหมายคือส่งงานให้ deploy ได้เร็วและดูแล hosting น้อยกว่า Next.js เดิมมีข้อได้เปรียบจากการเป็นแอปเดียวตามโครงสร้างที่มี แต่ต้องเข้าใจ server/client conventions และตรวจ assignment ว่ายอมรับ stack นั้นหรือไม่

ข้อแนะนำนี้เป็นการประเมินจากโค้ดและจำนวนส่วนที่ต้องดูแล ไม่ได้วัดเวลาเรียนจริง ความถนัดผู้ใช้ ค่าใช้จ่าย cloud หรือ usability จากผู้ใช้จริง ไม่มี cloud resources ใหม่ให้ benchmark ค่าใช้จ่ายจึงยังสรุปไม่ได้

## วิธีเปรียบเทียบอย่างยุติธรรม

ให้ผู้พัฒนาอ่าน Create/Redirect/Auth flow ของแต่ละ stack แล้วอธิบายด้วยตนเอง จากนั้นทดลองแก้ requirement เล็ก ๆ เช่นเพิ่ม validation โดยจับเวลา/debug errors ใช้ acceptance scenario เดียวกันและฐานข้อมูลแยก ทดสอบ production proxy/cookies จริงก่อนตัดสินใจด้าน deploy ไม่แก้โค้ด Next.js เพื่อให้ผลเปรียบเทียบของเวอร์ชันนี้ดูดีกว่า
