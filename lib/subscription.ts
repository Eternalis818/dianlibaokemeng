import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanFeatures {
  checkin?: boolean;
  reports?: boolean;
  approval?: boolean;
  accounting?: boolean;
  quantities?: boolean;
  visaPL?: boolean;
  ai?: boolean;
  dataAnalysis?: boolean;
  prioritySupport?: boolean;
  dailyPush?: boolean;
  weeklyReport?: boolean;
  customReports?: boolean;
  apiIntegration?: boolean;
}

interface SubscriptionWithPlan {
  id: number;
  bossId: number;
  planId: number;
  status: string;
  billingCycle: string;
  trialStartsAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  expiresAt: Date | null;
  lastActivityAt: Date;
  dailySummaryEnabled: boolean;
  plan: {
    id: number;
    code: string;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    features: PlanFeatures;
    aiQuota: number;
    maxProjects: number;
  };
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/** 获取老板的订阅状态（含套餐信息） */
export async function getSubscription(bossId: number): Promise<SubscriptionWithPlan | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT s.*, p.code as "planCode", p.name as "planName",
              p."monthlyPrice", p."yearlyPrice", p.features, p."aiQuota", p."maxProjects"
       FROM "Subscription" s
       JOIN "Plan" p ON s."planId" = p.id
       WHERE s."bossId" = ${bossId}`
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    // Map flat result to nested structure
    const features = typeof r.features === 'string' ? JSON.parse(r.features as unknown as string) : r.features;
    return {
      ...r,
      plan: {
        id: r.planId,
        code: (r as any).planCode,
        name: (r as any).planName,
        monthlyPrice: (r as any).monthlyPrice,
        yearlyPrice: (r as any).yearlyPrice,
        features: features as PlanFeatures,
        aiQuota: (r as any).aiQuota,
        maxProjects: (r as any).maxProjects,
      },
    };
  } catch {
    return null;
  }
}

/** 订阅是否活跃 */
export function isActive(sub: SubscriptionWithPlan): boolean {
  const now = new Date();
  if (sub.status === "active") {
    if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < now) return false;
    return true;
  }
  if (sub.status === "trial") {
    if (sub.trialEndsAt && new Date(sub.trialEndsAt) < now) return false;
    return true;
  }
  // cancelled 但还在有效期内
  if (sub.status === "cancelled") {
    if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now) return true;
    return false;
  }
  return false;
}

/** 是否拥有某项功能 */
export function hasFeature(sub: SubscriptionWithPlan, feature: string): boolean {
  const features = sub.plan.features as Record<string, boolean>;
  return features[feature] === true;
}

/** 功能检查中间件 — 返回 bossId 或 403 Response */
export async function requireFeature(
  bossId: number,
  feature: string
): Promise<{ ok: true; sub: SubscriptionWithPlan } | { ok: false; response: Response }> {
  const sub = await getSubscription(bossId);
  if (!sub) {
    return {
      ok: false,
      response: Response.json({ error: "未找到订阅信息，请联系管理员" }, { status: 402 }),
    };
  }
  if (!isActive(sub)) {
    return {
      ok: false,
      response: Response.json({ error: "订阅已过期，请续费后继续使用", expired: true }, { status: 402 }),
    };
  }
  if (!hasFeature(sub, feature)) {
    const planName = sub.plan.name;
    return {
      ok: false,
      response: Response.json(
        { error: `当前套餐（${planName}）不包含此功能，请升级套餐`, upgradeNeeded: true },
        { status: 403 }
      ),
    };
  }
  return { ok: true, sub };
}

/** 更新老板最后活跃时间 */
export async function trackActivity(bossId: number): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Subscription" SET "lastActivityAt" = NOW() WHERE "bossId" = ${bossId}`
    );
  } catch { /* non-critical */ }
}
