import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/debtors — 债主列表 */
export async function GET() {
  try {
    const debtors = await prisma.$queryRawUnsafe<any[]>(`
      SELECT d.*,
        COALESCE(json_agg(json_build_object(
          'id', dc.id, 'name', dc.name, 'role', dc.role, 'phone', dc.phone,
          'wechat', dc.wechat, 'relationshipLevel', dc."relationshipLevel",
          'isDecisionMaker', dc."isDecisionMaker", 'isFinance', dc."isFinance", 'notes', dc.notes
        )) FILTER (WHERE dc.id IS NOT NULL), '[]') as contacts
      FROM "Debtor" d
      LEFT JOIN "DebtorContact" dc ON dc."debtorId" = d.id
      GROUP BY d.id
      ORDER BY d."createdAt" DESC
    `);
    // parse tags
    const result = debtors.map((d: any) => {
      let tags: string[] = [];
      try { tags = d.tags ? JSON.parse(d.tags) : []; } catch {}
      return { ...d, tags };
    });
    return Response.json(result);
  } catch (e) {
    console.error("debtors list error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}

/** POST /api/debtors — 创建债主 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, creditCode, address, tags, notes } = body;
    if (!name || !type) return Response.json({ error: "请填写名称和类型" }, { status: 400 });

    const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;

    const result = await prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO "Debtor" (name, type, "creditCode", address, tags, notes)
      VALUES ('${name.replace(/'/g, "''")}', '${type}',
        ${creditCode ? `'${creditCode.replace(/'/g, "''")}'` : "NULL"},
        ${address ? `'${address.replace(/'/g, "''")}'` : "NULL"},
        ${tagsJson ? `'${tagsJson.replace(/'/g, "''")}'` : "NULL"},
        ${notes ? `'${notes.replace(/'/g, "''")}'` : "NULL"})
      RETURNING *
    `);

    return Response.json({ ok: true, debtor: result[0] });
  } catch (e: any) {
    if (e.message?.includes("unique")) return Response.json({ error: "债主名称已存在" }, { status: 400 });
    console.error("debtor create error:", e);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
