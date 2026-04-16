import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/project-expenses?projectId=1 — 获取项目的杂费记录列表 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId 必填" }, { status: 400 });
    }
    const expenses = await prisma.projectExpense.findMany({
      where: { projectId: Number(projectId) },
      orderBy: { expenseDate: "desc" },
    });
    return NextResponse.json(expenses);
  } catch {
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

/** POST /api/project-expenses — 新增杂费记录 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, type, amount, expenseDate, handler, note, photoUrls } = body;
    if (!projectId || !type || !amount) {
      return NextResponse.json({ error: "projectId、费用类型和金额必填" }, { status: 400 });
    }
    const expense = await prisma.projectExpense.create({
      data: {
        projectId: Number(projectId),
        type,
        amount: Number(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        handler: handler ?? null,
        note: note ?? null,
        photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

/** PATCH /api/project-expenses — 更新杂费记录 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "id 必填" }, { status: 400 });

    const updateData: Record<string, unknown> = { ...data };
    if (data.expenseDate !== undefined) updateData.expenseDate = data.expenseDate ? new Date(data.expenseDate) : new Date();
    if (data.amount !== undefined) updateData.amount = Number(data.amount);

    const expense = await prisma.projectExpense.update({
      where: { id: Number(id) },
      data: updateData,
    });
    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE /api/project-expenses?id=1 — 删除杂费记录 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 必填" }, { status: 400 });
    await prisma.projectExpense.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
