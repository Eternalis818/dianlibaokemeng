import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/dispatches/worker — 查询工人关联的派工单 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workerId = searchParams.get("workerId");
    if (!workerId) return Response.json({ error: "缺少 workerId" }, { status: 400 });

    const dispatches = await prisma.dispatchWorker.findMany({
      where: { workerId },
      include: {
        dispatch: {
          include: {
            workers: {
              include: { worker: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { dispatch: { createdAt: "desc" } },
    });

    // 获取该工人的通知状态
    const notifications = await prisma.dispatchNotification.findMany({
      where: { workerId },
      select: { dispatchId: true, read: true },
    });
    const notifMap = new Map(notifications.map((n) => [n.dispatchId, n.read]));

    const result = dispatches.map((dw) => ({
      ...dw.dispatch,
      myRole: dw.role,
      read: notifMap.get(dw.dispatchId) ?? true,
    }));

    return Response.json(result);
  } catch (e) {
    console.error("dispatches/worker GET error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}
