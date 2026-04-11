import { prisma } from "@/lib/prisma";

/** GET /api/plans — 获取所有可用套餐（公开） */
export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<
      { id: number; code: string; name: string; monthlyPrice: number; yearlyPrice: number; features: any; aiQuota: number; maxProjects: number; sortOrder: number }[]
    >(
      `SELECT id, code, name, "monthlyPrice", "yearlyPrice", features, "aiQuota", "maxProjects", "sortOrder"
       FROM "Plan" WHERE "isActive" = true ORDER BY "sortOrder"`
    );

    const plans = rows.map((r) => ({
      ...r,
      features: typeof r.features === "string" ? JSON.parse(r.features) : r.features,
      monthlyPriceYuan: (r.monthlyPrice / 100).toFixed(2),
      yearlyPriceYuan: r.yearlyPrice > 0 ? (r.yearlyPrice / 100).toFixed(2) : null,
    }));

    return Response.json(plans);
  } catch (e) {
    console.error("plans GET error:", e);
    return Response.json([]);
  }
}
