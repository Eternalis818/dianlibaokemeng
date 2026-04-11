import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/safety-trainings/[id] — 编辑培训内容（版本号+1） */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const sets: string[] = [];

    if (body.title !== undefined) {
      sets.push(`title = '${body.title.replace(/'/g, "''")}'`);
    }
    if (body.content !== undefined) {
      sets.push(`content = '${body.content.replace(/'/g, "''")}'`);
      sets.push(`version = version + 1`);
    }
    if (body.isActive !== undefined) {
      sets.push(`"isActive" = ${body.isActive}`);
    }
    sets.push(`"updatedAt" = NOW()`);

    if (sets.length === 0) return Response.json({ error: "无更新内容" }, { status: 400 });

    await prisma.$executeRawUnsafe(
      `UPDATE "SafetyTraining" SET ${sets.join(", ")} WHERE id = ${parseInt(id)}`
    );
    return Response.json({ ok: true });
  } catch (e) {
    console.error("safety-trainings PATCH error:", e);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE /api/safety-trainings/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "SafetyTraining" WHERE id = ${parseInt(id)}`);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("safety-trainings DELETE error:", e);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
