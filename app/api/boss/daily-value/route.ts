import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/llm";
import { checkQuota, recordUsage } from "@/lib/ai-quota";

export type AiGrade = "excellent" | "good" | "normal" | "warning";

interface ReportInput {
  task: string;
  project: string;
  qty: string;
  totalValue: number | null;
}

interface CheckInInput {
  workerId: string;
  createdAt: Date;
  duration: number | null;
  worker: { wageRate: number | null };
}

interface AmountInput {
  amount: number;
}

interface ExpenseSummaryInput {
  total: number;
}

interface ComputeDailyMetricsParams {
  date: string;
  reports: ReportInput[];
  checkIns: CheckInInput[];
  projectExpenses: AmountInput[];
  expenseRows: ExpenseSummaryInput[];
  historicalAveragePerWorkerOutput: number;
  now: Date;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function shanghaiDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function getShanghaiDayRange(reference: Date = new Date()) {
  const date = shanghaiDateString(reference);
  const start = new Date(`${date}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { date, start, end };
}

export function evaluateDailyGrade(input: {
  pnl: number;
  pnlPercent: number;
  perWorkerOutput: number;
  historicalAveragePerWorkerOutput: number;
}): AiGrade {
  if (input.pnl < 0) return "warning";
  if (input.pnlPercent >= 30 && input.perWorkerOutput > input.historicalAveragePerWorkerOutput) return "excellent";
  if (input.pnl >= 0 && input.pnlPercent >= 10) return "good";
  return "normal";
}

function fallbackSuggestion(params: {
  grade: AiGrade;
  outputValue: number;
  totalCost: number;
  pnl: number;
  pnlPercent: number;
  efficiencyRatio: number;
}): string {
  const output = `¥${params.outputValue.toLocaleString()}`;
  const cost = `¥${params.totalCost.toLocaleString()}`;
  const pnl = `${params.pnl >= 0 ? "+" : "-"}¥${Math.abs(params.pnl).toLocaleString()}`;
  const pct = `${params.pnlPercent.toFixed(1)}%`;

  if (params.grade === "excellent") {
    return `今天表现不错：产值${output}，成本${cost}，盈亏${pnl}（${pct}）。保持当前组织效率，明天可优先安排高单价工序继续放大产值。`;
  }
  if (params.grade === "good") {
    return `今天整体稳健：产值${output}，成本${cost}，盈亏${pnl}。建议复盘低效率工序，优先压缩等待时间，继续提升工效。`;
  }
  if (params.grade === "normal") {
    return `今天略有盈利但空间不大：产值${output}，成本${cost}。建议提高高价值工序占比，目标把工效提升到每分钟 ¥${Math.max(0.1, params.efficiencyRatio + 0.2).toFixed(2)}。`;
  }
  return `今天出现亏损：产值${output}，成本${cost}，盈亏${pnl}。建议先控制人工与杂费，再集中施工高单价项目，先把利润率拉回正值。`;
}

export function computeDailyMetrics(params: ComputeDailyMetricsParams) {
  const outputDetail = params.reports.map((r) => ({
    task: r.task,
    project: r.project,
    qty: r.qty,
    totalValue: Number(r.totalValue ?? 0),
  }));

  const outputValue = outputDetail.reduce((sum, row) => sum + row.totalValue, 0);

  const workersOnsite = new Set(params.checkIns.map((c) => c.workerId)).size;

  const totalManHours = params.checkIns.reduce((sum, c) => {
    const elapsed = Math.max(0, Math.round((params.now.getTime() - c.createdAt.getTime()) / 60000));
    const minutes = c.duration ?? elapsed;
    return sum + minutes;
  }, 0);

  const laborCost = round2(
    params.checkIns.reduce((sum, c) => {
      const elapsed = Math.max(0, Math.round((params.now.getTime() - c.createdAt.getTime()) / 60000));
      const minutes = c.duration ?? elapsed;
      const wageRate = Number(c.worker.wageRate ?? 0);
      return sum + (minutes * wageRate) / 480;
    }, 0)
  );

  const materialCost = round2(params.projectExpenses.reduce((sum, row) => sum + Number(row.amount), 0));
  const expenseCost = round2(params.expenseRows.reduce((sum, row) => sum + Number(row.total), 0));
  const totalCost = round2(laborCost + materialCost + expenseCost);

  const pnl = round2(outputValue - totalCost);
  const pnlPercent = outputValue > 0 ? round2((pnl / outputValue) * 100) : 0;
  const perWorkerOutput = workersOnsite > 0 ? round2(outputValue / workersOnsite) : 0;
  const efficiencyRatio = totalManHours > 0 ? round2(outputValue / totalManHours) : 0;

  const aiGrade = evaluateDailyGrade({
    pnl,
    pnlPercent,
    perWorkerOutput,
    historicalAveragePerWorkerOutput: params.historicalAveragePerWorkerOutput,
  });

  return {
    date: params.date,
    outputValue: round2(outputValue),
    outputDetail,
    laborCost,
    materialCost,
    expenseCost,
    totalCost,
    workersOnsite,
    totalManHours,
    perWorkerOutput,
    efficiencyRatio,
    pnl,
    pnlPercent,
    aiGrade,
    aiSuggestion: fallbackSuggestion({
      grade: aiGrade,
      outputValue: round2(outputValue),
      totalCost,
      pnl,
      pnlPercent,
      efficiencyRatio,
    }),
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("pl_boss")?.value || "";
    const bossIdMatch = token.match(/^boss:(\d+):/);
    if (!bossIdMatch) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }
    const bossId = parseInt(bossIdMatch[1], 10);

    const url = new URL(req.url);
    const qDate = url.searchParams.get("date");
    const isDateParamValid = !!qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate);
    const dayRange = isDateParamValid
      ? {
          date: qDate!,
          start: new Date(`${qDate}T00:00:00+08:00`),
          end: new Date(new Date(`${qDate}T00:00:00+08:00`).getTime() + 24 * 60 * 60 * 1000),
        }
      : getShanghaiDayRange();

    const historyStart = new Date(dayRange.start.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [reports, checkIns, projectExpenses, expenseRows, historyReports, quota] = await Promise.all([
      prisma.report.findMany({
        where: {
          status: { in: ["verified", "approved"] },
          createdAt: { gte: dayRange.start, lt: dayRange.end },
        },
        orderBy: { createdAt: "desc" },
        select: { task: true, project: true, qty: true, totalValue: true },
      }),
      prisma.checkIn.findMany({
        where: { createdAt: { gte: dayRange.start, lt: dayRange.end } },
        select: { workerId: true, createdAt: true, duration: true, worker: { select: { wageRate: true } } },
      }),
      prisma.projectExpense.findMany({
        where: { expenseDate: { gte: dayRange.start, lt: dayRange.end } },
        select: { amount: true },
      }),
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM("amount"), 0)::float as total
        FROM "ExpenseRecord"
        WHERE "expenseDate" >= ${dayRange.start} AND "expenseDate" < ${dayRange.end}
      `,
      prisma.report.findMany({
        where: {
          status: { in: ["verified", "approved"] },
          createdAt: { gte: historyStart, lt: dayRange.start },
        },
        select: { workerId: true, totalValue: true },
      }),
      checkQuota(bossId, "boss_summary"),
    ]);

    const historyWorkers = new Set(historyReports.map((r) => r.workerId)).size;
    const historyOutput = historyReports.reduce((sum, row) => sum + Number(row.totalValue ?? 0), 0);
    const historicalAveragePerWorkerOutput = historyWorkers > 0 ? round2(historyOutput / historyWorkers) : 0;

    const now = new Date();
    const result = computeDailyMetrics({
      date: dayRange.date,
      reports,
      checkIns,
      projectExpenses,
      expenseRows,
      historicalAveragePerWorkerOutput,
      now,
    });

    if (!quota.allowed) {
      return Response.json({
        ...result,
        aiSuggestion:
          quota.limit === -1
            ? "AI 按量计费额度确认中，请联系管理员"
            : `本月 AI 汇总已使用 ${quota.used}/${quota.limit} 次，当前先展示规则建议。`,
      });
    }

    const summaryInput = [
      `日期：${result.date}`,
      `今日产值：${result.outputValue}`,
      `今日总成本：${result.totalCost}`,
      `人工成本：${result.laborCost}`,
      `杂费：${result.materialCost}`,
      `记账支出：${result.expenseCost}`,
      `盈亏：${result.pnl}`,
      `利润率：${result.pnlPercent}%`,
      `人均产值：${result.perWorkerOutput}`,
      `工效比（元/分钟）：${result.efficiencyRatio}`,
      `今日在场工人：${result.workersOnsite}`,
      `今日总工时（分钟）：${result.totalManHours}`,
    ].join("\n");

    try {
      const aiText = await chatCompletion(
        [
          {
            role: "system",
            content:
              "你是电力施工队经营顾问。基于给定数据输出 ≤150字、口语化、直接结论的评价。要么表扬今天表现不错，要么指出提高产值/工效的具体动作，不要客套。",
          },
          { role: "user", content: summaryInput },
        ],
        { maxTokens: 220, temperature: 0.4 },
        "summary"
      );

      await recordUsage(bossId, "boss_summary");
      return Response.json({ ...result, aiSuggestion: (aiText || result.aiSuggestion).trim() });
    } catch {
      return Response.json(result);
    }
  } catch (e) {
    console.error("boss/daily-value error:", e);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
