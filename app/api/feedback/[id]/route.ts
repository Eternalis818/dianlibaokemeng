import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdoptionNotification } from "@/lib/email";

/** PATCH /api/feedback/[id] — 审核反馈（采纳/关闭） */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, rewardDays, adminReply, contactEmail } = body;

    if (!status || !["adopted", "closed"].includes(status)) {
      return Response.json({ error: "无效状态" }, { status: 400 });
    }

    const rewardDaysValue = status === "adopted" && rewardDays ? rewardDays : null;

    await prisma.$executeRawUnsafe(
      `UPDATE "FeedbackTicket" SET "status" = $1, "rewardDays" = $2, "adminReply" = $3, "updatedAt" = now() WHERE "id" = $4`,
      status, rewardDaysValue, adminReply || null, parseInt(id)
    );

    // 采纳时发送邮件通知 + 延长订阅
    if (status === "adopted" && rewardDays > 0 && contactEmail) {
      const ticketRes = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "FeedbackTicket" WHERE "id" = $1`,
        parseInt(id)
      );
      const ticket = ticketRes[0];

      sendAdoptionNotification({
        toEmail: contactEmail,
        ticketId: parseInt(id),
        subject: ticket?.subject || "",
        rewardDays,
        adminReply: adminReply || "",
      }).catch(() => {});

      // 如果是 boss 提交的，自动延长订阅
      if (ticket?.bossId) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "Subscription" SET "currentPeriodEnd" = "currentPeriodEnd" + interval '1 day' * $1 WHERE "bossId" = $2`,
            rewardDays, ticket.bossId
          );
        } catch {
          // 可能没有订阅记录
        }
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("feedback update error:", e);
    return Response.json({ error: "操作失败" }, { status: 500 });
  }
}
