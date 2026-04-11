import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/boss/subscription — 获取当前老板的订阅状态 */
export async function GET(req: NextRequest) {
  try {
    // 从 cookie 提取 bossId
    const token = req.cookies.get("pl_boss")?.value || "";
    const bossIdMatch = token.match(/^boss:(\d+):/);
    if (!bossIdMatch) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }
    const bossId = parseInt(bossIdMatch[1]);

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT s.id, s.status, s."billingCycle", s."trialStartsAt", s."trialEndsAt",
              s."currentPeriodStart", s."currentPeriodEnd", s."cancelledAt", s."expiresAt",
              s."lastActivityAt", s."dailySummaryEnabled",
              p.id as "planId", p.code as "planCode", p.name as "planName",
              p."monthlyPrice", p."yearlyPrice", p.features, p."aiQuota", p."maxProjects"
       FROM "Subscription" s
       JOIN "Plan" p ON s."planId" = p.id
       WHERE s."bossId" = ${bossId}`
    );

    if (rows.length === 0) {
      return Response.json({ subscription: null });
    }

    const r = rows[0];
    const features = typeof r.features === "string" ? JSON.parse(r.features) : r.features;
    const now = new Date();

    // 判断是否活跃
    let isActive = false;
    if (r.status === "active" && (!r.currentPeriodEnd || new Date(r.currentPeriodEnd) > now)) {
      isActive = true;
    }
    if (r.status === "trial" && (!r.trialEndsAt || new Date(r.trialEndsAt) > now)) {
      isActive = true;
    }
    if (r.status === "cancelled" && r.currentPeriodEnd && new Date(r.currentPeriodEnd) > now) {
      isActive = true;
    }

    // 计算剩余天数
    const endDate = r.trialEndsAt || r.currentPeriodEnd || r.expiresAt;
    const daysRemaining = endDate ? Math.max(0, Math.ceil((new Date(endDate).getTime() - now.getTime()) / 86400000)) : null;

    // AI 用量
    const periodStart = r.currentPeriodStart || r.trialStartsAt || now;
    const aiUsedRows = await prisma.$queryRawUnsafe<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM "AiUsage" WHERE "bossId" = ${bossId} AND "createdAt" >= '${new Date(periodStart).toISOString()}'`
    );
    const aiUsed = Number(aiUsedRows[0]?.count || 0);

    return Response.json({
      subscription: {
        id: r.id,
        status: r.status,
        isActive,
        billingCycle: r.billingCycle,
        trialStartsAt: r.trialStartsAt?.toISOString() || null,
        trialEndsAt: r.trialEndsAt?.toISOString() || null,
        currentPeriodStart: r.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: r.currentPeriodEnd?.toISOString() || null,
        daysRemaining,
        dailySummaryEnabled: r.dailySummaryEnabled,
        plan: {
          id: r.planId,
          code: r.planCode,
          name: r.planName,
          monthlyPrice: r.monthlyPrice,
          yearlyPrice: r.yearlyPrice,
          monthlyPriceYuan: (r.monthlyPrice / 100).toFixed(2),
          yearlyPriceYuan: r.yearlyPrice > 0 ? (r.yearlyPrice / 100).toFixed(2) : null,
          features,
          aiQuota: r.aiQuota,
          maxProjects: r.maxProjects,
        },
        ai: {
          used: aiUsed,
          limit: r.aiQuota,
          remaining: r.aiQuota === -1 ? -1 : Math.max(0, r.aiQuota - aiUsed),
        },
      },
    });
  } catch (e) {
    console.error("boss subscription GET error:", e);
    return Response.json({ subscription: null });
  }
}
