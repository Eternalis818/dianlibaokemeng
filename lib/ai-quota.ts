import { prisma } from "@/lib/prisma";
import { getSubscription, isActive } from "./subscription";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/** 检查 AI 调用配额 */
export async function checkQuota(bossId: number, feature: string): Promise<QuotaResult> {
  const sub = await getSubscription(bossId);

  // 没有订阅信息 → 禁止
  if (!sub || !isActive(sub)) {
    return { allowed: false, remaining: 0, limit: 0, used: 0 };
  }

  const aiQuota = sub.plan.aiQuota;

  // aiQuota === -1 → 按量付费（终身版），允许调用
  if (aiQuota === -1) {
    return { allowed: true, remaining: -1, limit: -1, used: 0 };
  }

  // aiQuota === 0 且 plan 没有 ai 功能 → 禁止
  if (aiQuota === 0) {
    return { allowed: false, remaining: 0, limit: 0, used: 0 };
  }

  // 计算当前计费周期内的用量
  const periodStart = sub.currentPeriodStart || sub.trialStartsAt || new Date();
  const usedRows = await prisma.$queryRawUnsafe<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM "AiUsage" WHERE "bossId" = ${bossId} AND feature = '${feature}' AND "createdAt" >= '${periodStart.toISOString()}'`
  );
  const used = Number(usedRows[0]?.count || 0);
  const remaining = Math.max(0, aiQuota - used);

  return {
    allowed: used < aiQuota,
    remaining,
    limit: aiQuota,
    used,
  };
}

/** 记录一次 AI 使用 */
export async function recordUsage(
  bossId: number,
  feature: string,
  tokensUsed: number = 0,
  costFen: number = 0
): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AiUsage" ("bossId", feature, "tokensUsed", "costFen", "createdAt") VALUES (${bossId}, '${feature}', ${tokensUsed}, ${costFen}, NOW())`
    );
  } catch (e) {
    console.error("ai-quota recordUsage error:", e);
  }
}

/** 获取老板的 AI 使用汇总 */
export async function getUsageSummary(bossId: number): Promise<QuotaResult[]> {
  const sub = await getSubscription(bossId);
  if (!sub) return [];

  const periodStart = sub.currentPeriodStart || sub.trialStartsAt || new Date();
  const features = ["boss_summary", "worker_chat", "smart_parse", "photo_review"];
  const aiQuota = sub.plan.aiQuota;

  const results: QuotaResult[] = [];
  for (const feature of features) {
    const usedRows = await prisma.$queryRawUnsafe<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM "AiUsage" WHERE "bossId" = ${bossId} AND feature = '${feature}' AND "createdAt" >= '${periodStart.toISOString()}'`
    );
    const used = Number(usedRows[0]?.count || 0);
    results.push({
      allowed: aiQuota === -1 || used < aiQuota,
      remaining: aiQuota === -1 ? -1 : Math.max(0, aiQuota - used),
      limit: aiQuota,
      used,
    });
  }

  return results;
}
