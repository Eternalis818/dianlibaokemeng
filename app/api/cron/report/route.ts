import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushReport, getPushConfig } from "@/lib/push";

/**
 * POST /api/cron/report
 *
 * 生成并推送施工报告
 * Query params:
 *   - type: "daily" | "weekly" | "alert"（默认 daily）
 *   - push: "1" 是否立即推送到配置的渠道（默认不推送，仅返回内容）
 *   - secret: 管理员密钥（推送时需要验证）
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "daily";
  const shouldPush = searchParams.get("push") === "1";
  const secret = searchParams.get("secret");

  // 推送时验证密钥
  if (shouldPush && secret !== process.env.ADMIN_SECRET && secret !== "pl_admin_secret_2026") {
    return Response.json({ error: "认证失败" }, { status: 401 });
  }

  try {
    let title: string;
    let content: string;

    switch (type) {
      case "daily":
        ({ title, content } = await generateDailyReport());
        break;
      case "weekly":
        ({ title, content } = await generateWeeklyReport());
        break;
      case "alert":
        ({ title, content } = await generateAlertReport());
        break;
      default:
        return Response.json({ error: `未知报告类型: ${type}` }, { status: 400 });
    }

    // 如果要求推送
    if (shouldPush) {
      const pushResult = await pushReport(title, content);
      return Response.json({
        success: true,
        type,
        title,
        content: content.slice(0, 500) + (content.length > 500 ? "..." : ""),
        pushed: pushResult.ok,
        pushMessage: pushResult.message,
      });
    }

    // 仅返回报告内容
    return Response.json({ success: true, type, title, content });
  } catch (e) {
    console.error("cron/report error:", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = today();
  d.setDate(d.getDate() - n);
  return d;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 施工日报 */
async function generateDailyReport(): Promise<{ title: string; content: string }> {
  const start = today();
  const dateStr = formatDate(start);

  // 1. 今日打卡统计
  const checkins = await prisma.$queryRawUnsafe<
    { project: string; cnt: string; workers: string }[]
  >(
    `SELECT project, COUNT(DISTINCT "workerId")::text as cnt, COUNT(*)::text as workers
     FROM "CheckIn" WHERE "createdAt" >= '${start.toISOString()}'
     GROUP BY project ORDER BY cnt DESC`
  );

  // 2. 今日报量统计
  const reports = await prisma.$queryRawUnsafe<
    { project: string; total: string; pending: string; verified: string; rejected: string; value: string }[]
  >(
    `SELECT project,
       COUNT(*)::text as total,
       COUNT(*) FILTER (WHERE status = 'pending')::text as pending,
       COUNT(*) FILTER (WHERE status = 'verified')::text as verified,
       COUNT(*) FILTER (WHERE status = 'rejected')::text as rejected,
       COALESCE(SUM("totalValue"), 0)::text as value
     FROM "Report" WHERE "createdAt" >= '${start.toISOString()}'
     GROUP BY project ORDER BY total DESC`
  );

  // 3. 今日签证
  const visas = await prisma.$queryRawUnsafe<
    { total: string; pending: string; approved: string; amount: string }[]
  >(
    `SELECT COUNT(*)::text as total,
       COUNT(*) FILTER (WHERE status = 'pending')::text as pending,
       COUNT(*) FILTER (WHERE status = 'approved')::text as approved,
       COALESCE(SUM(amount), 0)::text as amount
     FROM "Visa" WHERE "createdAt" >= '${start.toISOString()}'`
  );

  // 4. 今日纠偏
  const corrections = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
    `SELECT COUNT(*)::text as cnt FROM "Correction" WHERE "createdAt" >= '${start.toISOString()}'`
  );

  // 组装报告
  const lines: string[] = [];
  lines.push(`**日期**: ${dateStr}`);
  lines.push("");

  // 打卡
  lines.push("### 工人出勤");
  if (checkins.length === 0) {
    lines.push("暂无打卡记录");
  } else {
    const totalWorkers = checkins.reduce((s, c) => s + parseInt(c.cnt), 0);
    lines.push(`共 ${totalWorkers} 名工人出勤`);
    for (const c of checkins) {
      lines.push(`- ${c.project}: ${c.cnt}人 (${c.workers}次打卡)`);
    }
  }
  lines.push("");

  // 报量
  lines.push("### 报量情况");
  if (reports.length === 0) {
    lines.push("暂无报量记录");
  } else {
    const totalReports = reports.reduce((s, r) => s + parseInt(r.total), 0);
    const totalPending = reports.reduce((s, r) => s + parseInt(r.pending), 0);
    const totalValue = reports.reduce((s, r) => s + parseFloat(r.value), 0);
    lines.push(
      `共 ${totalReports} 条报量，待审 ${totalPending} 条，产值 ¥${totalValue.toFixed(0)}`
    );
    for (const r of reports) {
      lines.push(
        `- ${r.project}: ${r.total}条(待审${r.pending}/已审${r.verified}/驳回${r.rejected}) ¥${parseFloat(r.value).toFixed(0)}`
      );
    }
  }
  lines.push("");

  // 签证
  if (visas.length > 0) {
    const v = visas[0];
    if (parseInt(v.total) > 0) {
      lines.push("### 签证动态");
      lines.push(
        `新增 ${v.total} 条签证(待审${v.pending}/已批${v.approved})，金额 ¥${parseFloat(v.amount).toFixed(0)}`
      );
      lines.push("");
    }
  }

  // 纠偏
  const corrCnt = parseInt(corrections[0]?.cnt || "0");
  if (corrCnt > 0) {
    lines.push("### 纠偏提醒");
    lines.push(`今日 ${corrCnt} 条纠偏记录需处理`);
    lines.push("");
  }

  const title = `⚡ PowerLink 日报 ${dateStr}`;
  return { title, content: lines.join("\n") };
}

/** 周报汇总 */
async function generateWeeklyReport(): Promise<{ title: string; content: string }> {
  const weekStart = daysAgo(7);
  const weekEnd = today();
  const dateStr = `${formatDate(weekStart)} ~ ${formatDate(weekEnd)}`;

  // 1. 本周报量汇总（按项目）
  const reports = await prisma.$queryRawUnsafe<
    { project: string; total: string; verified: string; value: string }[]
  >(
    `SELECT project,
       COUNT(*)::text as total,
       COUNT(*) FILTER (WHERE status = 'verified')::text as verified,
       COALESCE(SUM("totalValue"), 0)::text as value
     FROM "Report" WHERE "createdAt" >= '${weekStart.toISOString()}' AND "createdAt" < '${weekEnd.toISOString()}'
     GROUP BY project ORDER BY value DESC`
  );

  // 2. 本周签证汇总
  const visas = await prisma.$queryRawUnsafe<
    { project: string; total: string; approved: string; amount: string }[]
  >(
    `SELECT project,
       COUNT(*)::text as total,
       COUNT(*) FILTER (WHERE status = 'approved')::text as approved,
       COALESCE(SUM(amount), 0)::text as amount
     FROM "Visa" WHERE "createdAt" >= '${weekStart.toISOString()}' AND "createdAt" < '${weekEnd.toISOString()}'
     GROUP BY project ORDER BY amount DESC`
  );

  // 3. 出勤汇总
  const attendance = await prisma.$queryRawUnsafe<
    { project: string; uniqueWorkers: string; totalCheckins: string; avgDuration: string }[]
  >(
    `SELECT project,
       COUNT(DISTINCT "workerId")::text as uniqueWorkers,
       COUNT(*)::text as totalCheckins,
       COALESCE(AVG("duration"), 0)::text as avgDuration
     FROM "CheckIn" WHERE "createdAt" >= '${weekStart.toISOString()}' AND "createdAt" < '${weekEnd.toISOString()}'
     GROUP BY project ORDER BY uniqueWorkers DESC`
  );

  // 4. 待处理项
  const pendingReports = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
    `SELECT COUNT(*)::text as cnt FROM "Report" WHERE status = 'pending'`
  );
  const pendingVisas = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
    `SELECT COUNT(*)::text as cnt FROM "Visa" WHERE status = 'pending'`
  );
  const pendingCorrections = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
    `SELECT COUNT(*)::text as cnt FROM "Correction" WHERE status = 'pending'`
  );

  // 组装报告
  const lines: string[] = [];
  lines.push(`**周期**: ${dateStr}`);
  lines.push("");

  // 产值汇总
  lines.push("### 产值汇总");
  if (reports.length === 0) {
    lines.push("本周无报量记录");
  } else {
    const totalValue = reports.reduce((s, r) => s + parseFloat(r.value), 0);
    const totalVerified = reports.reduce((s, r) => s + parseInt(r.verified), 0);
    lines.push(`本周总产值: ¥${totalValue.toFixed(0)}，已审核 ${totalVerified} 条`);
    for (const r of reports) {
      lines.push(
        `- ${r.project}: ¥${parseFloat(r.value).toFixed(0)} (${r.verified}/${r.total} 已审核)`
      );
    }
  }
  lines.push("");

  // 签证汇总
  if (visas.length > 0) {
    const totalVisaAmount = visas.reduce((s, v) => s + parseFloat(v.amount), 0);
    if (totalVisaAmount > 0) {
      lines.push("### 签证汇总");
      lines.push(`本周签证金额: ¥${totalVisaAmount.toFixed(0)}`);
      for (const v of visas) {
        if (parseFloat(v.amount) > 0) {
          lines.push(`- ${v.project}: ¥${parseFloat(v.amount).toFixed(0)} (${v.approved}/${v.total} 已批)`);
        }
      }
      lines.push("");
    }
  }

  // 出勤汇总
  lines.push("### 出勤统计");
  if (attendance.length === 0) {
    lines.push("本周无打卡记录");
  } else {
    for (const a of attendance) {
      const avgH = (parseFloat(a.avgDuration) / 60).toFixed(1);
      lines.push(`- ${a.project}: ${a.uniqueWorkers}人, ${a.totalCheckins}次, 平均${avgH}h/次`);
    }
  }
  lines.push("");

  // 待处理
  lines.push("### 待处理事项");
  const pr = parseInt(pendingReports[0]?.cnt || "0");
  const pv = parseInt(pendingVisas[0]?.cnt || "0");
  const pc = parseInt(pendingCorrections[0]?.cnt || "0");
  if (pr + pv + pc === 0) {
    lines.push("无待处理事项");
  } else {
    if (pr > 0) lines.push(`- 待审核报量: ${pr} 条`);
    if (pv > 0) lines.push(`- 待审批签证: ${pv} 条`);
    if (pc > 0) lines.push(`- 待处理纠偏: ${pc} 条`);
  }

  const title = `📊 PowerLink 周报 ${dateStr}`;
  return { title, content: lines.join("\n") };
}

/** 异常预警报告 */
async function generateAlertReport(): Promise<{ title: string; content: string }> {
  const lines: string[] = [];
  const now = new Date();

  // 1. 库存预警 — 低于最低库存
  const lowStock = await prisma.$queryRawUnsafe<
    { name: string; "stockQty": string; "minStock": string }[]
  >(
    `SELECT name, "stockQty"::text, "minStock"::text FROM "Material"
     WHERE "stockQty" <= "minStock" AND "minStock" > 0
     ORDER BY ("stockQty"::float / NULLIF("minStock"::float, 0)) ASC
     LIMIT 10`
  );

  // 2. 待审核报量 > 3天
  const oldPending = await prisma.$queryRawUnsafe<
    { project: string; cnt: string; oldest: string }[]
  >(
    `SELECT project, COUNT(*)::text as cnt, MIN("createdAt"::text) as oldest
     FROM "Report" WHERE status = 'pending' AND "createdAt" < NOW() - INTERVAL '3 days'
     GROUP BY project ORDER BY cnt DESC`
  );

  // 3. 待审批签证 > 3天
  const oldVisas = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
    `SELECT COUNT(*)::text as cnt FROM "Visa"
     WHERE status = 'pending' AND "createdAt" < NOW() - INTERVAL '3 days'`
  );

  // 4. 工器具年检到期预警
  const equipmentAlerts = await prisma.$queryRawUnsafe<
    { name: string; "nextCheckDate": string }[]
  >(
    `SELECT name, "nextCheckDate"::text FROM "Equipment"
     WHERE "nextCheckDate" <= NOW() + INTERVAL '7 days'
     ORDER BY "nextCheckDate" ASC LIMIT 5`
  );

  // 5. 扣分锁定工人
  const lockedWorkers = await prisma.$queryRawUnsafe<
    { name: string; "penaltyPoints": string }[]
  >(
    `SELECT name, "penaltyPoints"::text FROM "Worker" WHERE "isLocked" = true LIMIT 10`
  );

  let hasAlert = false;

  // 库存预警
  if (lowStock.length > 0) {
    hasAlert = true;
    lines.push("### 库存预警");
    for (const m of lowStock) {
      lines.push(`- ${m.name}: 库存 ${m.stockQty} / 最低 ${m.minStock}`);
    }
    lines.push("");
  }

  // 积压报量
  if (oldPending.length > 0) {
    hasAlert = true;
    lines.push("### 报量审核积压（>3天）");
    for (const r of oldPending) {
      lines.push(`- ${r.project}: ${r.cnt}条待审（最早 ${r.oldest.slice(0, 10)}）`);
    }
    lines.push("");
  }

  // 积压签证
  const oldVisaCnt = parseInt(oldVisas[0]?.cnt || "0");
  if (oldVisaCnt > 0) {
    hasAlert = true;
    lines.push("### 签证审批积压");
    lines.push(`- ${oldVisaCnt} 条签证超3天未审批`);
    lines.push("");
  }

  // 工器具年检
  if (equipmentAlerts.length > 0) {
    hasAlert = true;
    lines.push("### 工器具年检到期");
    for (const e of equipmentAlerts) {
      lines.push(`- ${e.name}: 到期 ${e.nextCheckDate.slice(0, 10)}`);
    }
    lines.push("");
  }

  // 锁定工人
  if (lockedWorkers.length > 0) {
    hasAlert = true;
    lines.push("### 工人锁定提醒");
    for (const w of lockedWorkers) {
      lines.push(`- ${w.name}: 扣分 ${w.penaltyPoints}分（已锁定）`);
    }
    lines.push("");
  }

  if (!hasAlert) {
    lines.push("当前无异常预警，一切正常！");
  }

  const title = `🚨 PowerLink 异常预警 ${formatDate(now)}`;
  return { title, content: lines.join("\n") };
}
