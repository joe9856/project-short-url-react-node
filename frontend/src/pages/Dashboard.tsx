import { useState } from "react";
import { Workspace } from "../components/Navigation";
import { CreateForm } from "../components/CreateForm";
import { History } from "../components/History";
import { Analytics } from "../components/Analytics";
import type { UserInfo } from "../types/api";
export function Dashboard({ user }: { user: UserInfo }) {
  const [refresh, setRefresh] = useState(0);
  return (
    <Workspace>
      <div className="page-heading">
        <p className="eyebrow">
          <span className="accent-rule" />
          ภาพรวมของคุณ
        </p>
        <h1>แดชบอร์ด</h1>
        <p className="muted">
          สวัสดี {user.name} · จัดการลิงก์และติดตามผลได้ในที่เดียว
        </p>
      </div>
      <CreateForm authenticated onCreated={() => setRefresh(refresh + 1)} />
      <Analytics refresh={refresh} showSummary />
      <History refresh={refresh} />
    </Workspace>
  );
}
export function HistoryPage() {
  return (
    <Workspace>
      <div className="page-heading">
        <h1>ประวัติลิงก์</h1>
        <p className="muted">ค้นหาและจัดการลิงก์ทั้งหมดของคุณ</p>
      </div>
      <History />
    </Workspace>
  );
}
