import { readFileSync, writeFileSync } from "node:fs";
const diagrams = [
  ["DFD Level 0", "dfd-level-0"],
  ["ER Diagram", "er"],
  ["Architecture Diagram", "architecture"],
];
let document =
  "# แผนภาพระบบ\n\nสร้างจาก Mermaid source ใน `docs/diagrams/` ระบบ production deploy แล้ว: React SPA และ Express API อยู่คนละ Vercel project, ฐานข้อมูลเป็น TiDB Cloud ตามข้อมูลผู้ดูแล ส่วน local/CI ใช้ MySQL 8.4 Backend เป็น Modular Monolith ไม่ใช่ Microservices\n\nFrontend: https://project-short-url-react-node.vercel.app · Backend: https://project-short-url-react-node-osq6.vercel.app\n\nดูหลักฐานการตรวจใน [verification.md](verification.md)\n\n";
for (const [title, file] of diagrams)
  document += `## ${title}\n\n[เปิด SVG](diagrams/${file}.svg) · [เปิด PNG](diagrams/${file}.png)\n\n\`\`\`mermaid\n${readFileSync(`docs/diagrams/${file}.mmd`, "utf8")}\`\`\`\n\n`;
document +=
  "rate_limits ไม่มี foreign key เพราะจำกัดทั้ง IP ก่อนล็อกอินและ user หลังล็อกอิน ใช้ HMAC key ไม่เก็บ IP ตรง ๆ FK ที่มีใน schema ใช้ cascade; ไม่มี API hard delete ในรุ่นแรก ข้อมูลเวลาเก็บ UTC และสรุปวัน Bangkok +07:00\n";
writeFileSync("docs/diagrams.md", document);
console.log("Mermaid documentation generated.");
