import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/payments — 获取当前老板的支付记录 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("pl_boss")?.value || "";
    const bossIdMatch = token.match(/^boss:(\d+):/);
    if (!bossIdMatch) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }
    const bossId = parseInt(bossIdMatch[1]);

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, amount, currency, "planCode", "billingCycle", method, status, "confirmedAt", "createdAt"
       FROM "Payment" WHERE "bossId" = ${bossId} ORDER BY "createdAt" DESC LIMIT 20`
    );

    const result = rows.map((r) => ({
      ...r,
      amountYuan: (r.amount / 100).toFixed(2),
    }));

    return Response.json(result);
  } catch (e) {
    console.error("payments GET error:", e);
    return Response.json([]);
  }
}
