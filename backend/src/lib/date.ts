import { AppError } from "./errors.js";
export function bangkokDay(date: Date): string {
  // บวก 7 ชั่วโมงก่อนอ่านวัน UTC เพื่อแบ่งวันตามประเทศไทย ไม่ตามเวลาของ server
  return new Date(date.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
export function dateRange(from?: string, to?: string) {
  const endDay = to || bangkokDay(new Date());
  const startDay = from || bangkokDay(new Date(Date.now() - 29 * 86400000));
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(startDay) || !pattern.test(endDay))
    throw new AppError(400, "INVALID_DATE", "วันที่ต้องเป็น YYYY-MM-DD");
  const start = new Date(`${startDay}T00:00:00+07:00`);
  const end = new Date(`${endDay}T00:00:00+07:00`);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    bangkokDay(start) !== startDay ||
    bangkokDay(end) !== endDay ||
    end < start ||
    end.getTime() - start.getTime() > 365 * 86400000
  ) {
    throw new AppError(
      400,
      "INVALID_DATE",
      "เลือกวันที่ที่มีจริง เรียงจากเก่าไปใหม่ และไม่เกิน 366 วัน",
    );
  }
  return {
    from: startDay,
    to: endDay,
    start,
    endExclusive: new Date(end.getTime() + 86400000),
  };
}
