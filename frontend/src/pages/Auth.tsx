import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api, ApiError, errorMessage } from "../services/api";
import type { UserInfo } from "../types/api";
import { ErrorNotice } from "../components/Feedback";
export function Auth({
  mode,
  onLogin,
}: {
  mode: "login" | "register";
  onLogin: (user: UserInfo) => void;
}) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    try {
      const result = await api<{ user: UserInfo }>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({
          name: isRegister ? name : undefined,
          email,
          password,
        }),
      });
      onLogin(result.user);
      navigate("/dashboard");
    } catch (error) {
      setError(errorMessage(error));
      if (error instanceof ApiError) setFields(error.fields);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-main">
      <section className="panel auth-panel">
        <p className="eyebrow">
          <span className="accent-rule" />
          พื้นที่สำหรับลิงก์ของคุณ
        </p>
        <h1>{isRegister ? "เริ่มต้นใช้งาน" : "ยินดีต้อนรับกลับ"}</h1>
        <p className="muted mt-2 mb-6">
          {isRegister
            ? "สร้างบัญชีเพื่อย่อลิงก์และติดตามสถิติ"
            : "เข้าสู่ระบบเพื่อจัดการลิงก์ของคุณ"}
        </p>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && (
            <div>
              <label htmlFor="name">ชื่อ</label>
              <input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                aria-invalid={Boolean(fields.name)}
              />
              {fields.name && <p className="error-text">{fields.name}</p>}
            </div>
          )}
          <div>
            <label htmlFor="email">อีเมล</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
              aria-invalid={Boolean(fields.email)}
            />
            {fields.email && <p className="error-text">{fields.email}</p>}
          </div>
          <div>
            <label htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              maxLength={128}
              aria-invalid={Boolean(fields.password)}
              aria-describedby="password-help"
            />
            <p className="muted text-sm mt-2" id="password-help">
              อย่างน้อย 10 ตัวอักษร
            </p>
            {fields.password && <p className="error-text">{fields.password}</p>}
          </div>
          {error && <ErrorNotice message={error} />}
          <button className="btn btn-primary" disabled={busy}>
            {busy
              ? "กำลังดำเนินการ…"
              : isRegister
                ? "สมัครสมาชิก"
                : "เข้าสู่ระบบ"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
        <p className="muted text-sm mt-6">
          {isRegister ? "มีบัญชีแล้ว? " : "ยังไม่มีบัญชี? "}
          <Link className="text-link" to={isRegister ? "/login" : "/register"}>
            {isRegister ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </Link>
        </p>
      </section>
    </main>
  );
}
