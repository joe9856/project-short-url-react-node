import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Link2, LayoutDashboard, History, Plus, LogOut } from "lucide-react";
import { api, errorMessage } from "../services/api";
import type { UserInfo } from "../types/api";
import { ErrorNotice } from "./Feedback";
export function Navigation({ user }: { user: UserInfo | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/logout", { method: "POST" });
      // โหลดหน้าใหม่หลัง revoke session เพื่อเคลียร์ข้อมูลส่วนตัวใน state ทุกหน้า
      window.location.assign("/");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <Link2 size={25} aria-hidden="true" />
          Short URL<span className="brand-dot">.</span>
        </Link>
        <nav className="header-nav" aria-label="เมนูหลัก">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">
                <LayoutDashboard size={18} aria-hidden="true" />
                แดชบอร์ด
              </Link>
              <Link to="/history" className="nav-link history-nav">
                ประวัติ
              </Link>
              <span className="account-name">{user.name}</span>
              <button
                className="btn btn-secondary"
                onClick={logout}
                disabled={busy}
              >
                <LogOut size={17} aria-hidden="true" />
                {busy ? "กำลังออก…" : "ออกจากระบบ"}
              </button>
            </>
          ) : (
            <>
              <Link className="nav-link" to="/login">
                เข้าสู่ระบบ
              </Link>
              <Link className="btn btn-primary" to="/register">
                สมัครสมาชิก
              </Link>
            </>
          )}
        </nav>
      </div>
      {error && <ErrorNotice message={error} />}
    </header>
  );
}
export function Workspace({ children }: { children: ReactNode }) {
  return (
    <div className="workspace">
      <aside className="sidebar">
        <p className="eyebrow">พื้นที่ทำงาน</p>
        <nav aria-label="เมนูพื้นที่ทำงาน">
          <NavLink className="sidebar-item" to="/dashboard">
            <LayoutDashboard size={18} aria-hidden="true" />
            แดชบอร์ด
          </NavLink>
          <Link className="sidebar-item" to="/dashboard#create">
            <Plus size={18} aria-hidden="true" />
            สร้างลิงก์
          </Link>
          <NavLink className="sidebar-item" to="/history">
            <History size={18} aria-hidden="true" />
            ประวัติลิงก์
          </NavLink>
        </nav>
        <p className="sidebar-note">
          ลิงก์ของคุณ
          <br />
          พร้อมแชร์ในที่เดียว
        </p>
      </aside>
      <main id="main" className="workspace-main">
        {children}
      </main>
    </div>
  );
}
