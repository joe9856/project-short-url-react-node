# แผนภาพระบบ

สร้างจาก Mermaid source ใน `docs/diagrams/` ระบบ production deploy แล้ว: React SPA และ Express API อยู่คนละ Vercel project, ฐานข้อมูลเป็น TiDB Cloud ตามข้อมูลผู้ดูแล ส่วน local/CI ใช้ MySQL 8.4 Backend เป็น Modular Monolith ไม่ใช่ Microservices

Frontend: https://project-short-url-react-node.vercel.app · Backend: https://project-short-url-react-node-osq6.vercel.app

ดูหลักฐานการตรวจใน [verification.md](verification.md)

## DFD Level 0

[เปิด SVG](diagrams/dfd-level-0.svg) · [เปิด PNG](diagrams/dfd-level-0.png)

```mermaid
flowchart LR
  Owner[ผู้ใช้ / เจ้าของลิงก์]
  Visitor[ผู้เปิดลิงก์ / สแกน QR]
  Auth((1.0 สมัคร / เข้าสู่ระบบ))
  Links((2.0 จัดการลิงก์))
  Redirect((3.0 ตรวจและส่งต่อ))
  Stats((4.0 สรุปสถิติ))
  QR((5.0 สร้าง QR))
  Users[(D1 users)]
  Sessions[(D2 sessions)]
  LinkStore[(D3 links)]
  Events[(D4 click_events)]
  Limits[(D5 rate_limits)]
  Destination[เว็บไซต์ปลายทาง]
  Owner -->|name / email / password| Auth
  Auth -->|hash / user data| Users
  Users -->|password hash / user| Auth
  Auth <-->|token hash / expiry| Sessions
  Auth -->|HttpOnly cookie / user| Owner
  Auth <-->|HMAC key / atomic count| Limits
  Owner -->|session / URL / alias / filters| Links
  Sessions -->|ตรวจสิทธิ์| Links
  Links <-->|สร้าง / อ่าน / status / expiry| LinkStore
  Links <-->|create limit| Limits
  Links -->|private link / history| Owner
  Visitor -->|GET / HEAD code| Redirect
  LinkStore -->|destination / active / expiry| Redirect
  Redirect -->|GET เท่านั้น: insert event ก่อน 302| Events
  Redirect -->|302 Location| Visitor
  Visitor -->|เปิด URL| Destination
  Owner -->|session / date range / link id| Stats
  Sessions -->|ตรวจสิทธิ์| Stats
  LinkStore -->|owner links| Stats
  Events -->|COUNT / Bangkok daily / source / device| Stats
  Stats -->|JSON statistics| Owner
  Owner -->|session / link id / format| QR
  Sessions -->|ตรวจสิทธิ์| QR
  LinkStore -->|owner link code| QR
  QR -->|short URL encoded as PNG / SVG| Owner
```

## ER Diagram

[เปิด SVG](diagrams/er.svg) · [เปิด PNG](diagrams/er.png)

```mermaid
erDiagram
  users ||--o{ sessions : owns
  users ||--o{ links : owns
  links ||--o{ click_events : records
  users {
    char36 id PK
    varchar100 name
    varchar254 email UK
    varchar255 password_hash
    datetime3 created_at
  }
  sessions {
    char64 token_hash PK
    char36 user_id FK
    datetime3 expires_at "indexed"
  }
  links {
    char36 id PK
    char36 user_id FK "index with created_at"
    text original_url
    varchar32 code UK
    boolean is_active
    datetime3 expires_at "nullable"
    datetime3 created_at
  }
  click_events {
    char36 id PK
    char36 link_id FK "index with clicked_at"
    datetime3 clicked_at
    varchar253 referrer_host "nullable; hostname only"
    varchar16 device_type
  }
  rate_limits {
    char64 key PK "HMAC; no foreign key"
    int count
    datetime3 expires_at "indexed"
  }
```

## Architecture Diagram

[เปิด SVG](diagrams/architecture.svg) · [เปิด PNG](diagrams/architecture.png)

```mermaid
flowchart TB
  Browser[Browser / React SPA]
  subgraph FrontendProject[Frontend Vercel project - deployed]
    Static[Vite dist / React Router / Thai UI]
    Proxy[Rewrites: /api /s /healthz]
  end
  subgraph BackendProject[Backend Vercel project - deployed]
    App[Express default export: src/app.ts]
    Middleware[Origin / session / rate limit / errors]
    Routes[Router]
    Controllers[Controller: HTTP and validation]
    Services[Service: business logic]
    Prisma[Prisma 6.19.3 - mysql connector]
  end
  Database[(TiDB Cloud - production)]
  Browser -->|HTML / CSS / JS| Static
  Browser -->|same-origin Fetch / HttpOnly cookie / public redirect| Proxy
  Proxy -->|preserve path and query| App
  App --> Middleware --> Routes --> Controllers --> Services --> Prisma
  Prisma -->|MySQL-compatible connection| Database
  Services -->|QR PNG / SVG or 302 after event commit| App
```

rate_limits ไม่มี foreign key เพราะจำกัดทั้ง IP ก่อนล็อกอินและ user หลังล็อกอิน ใช้ HMAC key ไม่เก็บ IP ตรง ๆ FK ที่มีใน schema ใช้ cascade; ไม่มี API hard delete ในรุ่นแรก ข้อมูลเวลาเก็บ UTC และสรุปวัน Bangkok +07:00
