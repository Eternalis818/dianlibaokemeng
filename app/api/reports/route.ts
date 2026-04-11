import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── 连续作业自动奖励 ────────────────────────────────────────────────────────
const STREAK_TIERS = [
  { days: 3, points: 5, label: "连续作业3天" },
  { days: 5, points: 10, label: "连续作业5天" },
  { days: 7, points: 20, label: "连续作业7天" },
  { days: 15, points: 30, label: "连续作业15天" },
  { days: 30, points: 50, label: "连续作业30天" },
];

async function checkAndAwardStreak(workerId: string, workerName: string) {
  try {
    // 计算连续作业天数
    const dates = await prisma.$queryRawUnsafe<{ d: Date }[]>(
      `SELECT DISTINCT DATE("createdAt") as d FROM "Report"
       WHERE "workerId" = '${workerId}' AND "createdAt" >= CURRENT_DATE - INTERVAL '60 days'
       ORDER BY d DESC`
    );

    const today = new Date(); today.setHours(0, 0, 0, 0);
    let streak = 0;
    let checkDate = new Date(today);

    const hasToday = dates.some((r) => {
      const d = new Date(r.d); d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    if (!hasToday) checkDate.setDate(checkDate.getDate() - 1);

    for (const row of dates) {
      const d = new Date(row.d); d.setHours(0, 0, 0, 0);
      if (d.getTime() === checkDate.getTime()) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else if (d.getTime() < checkDate.getTime()) break;
    }

    if (streak === 0) return;

    // 检查每个阈值是否已奖励
    for (const tier of STREAK_TIERS) {
      if (streak < tier.days) continue;
      // 查是否已有该阈值的奖励（用 reason 去重）
      const existing = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
        `SELECT COUNT(*)::text as cnt FROM "WorkerReward"
         WHERE "workerId" = '${workerId}' AND reason = '${tier.label}'`
      );
      if (parseInt(existing[0]?.cnt || "0", 10) === 0) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "WorkerReward" ("workerId", points, amount, reason, "createdBy", "createdAt")
           VALUES ('${workerId}', ${tier.points}, 0, '${tier.label}', 'system', NOW())`
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "Worker" SET "rewardPoints" = COALESCE("rewardPoints", 0) + ${tier.points} WHERE id = '${workerId}'`
        );
      }
    }
  } catch (e) {
    console.error("streak reward error:", e);
    // 不阻断主流程
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const workerId = searchParams.get("workerId");
  const year = searchParams.get("year");
  const status = searchParams.get("status");
  const limitParam = searchParams.get("limit");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (project) where.project = project;
  if (workerId) where.workerId = workerId;
  if (status && status !== "all") where.status = status;
  if (year) {
    const y = Number(year);
    where.createdAt = {
      gte: new Date(`${y}-01-01T00:00:00Z`),
      lt: new Date(`${y + 1}-01-01T00:00:00Z`),
    };
  }

  try {
    const reports = await prisma.report.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
      take: limitParam ? Number(limitParam) : 100,
    });
    return Response.json(reports);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { workerId, workerName, project, task, spec, qty, photoUrls, gpsLat, gpsLng } = body;

  if (!workerId || !task || !qty) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker) return Response.json({ error: "工人不存在" }, { status: 404 });

  const resolvedProject = project ?? worker.project;

  // ── 计价引擎：自动匹配单价（Task #4）──────────────────────────────────────
  let priceItemId: number | null = null;
  let unitPrice: number | null = null;
  let totalValue: number | null = null;

  try {
    // 候选：绑定该项目或全局通用的激活价格库中所有条目
    const candidates = await prisma.priceItem.findMany({
      where: {
        library: {
          isActive: true,
          OR: [{ projectCode: resolvedProject }, { projectCode: null }],
        },
      },
    });

    if (candidates.length > 0) {
      const needle = `${task} ${spec ?? ""}`.toLowerCase();
      // 简单评分：关键词命中数
      let best: (typeof candidates)[0] | null = null;
      let bestScore = 0;

      for (const item of candidates) {
        let score = 0;
        const haystack = `${item.name} ${item.code} ${(item.keywords ?? []).join(" ")} ${item.spec ?? ""}`.toLowerCase();
        for (const word of needle.split(/\s+/).filter(Boolean)) {
          if (haystack.includes(word)) score++;
        }
        if (score > bestScore) { bestScore = score; best = item; }
      }

      if (best && bestScore > 0) {
        priceItemId = best.id;
        unitPrice = best.unitPrice;
        const qtyNum = parseFloat(qty);
        if (!isNaN(qtyNum)) totalValue = Math.round(qtyNum * best.unitPrice * 100) / 100;
      }
    }
  } catch {
    // 匹配失败不阻断提交
  }
  // ─────────────────────────────────────────────────────────────────────────

  const report = await prisma.report.create({
    data: {
      workerId,
      workerName: workerName ?? worker.name,
      project: resolvedProject,
      task,
      spec: spec ?? "—",
      qty,
      photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
      gpsLat: gpsLat ?? null,
      gpsLng: gpsLng ?? null,
      priceItemId,
      unitPrice,
      totalValue,
    },
  });

  // 连续作业自动奖励（异步，不阻断返回）
  checkAndAwardStreak(workerId, workerName ?? worker.name).catch(() => {});

  return Response.json(report);
}
