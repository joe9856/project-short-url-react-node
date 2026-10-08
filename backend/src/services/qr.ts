import QRCode from "qrcode";
import { ownedLink, linkInfo } from "./links.js";
export async function linkQr(
  userId: string,
  id: string,
  format: "png" | "svg",
) {
  const link = await ownedLink(userId, id);
  // QR ใช้ลิงก์สั้น เพื่อให้ทุกการเปิดผ่านการตรวจสถานะและเก็บ event
  const shortUrl = linkInfo(link).shortUrl;
  const options = { errorCorrectionLevel: "M" as const, margin: 4, width: 320 };
  if (format === "svg")
    return {
      code: link.code,
      body: await QRCode.toString(shortUrl, { ...options, type: "svg" }),
    };
  return { code: link.code, body: await QRCode.toBuffer(shortUrl, options) };
}
