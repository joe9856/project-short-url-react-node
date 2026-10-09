// จำกัด pool ของแต่ละ Vercel instance โดยไม่เปลี่ยนค่า TLS/credentials ที่ผู้ดูแลตั้งไว้
export function databaseUrlForRuntime(
  value: string,
  isVercel: boolean,
): string {
  if (!isVercel) return value;
  const url = new URL(value);
  if (!url.searchParams.has("connection_limit"))
    url.searchParams.set("connection_limit", "3");
  if (!url.searchParams.has("pool_timeout"))
    url.searchParams.set("pool_timeout", "30");
  return url.toString();
}
