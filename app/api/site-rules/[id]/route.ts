import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/site-rules/[id] — 编辑规则（版本号+1，触发工人重新确认） */
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
    }
    if (body.isActive !== undefined) {
      sets.push(`"isActive" = ${body.isActive}`);
    }
    // 编辑内容时版本号+1
    if (body.content !== undefined) {
      sets.push(`version = version + 1`);
    }
    sets.push(`"updatedAt" = NOW()`);

    if (sets.length === 0) return Response.json({ error: "无更新内容" }, { status: 400 });

    await prisma.$executeRawUnsafe(
      `UPDATE "SiteRule" SET ${sets.join(", ")} WHERE id = ${parseInt(id)}`
    );
    return Response.json({ ok: true });
  } catch (e) {
    console.error("site-rules PATCH error:", e);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE /api/site-rules/[id] — 删除规则 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "SiteRule" WHERE id = ${parseInt(id)}`);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("site-rules DELETE error:", e);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
