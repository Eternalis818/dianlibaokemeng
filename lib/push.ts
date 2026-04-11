/**
 * 定时推送服务
 * 支持 Server酱 / 企业微信群机器人 Webhook 两种推送渠道
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type PushPlatform = "serverchan" | "wechat";

export interface PushConfig {
  platform: PushPlatform;
  webhookUrl: string;
  enabled: boolean;
  dailyTime: string;   // HH:mm — 日报推送时间
  weeklyDay: number;   // 0-6, 周报推送日（0=周日）
  reportTypes: ("daily" | "weekly" | "alert")[];
}

/** 从 DB Settings 读取推送配置 */
export async function getPushConfig(): Promise<PushConfig> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.$queryRawUnsafe<{ key: string; value: string }[]>(
      `SELECT "key", "value" FROM "Settings" WHERE "key" LIKE 'push_%'`
    );
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      platform: (m.push_platform as PushPlatform) || "serverchan",
      webhookUrl: m.push_webhook_url || "",
      enabled: m.push_enabled === "on",
      dailyTime: m.push_daily_time || "18:00",
      weeklyDay: parseInt(m.push_weekly_day || "5", 10),
      reportTypes: m.push_report_types
        ? JSON.parse(m.push_report_types)
        : ["daily", "weekly"],
    };
  } catch {
    return {
      platform: "serverchan",
      webhookUrl: "",
      enabled: false,
      dailyTime: "18:00",
      weeklyDay: 5,
      reportTypes: ["daily", "weekly"],
    };
  }
}

// ─── Push Implementations ────────────────────────────────────────────────

interface PushResult {
  ok: boolean;
  message: string;
}

/** Server酱推送 */
async function pushServerChan(
  title: string,
  content: string,
  webhookUrl: string
): Promise<PushResult> {
  try {
    // Server酱 URL格式: https://sct.ftqq.com/{key}.send
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        desp: content,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, message: `Server酱返回 ${res.status}: ${err.slice(0, 200)}` };
    }

    const data = await res.json();
    if (data.code === 0 || data.code === 200) {
      return { ok: true, message: "Server酱推送成功" };
    }
    return { ok: false, message: `Server酱错误: ${data.message || JSON.stringify(data)}` };
  } catch (e) {
    return { ok: false, message: `Server酱网络错误: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

/** 企业微信群机器人 Webhook 推送 */
async function pushWeChatBot(
  title: string,
  content: string,
  webhookUrl: string
): Promise<PushResult> {
  try {
    // 企业微信 Webhook URL格式: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key={key}
    // 使用 markdown 格式
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msgtype: "markdown",
        markdown: {
          content: `## ${title}\n\n${content}`,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, message: `企业微信返回 ${res.status}: ${err.slice(0, 200)}` };
    }

    const data = await res.json();
    if (data.errcode === 0) {
      return { ok: true, message: "企业微信推送成功" };
    }
    return { ok: false, message: `企业微信错误(${data.errcode}): ${data.errmsg}` };
  } catch (e) {
    return { ok: false, message: `企业微信网络错误: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

// ─── Public API ──────────────────────────────────────────────────────────

/** 推送报告到配置的渠道 */
export async function pushReport(
  title: string,
  content: string,
  config?: PushConfig
): Promise<PushResult> {
  const cfg = config || (await getPushConfig());

  if (!cfg.enabled) {
    return { ok: false, message: "推送功能未启用" };
  }
  if (!cfg.webhookUrl) {
    return { ok: false, message: "Webhook URL 未配置" };
  }

  switch (cfg.platform) {
    case "serverchan":
      return pushServerChan(title, content, cfg.webhookUrl);
    case "wechat":
      return pushWeChatBot(title, content, cfg.webhookUrl);
    default:
      return { ok: false, message: `不支持的推送平台: ${cfg.platform}` };
  }
}

/** 测试推送连接 */
export async function testPushConnection(config?: PushConfig): Promise<PushResult> {
  const title = "PowerLink 推送测试";
  const content = "这是一条测试消息，确认推送通道配置正确。";
  return pushReport(title, content, config);
}
