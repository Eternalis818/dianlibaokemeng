import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST /api/boss/subscribe — 订阅/升级套餐 */
export async function POST(req: NextRequest) {
  try {
    // 提取 bossId
    const token = req.cookies.get("pl_boss")?.value || "";
    const bossIdMatch = token.match(/^boss:(\d+):/);
    if (!bossIdMatch) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }
    const bossId = parseInt(bossIdMatch[1]);

    const { planCode, billingCycle } = await req.json();
    if (!planCode) {
      return Response.json({ error: "请选择套餐" }, { status: 400 });
    }

    // 查找 Plan
    const planRows = await prisma.$queryRawUnsafe<{ id: number; code: string; name: string; monthlyPrice: number; yearlyPrice: number }[]>(
      `SELECT id, code, name, "monthlyPrice", "yearlyPrice" FROM "Plan" WHERE code = '${planCode}' AND "isActive" = true`
    );
    if (planRows.length === 0) {
      return Response.json({ error: "套餐不存在" }, { status: 404 });
    }
    const plan = planRows[0];

    // 计算金额
    const amount = billingCycle === "yearly" && plan.yearlyPrice > 0
      ? plan.yearlyPrice
      : billingCycle === "lifetime"
        ? plan.monthlyPrice
        : plan.monthlyPrice;

    if (amount === 0) {
      return Response.json({ error: "免费套餐无需订阅" }, { status: 400 });
    }

    // 创建 Payment 记录
    const now = new Date();
    const periodEnd = billingCycle === "monthly"
      ? new Date(now.getTime() + 30 * 86400000)
      : billingCycle === "yearly"
        ? new Date(now.getTime() + 365 * 86400000)
        : null; // lifetime has no end

    const paymentResult = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `INSERT INTO "Payment" ("bossId", amount, currency, "planCode", "billingCycle", "periodStart", "periodEnd", method, status, "createdAt")
       VALUES (${bossId}, ${amount}, 'CNY', '${planCode}', '${billingCycle || "monthly"}', NOW(), ${periodEnd ? `'${periodEnd.toISOString()}'` : "NULL"}, 'manual', 'pending', NOW())
       RETURNING id`
    );

    return Response.json({
      ok: true,
      paymentId: paymentResult[0]?.id,
      amount,
      planName: plan.name,
      billingCycle: billingCycle || "monthly",
    }, { status: 201 });
  } catch (e) {
    console.error("boss subscribe error:", e);
    return Response.json({ error: "订阅失败，请重试" }, { status: 500 });
  }
}
