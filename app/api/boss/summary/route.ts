import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { chatCompletion } from "@/lib/llm";
import { checkQuota, recordUsage } from "@/lib/ai-quota";

export async function POST(req: NextRequest) {
  // Rate limit — 5 req/min per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(ip, 5, 60_000)) {
    return Response.json({ content: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  // Extract bossId from cookie
  const token = req.cookies.get("pl_boss")?.value || "";
  const bossIdMatch = token.match(/^boss:(\d+):/);
  const bossId = bossIdMatch ? parseInt(bossIdMatch[1]) : 0;

  // AI quota check
  if (bossId > 0) {
    const quota = await checkQuota(bossId, "boss_summary");
    if (!quota.allowed) {
      return Response.json({
        content: quota.limit === -1
          ? "AI 按量计费额度确认中，请联系管理员"
          : `本月 AI 汇总已使用 ${quota.used}/${quota.limit} 次，升级旗舰版获取更多额度。`,
        upgradeNeeded: true,
        quota,
      }, { status: 200 });
    }
  }

  try {
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    // 并行获取所有数据源
    const [checkIns, reports, visas, corrections, expenseSummary, qtyRows] = await Promise.all([
      prisma.checkIn.findMany({ where: { createdAt: { gte: todayUTC } }, include: { worker: true } }),
      prisma.report.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.visa.findMany({ where: { status: "pending" } }),
      prisma.correction.findMany({ where: { status: "pending" } }),
      // 财务汇总
      prisma.$queryRawUnsafe<{ category: string; total: number }[]>(
        `SELECT "category", SUM("amount") as total FROM "ExpenseRecord" GROUP BY "category" ORDER BY total DESC`
      ),
      // 工程量产值汇总
      prisma.$queryRawUnsafe<{ project: string; totalValue: number }[]>(
        `SELECT r.project, SUM(r."totalValue") as "totalValue" FROM "Report" r WHERE r.status IN ('verified', 'approved') GROUP BY r.project ORDER BY "totalValue" DESC`
      ),
    ]);

    const pendingReports = reports.filter((r) => r.status === "pending");
    const approvedReports = reports.filter((r) => r.status === "approved");
    const visaTotal = visas.reduce((s, v) => s + v.amount, 0);
    const totalExpense = expenseSummary.reduce((s, r) => s + Number(r.total), 0);
    const totalRevenue = qtyRows.reduce((s, r) => s + Number(r.totalValue), 0);
    const pnl = totalRevenue - totalExpense;

    // 分类支出明细
    const expenseBreakdown = expenseSummary
      .map((r) => `${r.category}: ¥${Number(r.total).toLocaleString()}`)
      .join("、");

    // 项目产值明细
    const revenueBreakdown = qtyRows
      .map((r) => `${r.project}: ¥${Number(r.totalValue).toLocaleString()}`)
      .join("、");

    const dataContext = `
今日实时数据（${new Date().toLocaleDateString("zh-CN")}）：
【人员】在场工人：${checkIns.length} 人（${checkIns.map((c) => c.worker.name).join("、") || "暂无"}）
【报量】今日 ${reports.length} 条，待审 ${pendingReports.length} 条，已批 ${approvedReports.length} 条
【签证】待批 ${visas.length} 笔，合计 ¥${visaTotal.toLocaleString()}
【纠偏】待确认 ${corrections.length} 条
【财务】累计产值 ¥${totalRevenue.toLocaleString()}（${revenueBreakdown || "暂无"}）；累计支出 ¥${totalExpense.toLocaleString()}（${expenseBreakdown || "暂无"}）；${pnl >= 0 ? "盈余" : "亏损"} ¥${Math.abs(pnl).toLocaleString()}
    `.trim();

    const SYSTEM_PROMPT = `你是 PowerLink 工地 AI 助手。根据下面的真实数据，生成一份简洁的老板汇报。
要求：≤120字，口语化，直接，重点突出盈亏状况，不废话，不加标题，不用"如有问题请联系"类套话。`;

    let content: string;
    try {
      content = await chatCompletion(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: dataContext },
        ],
        { maxTokens: 300, temperature: 0.6 },
        "summary" // Boss 摘要用摘要模型
      );
      // Record AI usage after successful call
      if (bossId > 0) {
        await recordUsage(bossId, "boss_summary");
      }
    } catch {
      return Response.json({ content: "AI 服务暂时不可用，请稍后重试。" }, { status: 200 });
    }

    return Response.json({ content });
  } catch (e) {
    console.error("boss/summary error:", e);
    return Response.json({ content: "网络异常，请稍后重试。" }, { status: 200 });
  }
}
