import { prisma } from "@/lib/prisma";

/** GET /api/boss/visa-pnl — 签证盈亏（按项目聚合） */
export async function GET() {
  try {
    // 按项目汇总签证金额（只统计已批/已核）
    const visaByProject = await prisma.$queryRawUnsafe<
      { project: string; visaAmount: number }[]
    >(
      `SELECT project, SUM(amount) as "visaAmount" FROM "Visa" WHERE status IN ('approved') GROUP BY project ORDER BY "visaAmount" DESC`
    );

    // 按项目汇总报量产值
    const reportByProject = await prisma.$queryRawUnsafe<
      { project: string; reportValue: number }[]
    >(
      `SELECT project, SUM("totalValue") as "reportValue" FROM "Report" WHERE status IN ('verified', 'approved') GROUP BY project ORDER BY "reportValue" DESC`
    );

    // 按项目汇总支出
    const expenseByProject = await prisma.$queryRawUnsafe<
      { projectName: string; expenseTotal: number }[]
    >(
      `SELECT COALESCE("projectName", '总账(未分配)') as "projectName", SUM(amount) as "expenseTotal" FROM "ExpenseRecord" GROUP BY "projectName" ORDER BY "expenseTotal" DESC`
    );

    // 合并为项目维度
    const allProjects = new Set<string>();
    visaByProject.forEach((r) => allProjects.add(r.project));
    reportByProject.forEach((r) => allProjects.add(r.project));
    expenseByProject.forEach((r) => allProjects.add(r.projectName));

    const result = Array.from(allProjects).map((project) => {
      const visa = visaByProject.find((r) => r.project === project)?.visaAmount ?? 0;
      const report = reportByProject.find((r) => r.project === project)?.reportValue ?? 0;
      const expense = expenseByProject.find((r) => r.projectName === project)?.expenseTotal ?? 0;
      const revenue = Number(report) + Number(visa);
      const cost = Number(expense);
      const pnl = revenue - cost;

      return {
        project,
        reportValue: Number(report),
        visaAmount: Number(visa),
        expense: cost,
        revenue,
        pnl,
        pnlPercent: revenue > 0 ? Math.round((pnl / revenue) * 100) : 0,
      };
    });

    // 总计
    const totals = result.reduce(
      (acc, r) => ({
        reportValue: acc.reportValue + r.reportValue,
        visaAmount: acc.visaAmount + r.visaAmount,
        expense: acc.expense + r.expense,
        revenue: acc.revenue + r.revenue,
        pnl: acc.pnl + r.pnl,
        pnlPercent: 0,
      }),
      { reportValue: 0, visaAmount: 0, expense: 0, revenue: 0, pnl: 0, pnlPercent: 0 }
    );
    totals.pnlPercent = totals.revenue > 0 ? Math.round((totals.pnl / totals.revenue) * 100) : 0;

    return Response.json({ projects: result, totals });
  } catch (e) {
    console.error("boss visa-pnl error:", e);
    return Response.json({ projects: [], totals: { reportValue: 0, visaAmount: 0, expense: 0, revenue: 0, pnl: 0, pnlPercent: 0 } });
  }
}
