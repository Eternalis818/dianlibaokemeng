import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/collection-knowledge — 知识库列表 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let where = [];
    if (category) where.push(`category = '${category}'`);
    if (search) where.push(`(title ILIKE '%${search}%' OR content ILIKE '%${search}%')`);
    const whereClause = where.length > 0 ? "WHERE " + where.join(" AND ") : "";

    const articles = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, category, "subCategory", title, content, tags, "isEncrypted", "isBuiltIn", "sortBy",
        "createdAt", "updatedAt"
      FROM "CollectionKnowledge" ${whereClause}
      ORDER BY "sortBy" ASC, "createdAt" DESC
    `);

    // 解析 tags
    const result = articles.map((a: any) => {
      let tags: string[] = [];
      try { tags = a.tags ? JSON.parse(a.tags) : []; } catch {}
      return { ...a, tags };
    });

    return Response.json(result);
  } catch (e) {
    console.error("knowledge list error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}

/** POST /api/collection-knowledge — 新增知识条目 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, subCategory, title, content, tags, isEncrypted } = body;

    if (!title || !content || !category) {
      return Response.json({ error: "请填写完整" }, { status: 400 });
    }

    const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;

    const result = await prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO "CollectionKnowledge" (category, "subCategory", title, content, tags, "isEncrypted", "isBuiltIn")
      VALUES ('${category}', ${subCategory ? `'${subCategory.replace(/'/g, "''")}'` : "NULL"},
        '${title.replace(/'/g, "''")}', '${content.replace(/'/g, "''")}',
        ${tagsJson ? `'${tagsJson.replace(/'/g, "''")}'` : "NULL"},
        ${isEncrypted ? "true" : "false"}, false)
      RETURNING *
    `);

    return Response.json({ ok: true, article: result[0] });
  } catch (e) {
    console.error("knowledge create error:", e);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
