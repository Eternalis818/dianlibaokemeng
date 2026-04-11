import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/penalty-categories */
export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: number; name: string; points: number; description: string | null; isActive: boolean }[]>(
      `SELECT * FROM "PenaltyCategory" ORDER BY points ASC`
    );
    return Response.json(rows);
  } catch (e) {
    console.error("penalty-categories GET error:", e);
    return Response.json([]);
  }
}

/** POST /api/penalty-categories */
export async function POST(req: NextRequest) {
  try {
    const { name, points, description } = await req.json();
    if (!name || !points) return Response.json({ error: "名称和分值必填" }, { status: 400 });
    const escapedName = name.replace(/'/g, "''");
    const escapedDesc = (description || "").replace(/'/g, "''");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PenaltyCategory" (name, points, description, "isActive", "createdAt") VALUES ('${escapedName}', ${points}, '${escapedDesc}', true, NOW())`
    );
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("penalty-categories POST error:", e);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
