import { prisma } from "@/lib/prisma";

/** GET /api/boss/expenses/summary — 账目汇总 */
export async function GET() {
  try {
    // 按分类汇总
    const byCategory = await prisma.$queryRawUnsafe<{ category: string; total: number }[]>(
      `SELECT "category", SUM("amount") as total FROM "ExpenseRecord" GROUP BY "category" ORDER BY total DESC`
    );

    // 按项目汇总
    const byProject = await prisma.$queryRawUnsafe<{ projectName: string; total: number }[]>(
      `SELECT COALESCE("projectName", '总账(未分配)') as "projectName", SUM("amount") as total FROM "ExpenseRecord" GROUP BY "projectName" ORDER BY total DESC`
    );

    const total = byCategory.reduce((s, r) => s + Number(r.total), 0);

    return Response.json({
      total,
      byCategory: Object.fromEntries(byCategory.map((r) => [r.category, Number(r.total)])),
      byProject: Object.fromEntries(byProject.map((r) => [r.projectName, Number(r.total)])),
    });
  } catch (e) {
    console.error("boss expenses summary error:", e);
    return Response.json({ total: 0, byCategory: {}, byProject: {} });
  }
}
