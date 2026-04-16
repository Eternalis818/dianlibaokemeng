import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/collection-knowledge/[id] — 更新知识条目 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, content, tags, category, subCategory, sortBy } = body;

    const sets: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;
    if (title !== undefined) { sets.push(`title = $${paramIdx++}`); values.push(title); }
    if (content !== undefined) { sets.push(`content = $${paramIdx++}`); values.push(content); }
    if (category !== undefined) { sets.push(`category = $${paramIdx++}`); values.push(category); }
    if (subCategory !== undefined) { sets.push(`"subCategory" = $${paramIdx++}`); values.push(subCategory || null); }
    if (tags !== undefined) {
      const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;
      sets.push(`tags = $${paramIdx++}`); values.push(tagsJson);
    }
    if (sortBy !== undefined) { sets.push(`"sortBy" = $${paramIdx++}`); values.push(sortBy); }
    sets.push(`"updatedAt" = now()`);

    values.push(parseInt(id));
    await prisma.$executeRawUnsafe(`UPDATE "CollectionKnowledge" SET ${sets.join(", ")} WHERE "id" = $${paramIdx}`, ...values);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("knowledge update error:", e);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE /api/collection-knowledge/[id] — 删除知识条目（仅自定义） */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 只允许删除非内置条目
    await prisma.$executeRawUnsafe(`DELETE FROM "CollectionKnowledge" WHERE "id" = $1 AND "isBuiltIn" = false`, parseInt(id));
    return Response.json({ ok: true });
  } catch (e) {
    console.error("knowledge delete error:", e);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
