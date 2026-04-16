import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/materials/search?q=xxx&source=warehouse|agreement&category=xxx&libraryId=1&limit=30

Search strategies (applied in order):
1. Exact code match
2. Pinyin short prefix match (e.g. "dl" → 电力电缆)
3. Full pinyin match
4. Name LIKE fuzzy match
*/
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const source = searchParams.get("source"); // warehouse | agreement
    const category = searchParams.get("category");
    const libraryId = searchParams.get("libraryId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 100);

    // Build WHERE clauses
    const conditions: string[] = [];
    const condParams: any[] = [];
    let pIdx = 1;
    if (source) { conditions.push(`source = $${pIdx++}`); condParams.push(source); }
    if (category) { conditions.push(`category = $${pIdx++}`); condParams.push(category); }
    if (libraryId) { conditions.push(`"libraryId" = $${pIdx++}`); condParams.push(parseInt(libraryId)); }

    const baseWhere = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // No query → return categories summary
    if (!q) {
      const cats = await prisma.$queryRawUnsafe<{ category: string; cnt: bigint }[]>(
        `SELECT category, count(*) as cnt FROM "Material" ${baseWhere} GROUP BY category ORDER BY cnt DESC`,
        ...condParams
      );
      const total = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
        `SELECT count(*) as cnt FROM "Material" ${baseWhere}`,
        ...condParams
      );
      return Response.json({
        categories: cats.map((c) => ({ category: c.category, count: Number(c.cnt) })),
        total: Number(total[0]?.cnt ?? 0),
        items: [],
      });
    }

    // Build search WHERE
    const searchCond = conditions.length > 0 ? conditions.join(" AND ") + " AND " : "";
    const sqlParams: any[] = [...condParams];

    // 1. Exact code match
    sqlParams.push(q);
    const codeResults = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Material" WHERE ${searchCond} code = $${pIdx++} LIMIT ${limit}`,
      ...sqlParams
    );
    if (codeResults.length > 0) {
      return Response.json({ items: codeResults, strategy: "code_exact", total: codeResults.length });
    }

    // 2. Pinyin short prefix (e.g. "dl" → dianlan)
    sqlParams[sqlParams.length - 1] = `${q}%`;
    const pinResults = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Material" WHERE ${searchCond} "pinyinShort" LIKE $${pIdx} LIMIT ${limit}`,
      ...sqlParams
    );
    if (pinResults.length > 0) {
      return Response.json({ items: pinResults, strategy: "pinyin_short", total: pinResults.length });
    }

    // 3. Full pinyin contains
    sqlParams[sqlParams.length - 1] = `%${q}%`;
    const fpinResults = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Material" WHERE ${searchCond} pinyin LIKE $${pIdx} LIMIT ${limit}`,
      ...sqlParams
    );
    if (fpinResults.length > 0) {
      return Response.json({ items: fpinResults, strategy: "pinyin_full", total: fpinResults.length });
    }

    // 4. Code prefix match (e.g. "0S7" → all 金具铁件)
    sqlParams[sqlParams.length - 1] = `${q}%`;
    const cpfxResults = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Material" WHERE ${searchCond} code LIKE $${pIdx} LIMIT ${limit}`,
      ...sqlParams
    );
    if (cpfxResults.length > 0) {
      return Response.json({ items: cpfxResults, strategy: "code_prefix", total: cpfxResults.length });
    }

    // 5. Name fuzzy match
    sqlParams[sqlParams.length - 1] = `%${q}%`;
    const nameResults = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Material" WHERE ${searchCond} name LIKE $${pIdx} LIMIT ${limit}`,
      ...sqlParams
    );
    if (nameResults.length > 0) {
      return Response.json({ items: nameResults, strategy: "name_fuzzy", total: nameResults.length });
    }

    // 6. Category fuzzy match
    const catResults = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Material" WHERE ${searchCond} category LIKE $${pIdx} LIMIT ${limit}`,
      ...sqlParams
    );
    return Response.json({ items: catResults, strategy: "category_fuzzy", total: catResults.length });
  } catch (e) {
    console.error("material search error:", e);
    return Response.json({ items: [], strategy: "error", total: 0 });
  }
}
