import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/notifications — 查询工人未读通知 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workerId = searchParams.get("workerId");
    if (!workerId) return Response.json({ error: "缺少 workerId" }, { status: 400 });

    const notifications = await prisma.dispatchNotification.findMany({
      where: { workerId, read: false },
      include: {
        dispatch: {
          select: { id: true, projectCode: true, location: true, content: true, startTime: true, endTime: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 返回未读数和通知列表
    return Response.json({
      unreadCount: notifications.length,
      notifications,
    });
  } catch (e) {
    console.error("notifications GET error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}
