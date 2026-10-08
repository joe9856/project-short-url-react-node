import { useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { History as HistoryIcon, Search, ArrowUpRight } from "lucide-react";
import { api, errorMessage, thaiDate } from "../services/api";
import type { LinkList } from "../types/api";
import { ErrorNotice, Loading, Status } from "./Feedback";
export function History({ refresh = 0 }: { refresh?: number }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LinkList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<LinkList>(
      `/api/links?${new URLSearchParams({ q: query, status, page: String(page) })}`,
      { signal: controller.signal },
    )
      .then(setData)
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    // ยกเลิก request เก่าเมื่อ filter เปลี่ยน ป้องกันข้อมูลเก่ามาแทนข้อมูลใหม่
    return () => controller.abort();
  }, [query, status, page, refresh, retry]);
  function submit(event: FormEvent) {
    event.preventDefault();
    setQuery(search);
    setPage(1);
  }
  return (
    <section className="panel" id="history">
      <div className="section-heading">
        <HistoryIcon size={22} aria-hidden="true" />
        <h2>ประวัติลิงก์</h2>
      </div>
      <form className="history-tools" onSubmit={submit}>
        <div className="search-control">
          <label className="sr-only" htmlFor="search">
            ค้นหาลิงก์
          </label>
          <Search size={18} aria-hidden="true" />
          <input
            id="search"
            placeholder="ค้นหา URL หรือชื่อลิงก์"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={200}
          />
        </div>
        <button className="btn btn-secondary">ค้นหา</button>
        <label className="sr-only" htmlFor="status-filter">
          สถานะ
        </label>
        <select
          id="status-filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">ทุกสถานะ</option>
          <option value="active">ใช้งานอยู่</option>
          <option value="disabled">ปิดใช้งาน</option>
          <option value="expired">หมดอายุ</option>
        </select>
      </form>
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
        data && (
          <>
            {data.links.length === 0 ? (
              <div className="empty-state">
                <Link2Empty />
                <h3>ยังไม่มีลิงก์ที่ตรงกับรายการนี้</h3>
                <p className="muted">
                  สร้างลิงก์แรก หรือเปลี่ยนคำค้นและตัวกรอง
                </p>
              </div>
            ) : (
              <div className="history-list">
                <div className="history-row history-label" aria-hidden="true">
                  <span>ลิงก์ / URL ต้นฉบับ</span>
                  <span>สถานะ</span>
                  <span>คลิก</span>
                  <span>สร้างเมื่อ</span>
                </div>
                {data.links.map((link) => (
                  <article className="history-row" key={link.id}>
                    <div className="min-w-0">
                      <Link className="history-link" to={`/links/${link.id}`}>
                        {link.code}
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </Link>
                      <p className="url-text muted text-sm">
                        {link.originalUrl}
                      </p>
                    </div>
                    <Status value={link.status} />
                    <span className="click-count">
                      {link.clicks.toLocaleString("th-TH")}{" "}
                      <span className="mobile-label">คลิก</span>
                    </span>
                    <span className="muted text-sm">
                      {thaiDate(link.createdAt)}
                    </span>
                  </article>
                ))}
              </div>
            )}
            <div className="pagination">
              <p className="muted text-sm">
                {data.pagination.total} ลิงก์ · หน้า {page} /{" "}
                {Math.max(1, data.pagination.pages)}
              </p>
              <div className="actions">
                <button
                  className="btn btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  ก่อนหน้า
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={page >= data.pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </>
        )
      )}
    </section>
  );
}
function Link2Empty() {
  return <HistoryIcon size={28} aria-hidden="true" />;
}
