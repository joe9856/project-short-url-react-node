import { useEffect, useState, type ReactNode } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { ErrorNotice, Loading } from "./components/Feedback";
import { Home } from "./pages/Home";
import { Auth } from "./pages/Auth";
import { Dashboard, HistoryPage } from "./pages/Dashboard";
import { LinkDetails } from "./pages/LinkDetails";
import { api, ApiError, errorMessage } from "./services/api";
import type { UserInfo } from "./types/api";
export function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<{ user: UserInfo }>("/api/auth/me", { signal: controller.signal })
      .then((result) => setUser(result.user))
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) setUser(null);
        else setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  function protectedPage(children: ReactNode) {
    return user ? children : <Navigate to="/login" replace />;
  }
  return (
    <>
      <a className="skip-link" href="#main">
        ข้ามไปเนื้อหา
      </a>
      <Navigation user={user} />
      {loading ? (
        <main id="main" className="home-main">
          <Loading />
        </main>
      ) : error ? (
        <main id="main" className="home-main">
          <ErrorNotice message={error} />
          <button
            className="btn btn-secondary mt-3"
            onClick={() => setRetry(retry + 1)}
          >
            ลองใหม่
          </button>
        </main>
      ) : (
        <Routes>
          <Route path="/" element={<Home authenticated={Boolean(user)} />} />
          <Route
            path="/login"
            element={<Auth key="login" mode="login" onLogin={setUser} />}
          />
          <Route
            path="/register"
            element={<Auth key="register" mode="register" onLogin={setUser} />}
          />
          <Route
            path="/dashboard"
            element={protectedPage(user && <Dashboard user={user} />)}
          />
          <Route path="/history" element={protectedPage(<HistoryPage />)} />
          <Route path="/links/:id" element={protectedPage(<LinkDetails />)} />
          <Route
            path="*"
            element={
              <main id="main" className="home-main">
                <h1>ไม่พบหน้านี้</h1>
                <Link className="text-link" to="/">
                  กลับหน้าหลัก
                </Link>
              </main>
            }
          />
        </Routes>
      )}
    </>
  );
}
