import { useState } from "react";
import { Copy, Download, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { LinkInfo } from "../types/api";
import { errorMessage, thaiDate } from "../services/api";
import { ErrorNotice, Status } from "./Feedback";
export function LinkResult({ link }: { link: LinkInfo }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [qrError, setQrError] = useState(false);
  const [qrVersion, setQrVersion] = useState(0);
  async function copy() {
    setError("");
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(true);
    } catch {
      setError("คัดลอกไม่ได้ กรุณาเลือกและคัดลอกลิงก์ด้วยตนเอง");
    }
  }
  async function download(format: string) {
    setBusy(format);
    setError("");
    try {
      const response = await fetch(
        `/api/links/${link.id}/qr?format=${format}&download=1`,
      );
      if (!response.ok) throw new Error("ดาวน์โหลด QR ไม่สำเร็จ กรุณาลองใหม่");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `qr-${link.code}.${format}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="result-panel" aria-label="ลิงก์สั้น">
      <div className="result-grid">
        <div>
          <Status value={link.status} />
          <a
            className="short-url"
            href={link.shortUrl}
            target="_blank"
            rel="noreferrer"
          >
            {link.shortUrl}
            <ExternalLink size={16} aria-label="เปิดในแท็บใหม่" />
          </a>
          <p className="url-text muted mt-3">{link.originalUrl}</p>
          <p className="muted text-sm mt-3">
            สร้างเมื่อ {thaiDate(link.createdAt)} ·{" "}
            {link.clicks.toLocaleString("th-TH")} คลิก
          </p>
          <div className="actions mt-4">
            <button className="btn btn-primary" onClick={copy}>
              {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
              {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
            </button>
            <Link className="text-link" to={`/links/${link.id}`}>
              ดูรายละเอียดและสถิติ
            </Link>
          </div>
          {copied && (
            <p role="status" className="success-text mt-3">
              คัดลอกลิงก์สั้นแล้ว
            </p>
          )}
        </div>
        <div className="qr-panel">
          <h2>QR Code พร้อมแชร์</h2>
          {qrError ? (
            <>
              <ErrorNotice message="โหลด QR ไม่สำเร็จ" />
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setQrError(false);
                  setQrVersion(qrVersion + 1);
                }}
              >
                ลองใหม่
              </button>
            </>
          ) : (
            <img
              className="qr-image"
              src={`/api/links/${link.id}/qr?format=png&v=${qrVersion}`}
              alt={`QR Code ของ ${link.shortUrl}`}
              width="240"
              height="240"
              onError={() => setQrError(true)}
            />
          )}
          <div className="actions justify-center">
            {["png", "svg"].map((format) => (
              <button
                key={format}
                className="btn btn-secondary"
                disabled={Boolean(busy)}
                onClick={() => download(format)}
              >
                <Download size={16} aria-hidden="true" />
                {busy === format ? "กำลังโหลด…" : format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error && <ErrorNotice message={error} />}
    </section>
  );
}
