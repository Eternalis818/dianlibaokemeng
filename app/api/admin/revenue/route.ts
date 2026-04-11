import { prisma } from "@/lib/prisma";

/** GET /api/admin/revenue — 收入统计 */
export async function GET() {
  try {
    // MRR: 月经常性收入（活跃的月付 + 年付折算月）
    const activeSubs = await prisma.$queryRawUnsafe<
      { planCode: string; planName: string; billingCycle: string; monthlyPrice: number; yearlyPrice: number; count: number }[]
    >(
      `SELECT p.code as "planCode", p.name as "planName", s."billingCycle", p."monthlyPrice", p."yearlyPrice", COUNT(*) as count
       FROM "Subscription" s
       JOIN "Plan" p ON s."planId" = p.id
       WHERE s.status IN ('active', 'trial')
       GROUP BY p.code, p.name, s."billingCycle", p."monthlyPrice", p."yearlyPrice"
       ORDER BY p.code`
    );

    let mrr = 0;
    const planDistribution: Record<string, number> = {};
    for (const sub of activeSubs) {
      const monthly = sub.billingCycle === "yearly" && sub.yearlyPrice > 0
        ? sub.yearlyPrice / 12
        : sub.monthlyPrice;
      mrr += monthly * Number(sub.count);
      planDistribution[sub.planName] = (planDistribution[sub.planName] || 0) + Number(sub.count);
    }

    // 总收入
    const totalRevenue = await prisma.$queryRawUnsafe<{ total: number }[]>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM "Payment" WHERE status = 'confirmed'`
    );

    // 月度收入趋势（最近6个月）
    const monthlyRevenue = await prisma.$queryRawUnsafe<{ month: string; total: number }[]>(
      `SELECT TO_CHAR("confirmedAt", 'YYYY-MM') as month, SUM(amount) as total
       FROM "Payment" WHERE status = 'confirmed' AND "confirmedAt" IS NOT NULL
       GROUP BY TO_CHAR("confirmedAt", 'YYYY-MM')
       ORDER BY month DESC LIMIT 6`
    );

    // 待确认付款
    const pendingPayments = await prisma.$queryRawUnsafe<{ count: number; total: number }[]>(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM "Payment" WHERE status = 'pending'`
    );

    // 转化漏斗
    const totalBosses = await prisma.$queryRawUnsafe<{ count: number }[]>(`SELECT COUNT(*) as count FROM "Boss"`);
    const trialBosses = await prisma.$queryRawUnsafe<{ count: number }[]>(`SELECT COUNT(*) as count FROM "Subscription" WHERE status = 'trial'`);
    const activeBosses = await prisma.$queryRawUnsafe<{ count: number }[]>(`SELECT COUNT(*) as count FROM "Subscription" WHERE status = 'active'`);
    const totalBossCount = Number(totalBosses[0]?.count || 0);
    const trialCount = Number(trialBosses[0]?.count || 0);
    const activeCount = Number(activeBosses[0]?.count || 0);

    return Response.json({
      mrr: Math.round(mrr),
      mrrYuan: (Math.round(mrr) / 100).toFixed(2),
      totalRevenue: Number(totalRevenue[0]?.total || 0),
      totalRevenueYuan: (Number(totalRevenue[0]?.total || 0) / 100).toFixed(2),
      pendingPayments: {
        count: Number(pendingPayments[0]?.count || 0),
        total: Number(pendingPayments[0]?.total || 0),
        totalYuan: (Number(pendingPayments[0]?.total || 0) / 100).toFixed(2),
      },
      planDistribution,
      monthlyRevenue: monthlyRevenue.map((r) => ({
        ...r,
        totalYuan: (Number(r.total) / 100).toFixed(2),
      })),
      funnel: {
        totalBosses: totalBossCount,
        trial: trialCount,
        active: activeCount,
        conversionRate: totalBossCount > 0 ? Math.round((activeCount / totalBossCount) * 100) : 0,
      },
    });
  } catch (e) {
    console.error("admin revenue GET error:", e);
    return Response.json({
      mrr: 0, mrrYuan: "0.00", totalRevenue: 0, totalRevenueYuan: "0.00",
      pendingPayments: { count: 0, total: 0, totalYuan: "0.00" },
      planDistribution: {}, monthlyRevenue: [],
      funnel: { totalBosses: 0, trial: 0, active: 0, conversionRate: 0 },
    });
  }
}
