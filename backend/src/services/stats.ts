import { prisma } from "../lib/prisma.js";
import { bangkokDay, dateRange } from "../lib/date.js";
import { ownedLink } from "./links.js";
export async function statistics(
  userId: string,
  from?: string,
  to?: string,
  id?: string,
) {
  if (id) await ownedLink(userId, id);
  const range = dateRange(from, to);
  const whereLink = { userId, ...(id ? { id } : {}) };
  const [
    totalLinks,
    activeLinks,
    totalClicks,
    dailyRows,
    sourceRows,
    deviceRows,
  ] = await prisma.$transaction([
    prisma.link.count({ where: whereLink }),
    prisma.link.count({
      where: {
        ...whereLink,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
    prisma.clickEvent.count({ where: { link: whereLink } }),
    // Group ในฐานข้อมูลก่อน ไม่โหลด event ทุกแถวเข้าหน่วยความจำ
    prisma.$queryRaw<
      { day: string; clicks: bigint }[]
    >`SELECT DATE_FORMAT(DATE_ADD(c.clicked_at, INTERVAL 7 HOUR), '%Y-%m-%d') AS day, COUNT(*) AS clicks
      FROM click_events c JOIN links l ON l.id = c.link_id WHERE l.user_id = ${userId} AND (${id || null} IS NULL OR l.id = ${id || null})
      AND c.clicked_at >= ${range.start} AND c.clicked_at < ${range.endExclusive} GROUP BY day ORDER BY day`,
    prisma.clickEvent.groupBy({
      by: ["referrerHost"],
      where: {
        link: whereLink,
        clickedAt: { gte: range.start, lt: range.endExclusive },
      },
      _count: true,
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
    prisma.clickEvent.groupBy({
      by: ["deviceType"],
      where: {
        link: whereLink,
        clickedAt: { gte: range.start, lt: range.endExclusive },
      },
      _count: true,
      orderBy: { deviceType: "asc" },
    }),
  ]);
  const counts = new Map(dailyRows.map((row) => [row.day, Number(row.clicks)]));
  const daily: { date: string; clicks: number }[] = [];
  for (
    let date = range.start.getTime();
    date < range.endExclusive.getTime();
    date += 86400000
  ) {
    const day = bangkokDay(new Date(date));
    daily.push({ date: day, clicks: counts.get(day) || 0 });
  }
  return {
    summary: { totalLinks, activeLinks, totalClicks },
    from: range.from,
    to: range.to,
    timezone: "Asia/Bangkok",
    periodClicks: daily.reduce((sum, day) => sum + day.clicks, 0),
    daily,
    sources: sourceRows.map((row) => ({
      name: row.referrerHost || "direct",
      clicks: row._count,
    })),
    devices: deviceRows.map((row) => ({
      name: row.deviceType,
      clicks: row._count,
    })),
  };
}
