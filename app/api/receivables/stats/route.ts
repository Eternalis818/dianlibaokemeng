import { prisma } from "@/lib/prisma";

/** GET /api/receivables/stats — 收款统计数据 + 账龄分析 */
export async function GET() {
  try {
    // 总览统计
    const stats = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM("contractAmount"), 0) as totalContract,
        COALESCE(SUM("receivedAmount"), 0) as totalReceived,
        COALESCE(SUM("contractAmount" - "receivedAmount"), 0) as totalPending
      FROM "Receivable"
    `);

    // 账龄分析
    const aging = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        CASE
          WHEN "contractAmount" - "receivedAmount" <= 0 THEN 'paid'
          WHEN EXISTS (
            SELECT 1 FROM "ReceivableMilestone" m
            WHERE m."receivableId" = r.id AND m."dueDate" IS NOT NULL
            AND m."dueDate" < now() AND m.status != 'collected'
            AND (now() - m."dueDate") <= interval '30 days'
          ) THEN '30d'
          WHEN EXISTS (
            SELECT 1 FROM "ReceivableMilestone" m
            WHERE m."receivableId" = r.id AND m."dueDate" IS NOT NULL
            AND m."dueDate" < now() AND m.status != 'collected'
            AND (now() - m."dueDate") BETWEEN interval '30 days' AND interval '60 days'
          ) THEN '60d'
          WHEN EXISTS (
            SELECT 1 FROM "ReceivableMilestone" m
            WHERE m."receivableId" = r.id AND m."dueDate" IS NOT NULL
            AND m."dueDate" < now() AND m.status != 'collected'
            AND (now() - m."dueDate") BETWEEN interval '60 days' AND interval '90 days'
          ) THEN '90d'
          WHEN EXISTS (
            SELECT 1 FROM "ReceivableMilestone" m
            WHERE m."receivableId" = r.id AND m."dueDate" IS NOT NULL
            AND m."dueDate" < now() AND m.status != 'collected'
            AND (now() - m."dueDate") > interval '90 days'
          ) THEN '90d_plus'
          ELSE 'not_due'
        END as aging_bucket,
        COUNT(*) as count,
        COALESCE(SUM("contractAmount" - "receivedAmount"), 0) as amount
      FROM "Receivable" r
      GROUP BY aging_bucket
    `);

    // 按债主类型统计
    const byType = await prisma.$queryRawUnsafe<any[]>(`
      SELECT d.type, COUNT(*) as count,
        COALESCE(SUM(r."contractAmount"), 0) as contractAmount,
        COALESCE(SUM(r."receivedAmount"), 0) as receivedAmount
      FROM "Receivable" r
      JOIN "Debtor" d ON d.id = r."debtorId"
      GROUP BY d.type
    `);

    // 即将到期提醒（7天内）
    const upcoming = await prisma.$queryRawUnsafe<any[]>(`
      SELECT m.*, r."contractAmount", r."receivedAmount", d.name as "debtorName", p.name as "projectName"
      FROM "ReceivableMilestone" m
      JOIN "Receivable" r ON r.id = m."receivableId"
      JOIN "Debtor" d ON d.id = r."debtorId"
      LEFT JOIN "Project" p ON p.code = r."projectId"
      WHERE m.status != 'collected' AND m."dueDate" IS NOT NULL
      AND m."dueDate" BETWEEN now() AND now() + interval '7 days'
      ORDER BY m."dueDate"
    `);

    // 已逾期
    const overdue = await prisma.$queryRawUnsafe<any[]>(`
      SELECT m.*, r."contractAmount", r."receivedAmount", d.name as "debtorName", p.name as "projectName"
      FROM "ReceivableMilestone" m
      JOIN "Receivable" r ON r.id = m."receivableId"
      JOIN "Debtor" d ON d.id = r."debtorId"
      LEFT JOIN "Project" p ON p.code = r."projectId"
      WHERE m.status != 'collected' AND m."dueDate" IS NOT NULL
      AND m."dueDate" < now()
      ORDER BY m."dueDate"
    `);

    return Response.json({
      stats: stats[0] || { total: 0, totalContract: 0, totalReceived: 0, totalPending: 0 },
      aging,
      byType,
      upcoming,
      overdue,
    });
  } catch (e) {
    console.error("receivables stats error:", e);
    return Response.json({ error: "统计失败" }, { status: 500 });
  }
}
