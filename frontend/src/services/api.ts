export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.error?.message || "เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่",
      body?.error?.fields || {},
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่";
}
export function thaiDate(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
export function today() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}
