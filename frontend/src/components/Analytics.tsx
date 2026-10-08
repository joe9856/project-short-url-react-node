import { useState, useEffect, type FormEvent } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChartNoAxesCombined,
  Link2,
  MousePointer2,
  CircleCheck,
} from "lucide-react";
import { api, errorMessage, today } from "../services/api";
import type { StatsInfo } from "../types/api";
import { ErrorNotice, Loading } from "./Feedback";
export function Analytics({
  id,
  refresh = 0,
  showSummary = false,
}: {
  id?: string;
  refresh?: number;
  showSummary?: boolean;
}) {
  const [from, setFrom] = useState(
    new Date(Date.now() - 29 * 86400000 + 7 * 3600000)
      .toISOString()
      .slice(0, 10),
  );
  const [to, setTo] = useState(today());
  const [range, setRange] = useState({ from, to });
  const [stats, setStats] = useState<StatsInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const path = id ? `/api/links/${id}/stats` : "/api/stats";
    api<StatsInfo>(`${path}?${new URLSearchParams(range)}`, {
      signal: controller.signal,
    })
      .then(setStats)
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range, id, refresh, retry]);
  function submit(event: FormEvent) {
    event.preventDefault();
    setRange({ from, to });
  }
  const labels: Record<string, string> = {
    direct: "เปิดโดยตรง",
    desktop: "คอมพิวเตอร์",
    mobile: "มือถือ",
    tablet: "แท็บเล็ต",
    unknown: "ไม่ทราบ",
  };
  return (
    <>
      {showSummary && stats && (
        <div className="summary-grid">
          {[
            {
              title: "ลิงก์ทั้งหมด",
              count: stats.summary.totalLinks,
              icon: Link2,
            },
            {
              title: "ลิงก์ที่ใช้งาน",
              count: stats.summary.activeLinks,
              icon: CircleCheck,
            },
            {
              title: "คลิกทั้งหมด",
              count: stats.summary.totalClicks,
              icon: MousePointer2,
            },
          ].map((item) => (
            <div className="summary-card" key={item.title}>
              <div>
                <p className="muted text-sm">{item.title}</p>
                <strong>{item.count.toLocaleString("th-TH")}</strong>
              </div>
              <item.icon size={22} aria-hidden="true" />
            </div>
          ))}
        </div>
      )}
      <section className="panel">
        <div className="section-heading">
          <ChartNoAxesCombined size={22} aria-hidden="true" />
          <h2>สถิติการเปิดลิงก์</h2>
        </div>
        <form className="date-tools" onSubmit={submit}>
          <div>
            <label htmlFor={`from-${id || "all"}`}>ตั้งแต่</label>
            <input
              id={`from-${id || "all"}`}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor={`to-${id || "all"}`}>ถึง</label>
            <input
              id={`to-${id || "all"}`}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-secondary">ดูสถิติ</button>
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
          stats && (
            <>
              <div className="chart-caption">
                <strong>
                  {stats.periodClicks.toLocaleString("th-TH")}{" "}
                  คลิกในช่วงที่เลือก
                </strong>
                <span className="muted text-sm">
                  แบ่งวันตามเวลาไทย · รวมการเปิดซ้ำและบอต
                </span>
              </div>
              <div
                className="chart"
                role="img"
                aria-label={`กราฟคลิกรายวัน รวม ${stats.periodClicks} คลิก`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.daily}
                    margin={{ top: 20, right: 12, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => v.slice(5)}
                      minTickGap={30}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area
                      isAnimationActive={false}
                      type="linear"
                      dataKey="clicks"
                      name="คลิก"
                      stroke="#c92720"
                      fill="#fff1f0"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {stats.periodClicks === 0 && (
                <p className="muted text-sm">
                  ยังไม่มีการเปิดลิงก์ในช่วงวันที่นี้
                </p>
              )}
              <div className="breakdown-grid">
                {[
                  { title: "แหล่งที่มา", rows: stats.sources },
                  { title: "อุปกรณ์", rows: stats.devices },
                ].map((group) => (
                  <div key={group.title}>
                    <h3>{group.title}</h3>
                    {group.rows.length === 0 ? (
                      <p className="muted text-sm mt-3">ยังไม่มีข้อมูล</p>
                    ) : (
                      <ul className="breakdown">
                        {group.rows.map((row) => (
                          <li key={row.name}>
                            <span className="url-text">
                              {labels[row.name] || row.name}
                            </span>
                            <strong>{row.clicks}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              <details className="advanced-options">
                <summary>ดูข้อมูลรายวันแบบตาราง</summary>
                <table className="daily-table">
                  <caption className="sr-only">คลิกแต่ละวันตามเวลาไทย</caption>
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>คลิก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.daily.map((day) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td>{day.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )
        )}
      </section>
    </>
  );
}
