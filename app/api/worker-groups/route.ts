import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/worker-groups — 列出所有班组（含成员） */
export async function GET() {
  try {
    const groups = await prisma.workerGroup.findMany({
      include: {
        members: {
          include: { worker: { select: { id: true, name: true, phone: true, project: true } } },
          orderBy: { addedAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(groups);
  } catch (e) {
    console.error("worker-groups GET error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}

/** POST /api/worker-groups — 创建班组 */
export async function POST(req: NextRequest) {
  try {
    const { name, description, memberIds } = await req.json();
    if (!name?.trim()) return Response.json({ error: "班组名称不能为空" }, { status: 400 });

    // 检查重名
    const existing = await prisma.workerGroup.findUnique({ where: { name: name.trim() } });
    if (existing) return Response.json({ error: "班组名称已存在" }, { status: 409 });

    const group = await prisma.workerGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        members: memberIds?.length
          ? {
              create: memberIds.map((m: { workerId: string; role?: string }) => ({
                workerId: m.workerId,
                role: m.role || null,
              })),
            }
          : undefined,
      },
      include: {
        members: {
          include: { worker: { select: { id: true, name: true, phone: true } } },
        },
      },
    });

    return Response.json(group, { status: 201 });
  } catch (e) {
    console.error("worker-groups POST error:", e);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
