import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/worker/dashboard
 * Header: x-worker-id
 *
 * 工人首页数据：积分、连续作业天数、本月统计、最近奖罚
 */
export async function GET(req: NextRequest) {
  const workerId = req.headers.get("x-worker-id");
  if (!workerId) return Response.json({ error: "缺少 workerId" }, { status: 400 });

  try {
    // 1. 工人基础信息（含积分）
    const workers = await prisma.$queryRawUnsafe<
      { id: string; name: string; project: string; wageType: string | null; wageRate: number | null; rewardPoints: number; penaltyPoints: number; isLocked: boolean }[]
    >(`SELECT id, name, project, "wageType", "wageRate", "rewardPoints", "penaltyPoints", "isLocked" FROM "Worker" WHERE id = '${workerId}'`);
    if (workers.length === 0) return Response.json({ error: "工人不存在" }, { status: 404 });
    const w = workers[0];

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartISO = monthStart.toISOString();

    // 2. 本月出勤天数
    const attendanceRows = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
      `SELECT COUNT(DISTINCT DATE("createdAt"))::text as cnt FROM "CheckIn" WHERE "workerId" = '${workerId}' AND "createdAt" >= '${monthStartISO}'`
    );
    const attendance = parseInt(attendanceRows[0]?.cnt || "0", 10);

    // 3. 本月报量统计（按工序汇总）
    const reportStats = await prisma.$queryRawUnsafe<
      { task: string; totalReports: string; totalValue: string; verifiedValue: string }[]
    >(
      `SELECT task,
         COUNT(*)::text as "totalReports",
         COALESCE(SUM("totalValue"), 0)::text as "totalValue",
         COALESCE(SUM("totalValue") FILTER (WHERE status = 'verified'), 0)::text as "verifiedValue"
       FROM "Report"
       WHERE "workerId" = '${workerId}' AND "createdAt" >= '${monthStartISO}'
       GROUP BY task ORDER BY "totalValue" DESC`
    );

    const totalValue = reportStats.reduce((s, r) => s + parseFloat(r.totalValue), 0);
    const verifiedValue = reportStats.reduce((s, r) => s + parseFloat(r.verifiedValue), 0);

    // 4. 本月照片数量
    const photoRows = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
      `SELECT COALESCE(SUM(array_length("photoUrls", 1)), 0)::text as cnt FROM "Report" WHERE "workerId" = '${workerId}' AND "createdAt" >= '${monthStartISO}'`
    );
    const photoCount = parseInt(photoRows[0]?.cnt || "0", 10);

    // 5. 连续作业天数（基于有报量的日期）
    const streak = await calcConsecutiveDays(workerId);

    // 6. 最近奖励
    const recentRewards = await prisma.$queryRawUnsafe<
      { id: number; points: number; amount: number; reason: string; createdAt: string }[]
    >(
      `SELECT id, points, amount, reason, "createdAt"::text FROM "WorkerReward" WHERE "workerId" = '${workerId}' ORDER BY "createdAt" DESC LIMIT 5`
    );

    // 7. 最近处罚
    const recentPenalties = await prisma.$queryRawUnsafe<
      { id: number; points: number; reason: string; fineAmount: number; finePaid: boolean; categoryName: string; createdAt: string }[]
    >(
      `SELECT wp.id, wp.points, wp.reason, wp."fineAmount", wp."finePaid", pc.name as "categoryName", wp."createdAt"::text
       FROM "WorkerPenalty" wp JOIN "PenaltyCategory" pc ON wp."categoryId" = pc.id
       WHERE wp."workerId" = '${workerId}' ORDER BY wp."createdAt" DESC LIMIT 5`
    );

    // 8. 日工月度收益
    const monthEarnings = w.wageType === "daily" && w.wageRate ? attendance * w.wageRate : null;

    return Response.json({
      worker: { id: w.id, name: w.name, project: w.project, wageType: w.wageType, wageRate: w.wageRate },
      points: { rewardPoints: Number(w.rewardPoints), penaltyPoints: Number(w.penaltyPoints), isLocked: w.isLocked },
      streak,
      monthStats: {
        attendance,
        totalValue: Math.round(totalValue * 100) / 100,
        verifiedValue: Math.round(verifiedValue * 100) / 100,
        photoCount,
        reportStats: reportStats.map((r) => ({
          task: r.task,
          totalReports: parseInt(r.totalReports, 10),
          totalValue: parseFloat(r.totalValue),
          verifiedValue: parseFloat(r.verifiedValue),
        })),
        monthEarnings,
      },
      recentRewards: recentRewards.map((r) => ({ ...r, amount: Number(r.amount), points: Number(r.points) })),
      recentPenalties: recentPenalties.map((p) => ({ ...p, fineAmount: Number(p.fineAmount), points: Number(p.points) })),
    });
  } catch (e) {
    console.error("worker/dashboard error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}

/** 计算连续作业天数（基于有报量记录的日期，非打卡） */
async function calcConsecutiveDays(workerId: string): Promise<{ days: number; nextThreshold: number; nextReward: number }> {
  const STREAK_TIERS = [
    { days: 3, points: 5 },
    { days: 5, points: 10 },
    { days: 7, points: 20 },
    { days: 15, points: 30 },
    { days: 30, points: 50 },
  ];

  try {
    const dates = await prisma.$queryRawUnsafe<{ d: Date }[]>(
      `SELECT DISTINCT DATE("createdAt") as d FROM "Report"
       WHERE "workerId" = '${workerId}' AND "createdAt" >= CURRENT_DATE - INTERVAL '60 days'
       ORDER BY d DESC`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let checkDate = new Date(today);

    // 没有今天的报量就从昨天开始算
    const hasToday = dates.some((r) => {
      const d = new Date(r.d);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    if (!hasToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (const row of dates) {
      const d = new Date(row.d);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (d.getTime() < checkDate.getTime()) {
        break;
      }
    }

    // 找下一个阈值
    let nextThreshold = STREAK_TIERS[0].days;
    let nextReward = STREAK_TIERS[0].points;
    for (const tier of STREAK_TIERS) {
      if (streak < tier.days) {
        nextThreshold = tier.days;
        nextReward = tier.points;
        break;
      }
      // 已经超过最后一个档位
      nextThreshold = tier.days;
      nextReward = tier.points;
    }

    return { days: streak, nextThreshold, nextReward };
  } catch {
    return { days: 0, nextThreshold: 3, nextReward: 5 };
  }
}
