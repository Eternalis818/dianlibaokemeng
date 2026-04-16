import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/dispatches/[id] — 派工单详情 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: parseInt(id) },
      include: {
        workers: {
          include: { worker: { select: { id: true, name: true, phone: true, project: true } } },
        },
        notifications: true,
      },
    });
    if (!dispatch) return Response.json({ error: "派工单不存在" }, { status: 404 });
    return Response.json(dispatch);
  } catch (e) {
    console.error("dispatch/[id] GET error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}

/** PATCH /api/dispatches/[id] — 更新派工单 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const numId = parseInt(id);

    // 检查现有状态
    const existing = await prisma.dispatch.findUnique({ where: { id: numId } });
    if (!existing) return Response.json({ error: "派工单不存在" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (body.projectCode !== undefined) updateData.projectCode = body.projectCode || null;
    if (body.location !== undefined) updateData.location = body.location?.trim() || null;
    if (body.content !== undefined) {
      if (!body.content?.trim()) return Response.json({ error: "派工内容不能为空" }, { status: 400 });
      updateData.content = body.content.trim();
    }
    if (body.startTime !== undefined) updateData.startTime = body.startTime ? new Date(body.startTime) : null;
    if (body.endTime !== undefined) updateData.endTime = body.endTime ? new Date(body.endTime) : null;
    if (body.photoPath !== undefined) updateData.photoPath = body.photoPath || null;
    if (body.status !== undefined) updateData.status = body.status;

    // 更新工人列表：先删后增
    if (body.workers) {
      await prisma.dispatchWorker.deleteMany({ where: { dispatchId: numId } });
      if (body.workers.length > 0) {
        updateData.workers = {
          create: body.workers.map((w: { workerId: string; role?: string }) => ({
            workerId: w.workerId,
            role: w.role || null,
          })),
        };
      }
    }

    const dispatch = await prisma.dispatch.update({
      where: { id: numId },
      data: updateData,
      include: {
        workers: {
          include: { worker: { select: { id: true, name: true, phone: true } } },
        },
      },
    });

    // 状态变为 sent 时创建站内通知
    if (body.status === "sent" && existing.status !== "sent") {
      const workerList = body.workers || dispatch.workers;
      if (workerList?.length) {
        await prisma.dispatchNotification.createMany({
          data: workerList.map((w: { workerId: string }) => ({
            workerId: w.workerId,
            dispatchId: numId,
            type: "dispatch",
          })),
          skipDuplicates: true,
        });
        // TODO: SMS notification — 需要短信服务商配置后启用
      }
    }

    return Response.json(dispatch);
  } catch (e) {
    console.error("dispatch/[id] PATCH error:", e);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE /api/dispatches/[id] — 删除派工单（仅草稿） */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id);

    const existing = await prisma.dispatch.findUnique({ where: { id: numId } });
    if (!existing) return Response.json({ error: "派工单不存在" }, { status: 404 });
    if (existing.status !== "draft") return Response.json({ error: "仅草稿状态可删除" }, { status: 400 });

    await prisma.dispatch.delete({ where: { id: numId } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("dispatch/[id] DELETE error:", e);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
