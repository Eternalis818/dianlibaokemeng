import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/safety-trainings — 获取所有培训内容 */
export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<
      { id: number; title: string; content: string; version: number; isActive: boolean; createdAt: string; updatedAt: string }[]
    >(`SELECT * FROM "SafetyTraining" ORDER BY "createdAt" DESC`);
    return Response.json(rows);
  } catch (e) {
    console.error("safety-trainings GET error:", e);
    return Response.json([]);
  }
}

/** POST /api/safety-trainings — 新增培训内容 */
export async function POST(req: NextRequest) {
  try {
    const { title, content } = await req.json();
    if (!title || !content) return Response.json({ error: "标题和内容必填" }, { status: 400 });
    const escapedTitle = title.replace(/'/g, "''");
    const escapedContent = content.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SafetyTraining" (title, content, version, "isActive", "createdAt", "updatedAt")
       VALUES ('${escapedTitle}', '${escapedContent}', 1, true, NOW(), NOW())`
    );
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("safety-trainings POST error:", e);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
