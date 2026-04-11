import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/workers/[id]/summary — 工人总览（积分+奖励+处罚+规则确认） */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const workerRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Worker" WHERE id = '${id}'`);
    if (workerRows.length === 0) return Response.json({ error: "工人不存在" }, { status: 404 });
    const w = workerRows[0];

    const [rewards, penalties, unconfirmedRules] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "WorkerReward" WHERE "workerId" = '${id}' ORDER BY "createdAt" DESC LIMIT 20`),
      prisma.$queryRawUnsafe<any[]>(`SELECT wp.*, pc.name as "categoryName" FROM "WorkerPenalty" wp JOIN "PenaltyCategory" pc ON wp."categoryId" = pc.id WHERE wp."workerId" = '${id}' ORDER BY wp."createdAt" DESC LIMIT 20`),
      // 未确认的活跃规则
      prisma.$queryRawUnsafe<{ id: number; title: string; content: string; version: number }[]>(
        `SELECT sr.id, sr.title, sr.content, sr.version FROM "SiteRule" sr
         WHERE sr."isActive" = true AND NOT EXISTS (
           SELECT 1 FROM "RuleConfirmation" rc WHERE rc."workerId" = '${id}' AND rc."ruleId" = sr.id AND rc."ruleVersion" = sr.version
         )`
      ),
    ]);

    return Response.json({
      worker: w,
      rewards: rewards.map((r: any) => ({ ...r, amount: Number(r.amount) })),
      penalties: penalties.map((p: any) => ({ ...p, fineAmount: Number(p.fineAmount || 0) })),
      unconfirmedRules,
    });
  } catch (e) {
    console.error("worker summary error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}
