import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Link2, ArrowRight } from "lucide-react";
import { api, ApiError, errorMessage } from "../services/api";
import type { LinkInfo } from "../types/api";
import { ErrorNotice } from "./Feedback";
import { LinkResult } from "./LinkResult";
export function CreateForm({
  authenticated,
  onCreated,
}: {
  authenticated: boolean;
  onCreated?: () => void;
}) {
  const [originalUrl, setOriginalUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [link, setLink] = useState<LinkInfo | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setFields({});
    setBusy(true);
    try {
      const url = new URL(originalUrl);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new Error(
          "ใช้ URL แบบ HTTP/HTTPS โดยไม่มีชื่อผู้ใช้หรือรหัสผ่าน",
        );
      const result = await api<{ link: LinkInfo }>("/api/links", {
        method: "POST",
        body: JSON.stringify({
          originalUrl,
          alias: alias || undefined,
          expiresAt: expiresAt
            ? new Date(`${expiresAt}:00+07:00`).toISOString()
            : null,
        }),
      });
      setLink(result.link);
      setOriginalUrl("");
      setAlias("");
      setExpiresAt("");
      onCreated?.();
    } catch (error) {
      setError(errorMessage(error));
      if (error instanceof ApiError) setFields(error.fields);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div id="create">
      <section className="panel generator-panel">
        <h2 className="section-heading">
          <Link2 size={22} aria-hidden="true" />
          สร้างลิงก์สั้น
        </h2>
        <form onSubmit={submit}>
          <label htmlFor="original-url">URL ต้นฉบับ</label>
          <div className="create-main-row">
            <input
              id="original-url"
              type="url"
              required
              maxLength={8192}
              placeholder="https://example.com/your-long-url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              aria-invalid={Boolean(fields.originalUrl)}
              aria-describedby="url-help"
            />
            <button
              className="btn btn-primary"
              disabled={busy || !authenticated}
            >
              {busy ? "กำลังสร้าง…" : "สร้างลิงก์"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
          <p id="url-help" className="muted text-sm mt-2">
            รองรับ HTTP และ HTTPS เก็บ query และ fragment ของลิงก์เดิม
          </p>
          {fields.originalUrl && (
            <p className="error-text">{fields.originalUrl}</p>
          )}
          <details className="advanced-options">
            <summary>ตัวเลือกเพิ่มเติม · ชื่อลิงก์และวันหมดอายุ</summary>
            <div className="form-grid mt-3">
              <div>
                <label htmlFor="alias">ชื่อลิงก์ที่ต้องการ (ไม่บังคับ)</label>
                <input
                  id="alias"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  minLength={3}
                  maxLength={32}
                  pattern="[a-z0-9-]{3,32}"
                  placeholder="my-campaign"
                  aria-invalid={Boolean(fields.alias)}
                />
                <p className="muted text-sm mt-2">
                  a-z, 0-9 และขีดกลาง 3–32 ตัว
                </p>
                {fields.alias && <p className="error-text">{fields.alias}</p>}
              </div>
              <div>
                <label htmlFor="expires">วันหมดอายุ (เวลาไทย)</label>
                <input
                  id="expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  aria-invalid={Boolean(fields.expiresAt)}
                />
                {fields.expiresAt && (
                  <p className="error-text">{fields.expiresAt}</p>
                )}
              </div>
            </div>
          </details>
          {!authenticated && (
            <p className="guest-message">
              <Link className="text-link" to="/login">
                เข้าสู่ระบบ
              </Link>{" "}
              หรือ{" "}
              <Link className="text-link" to="/register">
                สมัครสมาชิก
              </Link>{" "}
              เพื่อสร้างลิงก์และเก็บประวัติส่วนตัว
            </p>
          )}
          {error && <ErrorNotice message={error} />}
        </form>
      </section>
      {link && (
        <>
          <p className="success-text mb-3" role="status">
            สร้างลิงก์สำเร็จ พร้อมแชร์แล้ว
          </p>
          <LinkResult key={link.id} link={link} />
        </>
      )}
    </div>
  );
}
