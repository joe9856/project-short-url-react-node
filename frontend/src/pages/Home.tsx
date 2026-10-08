import { ArrowUpRight, Link2, QrCode, ChartNoAxesCombined } from "lucide-react";
import { CreateForm } from "../components/CreateForm";
export function Home({ authenticated }: { authenticated: boolean }) {
  return (
    <main id="main" className="home-main">
      <section className="home-heading" aria-labelledby="home-title">
        <div className="home-heading-copy">
          <p className="eyebrow home-eyebrow">
            <span className="accent-rule" />
            ลิงก์เล็กลง โอกาสมากขึ้น
          </p>
          <h1 id="home-title">
            <span className="home-title-lead">ย่อลิงก์ พร้อมแชร์</span>{" "}
            <span className="home-title-accent">
              ด้วย <span className="home-title-latin">QR Code</span>
              <ArrowUpRight aria-hidden="true" />
            </span>
          </h1>
          <p className="home-description">
            เปลี่ยน URL ยาวให้เป็นลิงก์ที่จดจำง่าย
            <br className="home-description-break" />
            พร้อมติดตามทุกการเปิดในที่เดียว
          </p>
        </div>
        <div className="home-share-art" aria-hidden="true">
          <div className="home-qr-frame">
            <span className="home-art-label">SCAN & SHARE</span>
            <QrCode className="home-qr-symbol" strokeWidth={1.5} />
            <span className="home-art-sample">ตัวอย่าง</span>
          </div>
          <div className="home-link-strip">
            <Link2 size={18} />
            <span>short.link/hello</span>
            <ArrowUpRight size={16} />
          </div>
          <span className="home-art-caption">ลิงก์เดียว แชร์ได้ทุกที่</span>
        </div>
      </section>
      <CreateForm authenticated={authenticated} />
      <div className="home-features">
        <div>
          <Link2 size={22} aria-hidden="true" />
          <h2>ลิงก์สั้น พร้อมใช้</h2>
          <p>ตั้งชื่อเองและกำหนดวันหมดอายุได้</p>
        </div>
        <div>
          <QrCode size={22} aria-hidden="true" />
          <h2>QR สำหรับทุกลิงก์</h2>
          <p>ดาวน์โหลดได้ทั้ง PNG และ SVG</p>
        </div>
        <div>
          <ChartNoAxesCombined size={22} aria-hidden="true" />
          <h2>ติดตามการเปิด</h2>
          <p>ดูประวัติ คลิก และสถิติรายวัน</p>
        </div>
      </div>
      <footer className="home-footer">
        Short URL · โปรเจกต์สาธิตสำหรับแบบทดสอบ Developer
        <br />
        ไม่ได้เป็นผลิตภัณฑ์ทางการของ Synerry
      </footer>
    </main>
  );
}
