export function ErrorNotice({ message }: { message: string }) {
  return (
    <p role="alert" className="alert alert-error">
      {message}
    </p>
  );
}
export function Loading() {
  return (
    <p role="status" className="loading">
      กำลังโหลดข้อมูล…
    </p>
  );
}
export function Status({ value }: { value: string }) {
  const names: Record<string, string> = {
    active: "ใช้งานอยู่",
    disabled: "ปิดใช้งาน",
    expired: "หมดอายุ",
  };
  return (
    <span className={`status status-${value}`}>
      <span aria-hidden="true">●</span>
      {names[value]}
    </span>
  );
}
