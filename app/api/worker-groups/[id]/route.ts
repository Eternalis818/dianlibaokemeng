import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/worker-groups/[id] — 更新班组（名称/描述/成员） */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const numId = parseInt(id);

    // 更新基本信息
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;

    // 更新成员：先删后增
    if (body.members) {
      await prisma.workerGroupMember.deleteMany({ where: { groupId: numId } });
      if (body.members.length > 0) {
        updateData.members = {
          create: body.members.map((m: { workerId: string; role?: string }) => ({
            workerId: m.workerId,
            role: m.role || null,
          })),
        };
      }
    }

    const group = await prisma.workerGroup.update({
      where: { id: numId },
      data: updateData,
      include: {
        members: {
          include: { worker: { select: { id: true, name: true, phone: true } } },
        },
      },
    });

    return Response.json(group);
  } catch (e) {
    console.error("worker-groups PATCH error:", e);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE /api/worker-groups/[id] — 删除班组 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.workerGroup.delete({ where: { id: parseInt(id) } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("worker-groups DELETE error:", e);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
