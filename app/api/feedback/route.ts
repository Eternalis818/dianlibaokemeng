import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendFeedbackNotification } from "@/lib/email";

/** GET /api/feedback — 反馈列表（支持状态筛选） */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = status ? { status } : {};
    const tickets = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "FeedbackTicket" ${status ? `WHERE "status" = $1` : ""} ORDER BY "createdAt" DESC LIMIT 100`,
      ...(status ? [status] : [])
    );

    // 解析 screenshots JSON
    const result = tickets.map((t: any) => {
      let screenshots: string[] = [];
      try {
        screenshots = t.screenshots ? JSON.parse(t.screenshots) : [];
      } catch {}
      return { ...t, screenshots };
    });

    return Response.json(result);
  } catch (e) {
    console.error("feedback list error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}

/** POST /api/feedback — 提交反馈 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, subject, content, screenshots, source, bossId, contactInfo } = body;

    if (!type || !subject || !content) {
      return Response.json({ error: "请填写完整信息" }, { status: 400 });
    }

    const screenshotsJson = screenshots && screenshots.length > 0 ? JSON.stringify(screenshots) : null;

    // 插入数据库
    const result = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "FeedbackTicket" (type, subject, content, screenshots, source, "bossId", "contactInfo")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      type, subject, content, screenshotsJson, source || "admin", bossId || null, contactInfo || null
    );

    const ticket = result[0];

    // 异步发送邮件通知（不阻塞响应）
    sendFeedbackNotification({
      type,
      subject,
      content,
      contactInfo,
      ticketId: ticket.id,
    }).catch(() => {});

    return Response.json({ ok: true, ticket });
  } catch (e) {
    console.error("feedback create error:", e);
    return Response.json({ error: "提交失败" }, { status: 500 });
  }
}
