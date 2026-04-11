import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/admin/subscriptions — 管理员查看所有老板订阅状态 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const limit = parseInt(url.searchParams.get("limit") || "50");

    let whereClause = "";
    if (status) {
      whereClause = `AND s.status = '${status}'`;
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT b.id as "bossId", b.name, b.phone, b.project, b."isActive" as "bossActive",
              s.status, s."billingCycle", s."trialEndsAt", s."currentPeriodStart", s."currentPeriodEnd",
              s."lastActivityAt", s."createdAt" as "subCreatedAt",
              p.code as "planCode", p.name as "planName",
              (SELECT COUNT(*) FROM "Payment" pay WHERE pay."bossId" = b.id AND pay.status = 'confirmed') as "paymentCount",
              (SELECT COALESCE(SUM(pay.amount), 0) FROM "Payment" pay WHERE pay."bossId" = b.id AND pay.status = 'confirmed') as "totalPaid"
       FROM "Boss" b
       LEFT JOIN "Subscription" s ON s."bossId" = b.id
       LEFT JOIN "Plan" p ON s."planId" = p.id
       WHERE 1=1 ${whereClause}
       ORDER BY b.id
       LIMIT ${limit}`
    );

    const now = new Date();
    const result = rows.map((r) => {
      let isActive = false;
      if (r.status === "active" && (!r.currentPeriodEnd || new Date(r.currentPeriodEnd) > now)) isActive = true;
      if (r.status === "trial" && (!r.trialEndsAt || new Date(r.trialEndsAt) > now)) isActive = true;

      const daysSinceActivity = r.lastActivityAt
        ? Math.floor((now.getTime() - new Date(r.lastActivityAt).getTime()) / 86400000)
        : null;

      return {
        bossId: r.bossId,
        name: r.name,
        phone: r.phone,
        project: r.project,
        bossActive: r.bossActive,
        subscription: r.status ? {
          status: r.status,
          isActive,
          billingCycle: r.billingCycle,
          planCode: r.planCode,
          planName: r.planName,
          trialEndsAt: r.trialEndsAt?.toISOString() || null,
          currentPeriodEnd: r.currentPeriodEnd?.toISOString() || null,
          lastActivityAt: r.lastActivityAt?.toISOString() || null,
          daysSinceActivity,
          paymentCount: Number(r.paymentCount),
          totalPaidYuan: (Number(r.totalPaid) / 100).toFixed(2),
        } : null,
      };
    });

    return Response.json(result);
  } catch (e) {
    console.error("admin subscriptions GET error:", e);
    return Response.json([]);
  }
}
