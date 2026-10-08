import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Settings2 } from "lucide-react";
import type { LinkInfo } from "../types/api";
import { api, errorMessage } from "../services/api";
import { ErrorNotice, Loading } from "../components/Feedback";
import { Workspace } from "../components/Navigation";
import { LinkResult } from "../components/LinkResult";
import { Analytics } from "../components/Analytics";
export function LinkDetails() {
  const { id } = useParams();
  const [link, setLink] = useState<LinkInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [expiryChanged, setExpiryChanged] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<{ link: LinkInfo }>(`/api/links/${id}`, { signal: controller.signal })
      .then((result) => {
        setLink(result.link);
        setIsActive(result.link.isActive);
        setExpiresAt(
          result.link.expiresAt
            ? new Date(new Date(result.link.expiresAt).getTime() + 7 * 3600000)
                .toISOString()
                .slice(0, 16)
            : "",
        );
        setExpiryChanged(false);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, retry]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSaveError("");
    setSaved(false);
    try {
      const data = {
        isActive,
        expiresAt: expiryChanged
          ? expiresAt
            ? new Date(`${expiresAt}:00+07:00`).toISOString()
            : null
          : undefined,
      };
      const result = await api<{ link: LinkInfo }>(`/api/links/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setLink(result.link);
      setSaved(true);
      setExpiryChanged(false);
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Workspace>
      <Link className="text-link mb-4" to="/history">
        <ArrowLeft size={16} aria-hidden="true" />
        กลับไปประวัติลิงก์
      </Link>
      <div className="page-heading">
        <h1>รายละเอียดลิงก์</h1>
        <p className="muted">QR Code การตั้งค่า และสถิติของลิงก์นี้</p>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <>
          <ErrorNotice message={error} />
          <button
            className="btn btn-secondary mt-3"
            onClick={() => setRetry(retry + 1)}
          >
            ลองใหม่
          </button>
        </>
      ) : (
        link && (
          <>
            <LinkResult key={link.id} link={link} />
            <section className="panel">
              <h2 className="section-heading">
                <Settings2 size={21} aria-hidden="true" />
                ตั้งค่าลิงก์
              </h2>
              <form onSubmit={save}>
                <div className="settings-grid">
                  <div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => {
                          setIsActive(e.target.checked);
                          setSaved(false);
                        }}
                      />
                      เปิดใช้งานลิงก์
                    </label>
                    <p className="muted text-sm">
                      เมื่อปิด ผู้เปิดลิงก์จะไม่ถูกส่งต่อ
                    </p>
                  </div>
                  <div>
                    <label htmlFor="edit-expiry">วันหมดอายุ (เวลาไทย)</label>
                    <input
                      id="edit-expiry"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => {
                        setExpiresAt(e.target.value);
                        setExpiryChanged(true);
                        setSaved(false);
                      }}
                    />
                    <p className="muted text-sm mt-2">
                      เว้นว่างเพื่อไม่กำหนดวันหมดอายุ
                    </p>
                  </div>
                </div>
                <p className="muted text-sm my-4">
                  URL ต้นฉบับและชื่อลิงก์คงที่หลังสร้าง
                </p>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
                </button>
                {saved && (
                  <p role="status" className="success-text mt-3">
                    บันทึกการตั้งค่าแล้ว
                  </p>
                )}
                {saveError && <ErrorNotice message={saveError} />}
              </form>
            </section>
            <Analytics id={link.id} />
          </>
        )
      )}
    </Workspace>
  );
}
