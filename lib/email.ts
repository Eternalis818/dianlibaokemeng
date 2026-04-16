/**
 * 邮件发送模块 — 基于 Resend API
 *
 * 环境变量：
 * - RESEND_API_KEY: Resend API Key (re_xxxxx)
 * - SUPPORT_EMAIL: 客服接收邮箱（默认 support@powerlink.com）
 *
 * 使用：
 *   import { sendFeedbackNotification, sendAdoptionNotification } from "@/lib/email";
 */

const RESEND_API = "https://api.resend.com/emails";

type FeedbackType = "feature" | "bug" | "other";

const TYPE_LABELS: Record<FeedbackType, string> = {
  feature: "功能需求",
  bug: "Bug 报告",
  other: "其他反馈",
};

interface FeedbackNotificationParams {
  type: FeedbackType;
  subject: string;
  content: string;
  contactInfo?: string;
  ticketId: number;
}

/** 提交反馈时 → 通知客服邮箱 */
export async function sendFeedbackNotification(params: FeedbackNotificationParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.SUPPORT_EMAIL || "support@powerlink.com";
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not configured, skipping notification");
    return false;
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PowerLink OS <noreply@aixmboss.com>",
        to: [toEmail],
        subject: `[客服工单 #${params.ticketId}] ${TYPE_LABELS[params.type]}：${params.subject}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1e293b; border-radius: 12px; padding: 24px; color: #e2e8f0;">
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 16px;">
                🎫 新工单 #${params.ticketId}
              </div>
              <div style="background: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">类型</div>
                <div style="font-weight: 600;">${TYPE_LABELS[params.type]}</div>
              </div>
              <div style="background: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">标题</div>
                <div style="font-weight: 600;">${params.subject}</div>
              </div>
              <div style="background: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">详细描述</div>
                <div style="white-space: pre-wrap; line-height: 1.6;">${params.content}</div>
              </div>
              ${params.contactInfo ? `
              <div style="background: #0f172a; border-radius: 8px; padding: 16px;">
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">联系方式</div>
                <div>${params.contactInfo}</div>
              </div>
              ` : ""}
            </div>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[email] sendFeedbackNotification error:", e);
    return false;
  }
}

interface AdoptionNotificationParams {
  toEmail: string;
  ticketId: number;
  subject: string;
  rewardDays: number;
  adminReply: string;
}

/** 采纳反馈时 → 通知提交者 */
export async function sendAdoptionNotification(params: AdoptionNotificationParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not configured, skipping adoption notification");
    return false;
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PowerLink OS <noreply@aixmboss.com>",
        to: [params.toEmail],
        subject: `[采纳通知] 您的反馈已被采纳，获得 ${params.rewardDays} 天免费使用！`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1e293b; border-radius: 12px; padding: 24px; color: #e2e8f0;">
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 16px; color: #10b981;">
                🎉 您的反馈已被采纳！
              </div>
              <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="font-size: 24px; font-weight: bold; color: #10b981;">+${params.rewardDays} 天</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">免费使用时长已发放到您的账户</div>
              </div>
              <div style="background: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">反馈标题</div>
                <div style="font-weight: 600;">${params.subject}</div>
              </div>
              <div style="background: #0f172a; border-radius: 8px; padding: 16px;">
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">管理员回复</div>
                <div style="white-space: pre-wrap; line-height: 1.6;">${params.adminReply}</div>
              </div>
              <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #64748b;">
                工单 #${params.ticketId} · PowerLink OS 客服中心
              </div>
            </div>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[email] sendAdoptionNotification error:", e);
    return false;
  }
}
