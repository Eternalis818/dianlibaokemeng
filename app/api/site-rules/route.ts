import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/site-rules — 获取所有进场须知规则 */
export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<
      { id: number; title: string; content: string; version: number; isActive: boolean; createdAt: string; updatedAt: string }[]
    >(`SELECT * FROM "SiteRule" ORDER BY "createdAt" DESC`);
    return Response.json(rows);
  } catch (e) {
    console.error("site-rules GET error:", e);
    return Response.json([]);
  }
}

/** POST /api/site-rules — 新增规则 */
export async function POST(req: NextRequest) {
  try {
    const { title, content } = await req.json();
    if (!title || !content) return Response.json({ error: "标题和内容必填" }, { status: 400 });
    const escapedTitle = title.replace(/'/g, "''");
    const escapedContent = content.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SiteRule" (title, content, version, "isActive", "createdAt", "updatedAt")
       VALUES ('${escapedTitle}', '${escapedContent}', 1, true, NOW(), NOW())`
    );
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("site-rules POST error:", e);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
