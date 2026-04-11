import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/boss/expenses — 记账列表 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const rows = await prisma.$queryRawUnsafe<
      { id: number; category: string; amount: number; note: string | null; projectCode: string | null; projectName: string | null; expenseDate: Date; createdAt: Date }[]
    >(
      `SELECT "id", "category", "amount", "note", "projectCode", "projectName", "expenseDate", "createdAt"
       FROM "ExpenseRecord" ORDER BY "expenseDate" DESC, "id" DESC LIMIT ${limit} OFFSET ${offset}`
    );

    const result = rows.map((r) => ({
      ...r,
      expenseDate: r.expenseDate.toISOString().slice(0, 10),
      createdAt: r.createdAt.toISOString(),
    }));

    return Response.json(result);
  } catch (e) {
    console.error("boss expenses GET error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}

/** POST /api/boss/expenses — 新增记账 */
export async function POST(req: NextRequest) {
  try {
    const { category, amount, note, projectCode, projectName, expenseDate } = await req.json();

    if (!category || !amount || amount <= 0 || !expenseDate) {
      return Response.json({ error: "分类、金额和日期必填" }, { status: 400 });
    }

    // 从 cookie 提取 bossId
    const token = req.cookies.get("pl_boss")?.value || "";
    const bossIdMatch = token.match(/^boss:(\d+):/);
    const bossId = bossIdMatch ? parseInt(bossIdMatch[1]) : 1;

    const escapedNote = (note || "").replace(/'/g, "''");

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ExpenseRecord" ("bossId", "category", "amount", "note", "projectCode", "projectName", "expenseDate", "updatedAt")
       VALUES (${bossId}, '${category}', ${amount}, '${escapedNote}', ${projectCode ? `'${projectCode}'` : "NULL"}, ${projectName ? `'${projectName.replace(/'/g, "''")}'` : "NULL"}, '${expenseDate}', NOW())`
    );

    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("boss expenses POST error:", e);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
