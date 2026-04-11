import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/admin/payments — 管理员查看所有付款记录 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const limit = parseInt(url.searchParams.get("limit") || "50");

    let whereClause = "";
    if (status) {
      whereClause = `WHERE p.status = '${status}'`;
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT p.id, p.amount, p."planCode", p."billingCycle", p.method, p.status,
              p."confirmedBy", p."confirmedAt", p.note, p."createdAt",
              p."periodStart", p."periodEnd",
              b.name as "bossName", b.phone as "bossPhone"
       FROM "Payment" p
       JOIN "Boss" b ON p."bossId" = b.id
       ${whereClause}
       ORDER BY p."createdAt" DESC LIMIT ${limit}`
    );

    const result = rows.map((r) => ({
      ...r,
      amountYuan: (r.amount / 100).toFixed(2),
    }));

    return Response.json(result);
  } catch (e) {
    console.error("admin payments GET error:", e);
    return Response.json([]);
  }
}

/** PATCH /api/admin/payments — 确认/拒绝付款 */
export async function PATCH(req: NextRequest) {
  try {
    const { paymentId, action, note } = await req.json();
    if (!paymentId || !action) {
      return Response.json({ error: "参数缺失" }, { status: 400 });
    }

    if (action === "confirm") {
      // 获取付款信息
      const payments = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "Payment" WHERE id = ${paymentId}`
      );
      if (payments.length === 0) {
        return Response.json({ error: "付款记录不存在" }, { status: 404 });
      }
      const payment = payments[0];

      // 更新付款状态
      await prisma.$executeRawUnsafe(
        `UPDATE "Payment" SET status = 'confirmed', "confirmedBy" = 'admin', "confirmedAt" = NOW(), note = ${note ? `'${note}'` : "NULL"} WHERE id = ${paymentId}`
      );

      // 激活或更新订阅
      const planRows = await prisma.$queryRawUnsafe<{ id: number }[]>(
        `SELECT id FROM "Plan" WHERE code = '${payment.planCode}'`
      );
      if (planRows.length > 0) {
        const planId = planRows[0].id;
        const now = new Date();
        const periodEnd = payment.periodEnd ? new Date(payment.periodEnd) : null;

        // Upsert 订阅
        await prisma.$executeRawUnsafe(
          `INSERT INTO "Subscription" ("bossId", "planId", status, "billingCycle", "currentPeriodStart", "currentPeriodEnd", "updatedAt")
           VALUES (${payment.bossId}, ${planId}, 'active', '${payment.billingCycle}', NOW(), ${periodEnd ? `'${periodEnd.toISOString()}'` : "NULL"}, NOW())
           ON CONFLICT ("bossId") DO UPDATE SET "planId" = ${planId}, status = 'active', "billingCycle" = '${payment.billingCycle}', "currentPeriodStart" = NOW(), "currentPeriodEnd" = ${periodEnd ? `'${periodEnd.toISOString()}'` : "NULL"}, "updatedAt" = NOW()`
        );
      }

      return Response.json({ ok: true, message: "付款已确认，订阅已激活" });
    }

    if (action === "reject") {
      await prisma.$executeRawUnsafe(
        `UPDATE "Payment" SET status = 'failed', note = ${note ? `'${note}'` : "'管理员拒绝'"} WHERE id = ${paymentId}`
      );
      return Response.json({ ok: true, message: "付款已拒绝" });
    }

    return Response.json({ error: "未知操作" }, { status: 400 });
  } catch (e) {
    console.error("admin payments PATCH error:", e);
    return Response.json({ error: "操作失败" }, { status: 500 });
  }
}
