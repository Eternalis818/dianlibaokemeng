import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/notifications/[id] — 标记通知已读 */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notification = await prisma.dispatchNotification.update({
      where: { id: parseInt(id) },
      data: { read: true },
    });
    return Response.json(notification);
  } catch (e) {
    console.error("notifications/[id] PATCH error:", e);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}
