import { readFileSync, writeFileSync } from "node:fs";
const diagrams = [
  ["DFD Level 0", "dfd-level-0"],
  ["ER Diagram", "er"],
  ["Architecture Diagram", "architecture"],
];
let document =
  "# แผนภาพระบบ\n\nสร้างจาก Mermaid source ใน `docs/diagrams/` และตรงกับ implementation ปัจจุบัน Cloud topology เป็นเป้าหมายที่เตรียมไว้ ยังไม่ได้ deploy ส่วน local topology ทดสอบบน MySQL จริงแล้ว\n\n";
for (const [title, file] of diagrams)
  document += `## ${title}\n\n[เปิด SVG](diagrams/${file}.svg) · [เปิด PNG](diagrams/${file}.png)\n\n\`\`\`mermaid\n${readFileSync(`docs/diagrams/${file}.mmd`, "utf8")}\`\`\`\n\n`;
document +=
  "rate_limits ไม่มี foreign key เพราะจำกัดทั้ง IP ก่อนล็อกอินและ user หลังล็อกอิน ใช้ HMAC key ไม่เก็บ IP ตรง ๆ FK ที่มีใน schema ใช้ cascade; ไม่มี API hard delete ในรุ่นแรก ข้อมูลเวลาเก็บ UTC และสรุปวัน Bangkok +07:00\n";
writeFileSync("docs/diagrams.md", document);
console.log("Mermaid documentation generated.");
