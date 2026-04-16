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
    if (title !== undefined) sets.push(`title = '${title.replace(/'/g, "''")}'`);
    if (content !== undefined) sets.push(`content = '${content.replace(/'/g, "''")}'`);
    if (category !== undefined) sets.push(`category = '${category}'`);
    if (subCategory !== undefined) sets.push(subCategory ? `"subCategory" = '${subCategory.replace(/'/g, "''")}'` : `"subCategory" = NULL`);
    if (tags !== undefined) {
      const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;
      sets.push(tagsJson ? `tags = '${tagsJson.replace(/'/g, "''")}'` : "tags = NULL");
    }
    if (sortBy !== undefined) sets.push(`"sortBy" = ${sortBy}`);
    sets.push(`"updatedAt" = now()`);

    await prisma.$executeRawUnsafe(`UPDATE "CollectionKnowledge" SET ${sets.join(", ")} WHERE "id" = ${id}`);
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
    await prisma.$executeRawUnsafe(`DELETE FROM "CollectionKnowledge" WHERE "id" = ${id} AND "isBuiltIn" = false`);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("knowledge delete error:", e);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
