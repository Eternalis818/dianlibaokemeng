import { prisma } from "@/lib/prisma";

/** GET /api/boss/quantities — 工程量汇总（只读） */
export async function GET() {
  try {
    // 聚合报量数据，按项目+工序分组
    const rows = await prisma.$queryRawUnsafe<
      { project: string; task: string; spec: string; totalQty: string; unit: string; unitPrice: number | null; estimatedRevenue: number | null }[]
    >(
      `SELECT
         r.project,
         r.task,
         r.spec,
         r.qty as "totalQty",
         COALESCE(SPLIT_PART(r.qty, ' ', 2), '个') as unit,
         MAX(r."unitPrice") as "unitPrice",
         SUM(r."totalValue") as "estimatedRevenue"
       FROM "Report" r
       WHERE r.status IN ('verified', 'approved')
       GROUP BY r.project, r.task, r.spec, r.qty
       ORDER BY r.project, r.task`
    );

    const result = rows.map((r) => ({
      project: r.project,
      task: r.task,
      spec: r.spec,
      totalQty: parseFloat(r.totalQty) || 0,
      unit: r.unit,
      unitPrice: r.unitPrice,
      estimatedRevenue: r.estimatedRevenue,
    }));

    return Response.json(result);
  } catch (e) {
    console.error("boss quantities error:", e);
    return Response.json([]);
  }
}
